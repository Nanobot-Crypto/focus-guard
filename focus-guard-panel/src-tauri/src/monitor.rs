use futures_util::StreamExt;
use std::collections::HashMap;
use zbus::{connection, Connection, MessageStream};
use zbus::zvariant::Value;
use chrono::Utc;
use uuid::Uuid;
use rand::Rng;
use std::sync::Arc;
use tauri::Manager;
use crate::models::DetectionEvent;
use crate::store::AppState;

pub async fn run_monitor(state: AppState, app_handle: tauri::AppHandle) {
    loop {
        if !*state.monitoring.read().await {
            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
            continue;
        }
        match monitor_via_atspi(&state, &app_handle).await {
            Ok(_) => {}
            Err(e) => {
                eprintln!("[monitor] AT-SPI error: {}. Retrying in 5s", e);
                tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
            }
        }
    }
}

async fn monitor_via_atspi(
    state: &AppState,
    app_handle: &tauri::AppHandle,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let session = Connection::session().await?;
    let address: String = session
        .call_method(Some("org.a11y.Bus"), "/org/a11y/bus", Some("org.a11y.Bus"), "GetAddress", &())
        .await?.body().deserialize()?;

    let atspi = connection::Builder::address(address.as_str())?.build().await?;

    let _: () = atspi
        .call_method(Some("org.freedesktop.DBus"), "/org/freedesktop/DBus", Some("org.freedesktop.DBus"), "AddMatch",
            &"type='signal',interface='org.a11y.atspi.Event.Window',member='Activate'")
        .await?
        .body().deserialize()?;

    let _: () = atspi
        .call_method(Some("org.freedesktop.DBus"), "/org/freedesktop/DBus", Some("org.freedesktop.DBus"), "AddMatch",
            &"type='signal',interface='org.a11y.atspi.Event.Document',member='LoadComplete'")
        .await?.body().deserialize()?;


    let _ = atspi.call_method(Some("org.a11y.atspi.Registry"), "/org/a11y/atspi/registry",
        Some("org.a11y.atspi.Registry"), "RegisterEvent", &"Window:Activate").await;


    eprintln!("[monitor] AT-SPI listening...");

    // Polling cada 2s para detectar cambios de pestaña sin cambio de ventana
    let state_poll = state.clone();
    let handle_poll = app_handle.clone();
    tokio::spawn(async move {
        let mut last_title = String::new();
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            if !*state_poll.monitoring.read().await { continue; }
            if let Some(title) = get_focused_window_title_from_proc() {
                if title != last_title && !title.is_empty() {
                    last_title = title.clone();
                    check_and_record(&state_poll, &title, &handle_poll).await;
                }
            }
        }
    });

    let mut stream = MessageStream::from(&atspi);

    while let Some(result) = stream.next().await {
        let msg = match result { Ok(m) => m, Err(_) => continue };
        if !*state.monitoring.read().await { break; }

        let header = msg.header();
        let iface = header.interface().map(|i| i.as_str().to_string()).unwrap_or_default();
        let member = header.member().map(|m| m.as_str().to_string()).unwrap_or_default();

        let is_relevant =
            (iface == "org.a11y.atspi.Event.Window" && member == "Activate") ||
            (iface == "org.a11y.atspi.Event.Document" && member == "LoadComplete");

        if !is_relevant { continue; }

        if let Some(title) = extract_title(&msg) {
            if !title.is_empty() {
                check_and_record(state, &title, app_handle).await;
            }
        }
    }
    Ok(())
}

fn extract_title(msg: &zbus::Message) -> Option<String> {
    type Body = (String, i32, i32, zbus::zvariant::OwnedValue, HashMap<String, zbus::zvariant::OwnedValue>);
    match msg.body().deserialize::<Body>() {
        Ok(body) => {
            let val: Value = body.3.into();
            if let Value::Str(s) = val {
                let t = s.to_string();
                if !t.is_empty() { return Some(t); }
            }
            if !body.0.is_empty() { return Some(body.0); }
        }
        Err(_) => {
            if let Ok((s,)) = msg.body().deserialize::<(String,)>() {
                if !s.is_empty() { return Some(s); }
            }
        }
    }
    None
}

async fn check_and_record(state: &AppState, title: &str, app_handle: &tauri::AppHandle) {
    let title_lower = title.to_lowercase();

    {
        let whitelist = state.whitelist.read().await;
        for app in &whitelist.apps {
            if title_lower.contains(&app.to_lowercase()) { return; }
        }
    }

    let categories = state.categories.read().await;
    for cat in categories.iter().filter(|c| c.enabled) {
        for kw in &cat.keywords {
            if title_lower.contains(&kw.to_lowercase()) {
                let event = DetectionEvent {
                    id: Uuid::new_v4().to_string(),
                    time: Utc::now(),
                    category: cat.name.clone(),
                    title: title.to_string(),
                };
                drop(categories);
                {
                    let mut events = state.events.write().await;
                    let is_recent_dup = events.first().map(|e| {
                        e.title == title && (Utc::now() - e.time).num_seconds() < 30
                    }).unwrap_or(false);
                    if !is_recent_dup {
                        events.insert(0, event);
                        if events.len() > 500 { events.truncate(500); }
                        drop(events);
                        state.save().await;
                    } else {
                        return;
                    }
                }
                show_overlay(state, app_handle).await;
                return;
            }
        }
    }
}

pub async fn show_warning_overlay(state: &AppState, app_handle: &tauri::AppHandle, message: String) {
    if *state.overlay_active.read().await {
        return;
    }
    *state.current_phrase.write().await = message;
    *state.overlay_active.write().await = true;
    *state.wm_lock_state.write().await = Some(crate::wm_lock::disable_wm_shortcuts());

    create_overlay_window(app_handle, Some(state.overlay_active.clone()));

    let handle_clone = app_handle.clone();
    let phrase_lock = state.current_phrase.clone();
    let active_lock = state.overlay_active.clone();
    let end_lock = state.last_overlay_end.clone();
    let wm_state_lock = state.wm_lock_state.clone();
    tokio::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_secs(15)).await;
        *active_lock.write().await = false;
        *phrase_lock.write().await = String::new();
        if let Some(w) = handle_clone.get_webview_window("overlay") {
            let _ = w.close();
        }
        *end_lock.write().await = Some(std::time::Instant::now());
        if let Some(saved) = wm_state_lock.write().await.take() {
            crate::wm_lock::restore_wm_shortcuts(&saved);
        }
    });
}

pub async fn show_break_reminder(state: &AppState, app_handle: &tauri::AppHandle) {
    if *state.overlay_active.read().await {
        return;
    }
    let break_phrases = [
        "Llevas 30 minutos seguidos. Levántate, estira el cuerpo y mira algo lejano un momento.",
        "Tu concentración mejora con pausas reales. Respira hondo y deja descansar la vista.",
        "30 minutos de foco merecen 30 segundos de pausa. El cuerpo también necesita atención.",
        "Una pausa breve ahora te devuelve más energía para lo que sigue. Aprovéchala.",
        "Descansar no es perder tiempo, es proteger tu capacidad de concentrarte después.",
    ];
    let idx = rand::thread_rng().gen_range(0..break_phrases.len());
    *state.current_phrase.write().await = break_phrases[idx].to_string();
    *state.overlay_active.write().await = true;
    *state.wm_lock_state.write().await = Some(crate::wm_lock::disable_wm_shortcuts());

    create_overlay_window(app_handle, Some(state.overlay_active.clone()));

    let handle_clone = app_handle.clone();
    let phrase_lock = state.current_phrase.clone();
    let active_lock = state.overlay_active.clone();
    let end_lock = state.last_overlay_end.clone();
    let wm_state_lock = state.wm_lock_state.clone();
    tokio::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_secs(30)).await;
        *active_lock.write().await = false;
        *phrase_lock.write().await = String::new();
        if let Some(w) = handle_clone.get_webview_window("overlay") {
            let _ = w.close();
        }
        *end_lock.write().await = Some(std::time::Instant::now());
        if let Some(saved) = wm_state_lock.write().await.take() {
            crate::wm_lock::restore_wm_shortcuts(&saved);
        }
        eprintln!("[break] Recordatorio de pausa cerrado");
    });
}

pub async fn trigger_overlay_from_detection(state: &AppState, app_handle: &tauri::AppHandle) {
    show_overlay(state, app_handle).await;
}

async fn show_overlay(state: &AppState, app_handle: &tauri::AppHandle) {
    // Si ya hay overlay activo, no lanzar otro
    if *state.overlay_active.read().await {
        return;
    }
    // Cooldown de 10s tras el último overlay
    if let Some(t) = *state.last_overlay_end.read().await {
        if t.elapsed().as_secs() < 10 {
            eprintln!("[overlay] Cooldown activo, ignorando detección");
            return;
        }
    }

    let phrases = state.phrases.read().await;
    let phrase = if phrases.is_empty() {
        "Tómate un momento antes de continuar.".to_string()
    } else {
        let idx = rand::thread_rng().gen_range(0..phrases.len());
        phrases[idx].clone()
    };
    drop(phrases);

    let duration = state.config.read().await.block_duration;
    *state.current_phrase.write().await = phrase;
    *state.overlay_active.write().await = true;
    *state.wm_lock_state.write().await = Some(crate::wm_lock::disable_wm_shortcuts());

    create_overlay_window(app_handle, Some(state.overlay_active.clone()));

    // Timer para desactivar
    let handle_clone = app_handle.clone();
    let phrase_lock = state.current_phrase.clone();
    let active_lock = state.overlay_active.clone();
    let end_lock = state.last_overlay_end.clone();
    let wm_state_lock = state.wm_lock_state.clone();
    tokio::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_secs(duration)).await;
        *active_lock.write().await = false;
        *phrase_lock.write().await = String::new();
        if let Some(w) = handle_clone.get_webview_window("overlay") {
            let _ = w.close();
        }
        eprintln!("[overlay] Closed after timeout");
        *end_lock.write().await = Some(std::time::Instant::now());
        if let Some(saved) = wm_state_lock.write().await.take() {
            crate::wm_lock::restore_wm_shortcuts(&saved);
        }
    });
}

pub fn recreate_overlay(app_handle: &tauri::AppHandle) { create_overlay_window(app_handle, None); }

pub fn create_overlay_window(app_handle: &tauri::AppHandle, active_flag: Option<Arc<tokio::sync::RwLock<bool>>>) {
    // Cerrar si ya existe
    if let Some(w) = app_handle.get_webview_window("overlay") {
        let _ = w.close();
    }

    match tauri::WebviewWindowBuilder::new(
        app_handle,
        "overlay",
        tauri::WebviewUrl::App("overlay.html".into()),
    )
    .fullscreen(true)
    .always_on_top(true)
    .decorations(false)
    .build()
    {
        Ok(win) => {
            // Prevenir cierre manual
            let app = app_handle.clone();
            let app2 = app.clone();
            let flag = active_flag.clone();
            win.on_window_event(move |event| {
                match event {
                    tauri::WindowEvent::CloseRequested { api, .. } => {
                        // Solo prevenir cierre si el overlay sigue activo
                        let should_prevent = flag.as_ref().map(|f| {
                            futures::executor::block_on(async { *f.read().await })
                        }).unwrap_or(false);
                        if should_prevent {
                            api.prevent_close();
                            if let Some(w) = app.get_webview_window("overlay") {
                                let _ = w.set_focus();
                            }
                        }
                    }
                    // Focused(false) eliminado — el vigilante restaura el foco cada 500ms sin disparar notificaciones GNOME
                    _ => {}
                }
            });
            eprintln!("[overlay] Window created");
        }
        Err(e) => eprintln!("[overlay] Failed: {}", e),
    }
}

fn get_focused_window_title_from_proc() -> Option<String> {
    // Lee /proc para encontrar el proceso con ventana activa
    // Busca procesos de navegadores conocidos y lee su título via /proc/PID/cmdline
    use std::fs;
    let browsers = ["firefox", "chromium", "chrome", "brave"];
    if let Ok(entries) = fs::read_dir("/proc") {
        for entry in entries.flatten() {
            let name = entry.file_name();
            let pid = name.to_str()?;
            if pid.chars().all(|c| c.is_ascii_digit()) {
                if let Ok(comm) = fs::read_to_string(format!("/proc/{}/comm", pid)) {
                    let comm = comm.trim();
                    if browsers.iter().any(|b| comm.contains(b)) {
                        // Leer el título de la ventana via /proc/PID/net/if_inet6 no aplica
                        // Usamos el nombre del proceso como señal mínima
                        return Some(comm.to_string());
                    }
                }
            }
        }
    }
    None
}

mod models;
mod store;
mod server;
mod monitor;
mod persistence;
mod wm_lock;

use store::AppState;
use tauri::Manager;

fn setup_autostart() {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    let dir = format!("{}/.config/autostart", home);
    std::fs::create_dir_all(&dir).ok();
    if let Ok(exe) = std::env::current_exe() {
        let content = format!(
            "[Desktop Entry]\nType=Application\nName=Focus Guard\nExec={}\nHidden=false\nNoDisplay=false\nX-GNOME-Autostart-enabled=true\n",
            exe.display()
        );
        std::fs::write(format!("{}/focus-guard.desktop", dir), content).ok();
        eprintln!("[autostart] .desktop file written");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState::new();
    let state_clone = state.clone();

    tauri::Builder::default()
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            setup_autostart();

            // Guardar AppHandle en el estado para uso desde endpoints HTTP
            let s_handle = state_clone.clone();
            let h_clone = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                *s_handle.app_handle.write().await = Some(h_clone);
            });
            // Suprimir notificaciones de inicio del sistema
            std::env::set_var("NOTIFY_SOCKET", "");

            // Tray icon con menú
            use tauri::{menu::{Menu, MenuItem}, tray::TrayIconBuilder};
            let show = MenuItem::with_id(app, "show", "Mostrar Focus Guard", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.maximize();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            // Al cerrar la ventana, minimizar a tray en vez de salir
            let window = app.get_webview_window("main").unwrap();
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window_clone.hide();
                }
            });

            // Servidor HTTP
            let s1 = state_clone.clone();
            tauri::async_runtime::spawn(async move {
                let router = server::router(s1);
                let listener = tokio::net::TcpListener::bind("127.0.0.1:37291")
                    .await
                    .expect("Failed to bind port 37291");
                axum::serve(listener, router).await.unwrap();
            });

            // Ocultar ventana principal al inicio — solo visible desde tray
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.hide();
            }

            // Monitor AT-SPI
            let s2 = state_clone.clone();
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                monitor::run_monitor(s2, handle).await;
            });

            // Recordatorio de descanso cada 30 minutos, independiente de la detección
            let s4 = state_clone.clone();
            let handle3 = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::time::sleep(tokio::time::Duration::from_secs(30 * 60)).await;
                    if s4.config.read().await.break_reminders_enabled {
                        monitor::show_break_reminder(&s4, &handle3).await;
                    }
                }
            });

            // Vigilante del overlay — lo recrea si fue cerrado/esquivado
            let s3 = state_clone.clone();
            let handle2 = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                    if *s3.overlay_active.read().await {
                        let active = *s3.overlay_active.read().await;
                        if let Some(w) = handle2.get_webview_window("overlay") {
                            if !active {
                                // Countdown terminó — cerrar ventana
                                let _ = w.close();
                            } else {
                                // Mantener siempre encima sin llamar set_focus (evita notificaciones GNOME)
                                let _ = w.set_always_on_top(true);
                            }
                        } else if active {
                            eprintln!("[vigilante] Overlay desaparecio, recreando...");
                            monitor::recreate_overlay(&handle2);
                        }
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

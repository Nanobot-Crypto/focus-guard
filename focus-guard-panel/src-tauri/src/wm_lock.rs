use std::process::Command;

#[derive(Debug, Clone, Default)]
pub struct SavedShortcuts {
    switch_applications: Option<String>,
    switch_applications_backward: Option<String>,
    switch_windows: Option<String>,
    switch_windows_backward: Option<String>,
    overlay_key: Option<String>,
}

fn gsettings_get(schema: &str, key: &str) -> Option<String> {
    let out = Command::new("gsettings").args(["get", schema, key]).output().ok()?;
    if out.status.success() {
        Some(String::from_utf8_lossy(&out.stdout).trim().to_string())
    } else {
        None
    }
}

fn gsettings_set(schema: &str, key: &str, value: &str) {
    match Command::new("gsettings").args(["set", schema, key, value]).output() {
        Ok(out) => {
            if !out.status.success() {
                eprintln!("[wm_lock] FALLO set {} {}: {}", schema, key, String::from_utf8_lossy(&out.stderr));
            } else {
                eprintln!("[wm_lock] OK set {} {} = {}", schema, key, value);
            }
        }
        Err(e) => eprintln!("[wm_lock] ERROR ejecutando gsettings: {}", e),
    }
}

const WM_SCHEMA: &str = "org.gnome.desktop.wm.keybindings";
const MUTTER_SCHEMA: &str = "org.gnome.mutter";

/// Desactiva Alt+Tab y la tecla Super, devolviendo los valores originales para restaurarlos después.
pub fn disable_wm_shortcuts() -> SavedShortcuts {
    let saved = SavedShortcuts {
        switch_applications: gsettings_get(WM_SCHEMA, "switch-applications"),
        switch_applications_backward: gsettings_get(WM_SCHEMA, "switch-applications-backward"),
        switch_windows: gsettings_get(WM_SCHEMA, "switch-windows"),
        switch_windows_backward: gsettings_get(WM_SCHEMA, "switch-windows-backward"),
        overlay_key: gsettings_get(MUTTER_SCHEMA, "overlay-key"),
    };

    gsettings_set(WM_SCHEMA, "switch-applications", "[]");
    gsettings_set(WM_SCHEMA, "switch-applications-backward", "[]");
    gsettings_set(WM_SCHEMA, "switch-windows", "[]");
    gsettings_set(WM_SCHEMA, "switch-windows-backward", "[]");
    gsettings_set(MUTTER_SCHEMA, "overlay-key", "''");

    eprintln!("[wm_lock] Atajos Alt+Tab y Super desactivados");
    saved
}

/// Restaura los atajos originales.
pub fn restore_wm_shortcuts(saved: &SavedShortcuts) {
    if let Some(v) = &saved.switch_applications { gsettings_set(WM_SCHEMA, "switch-applications", v); }
    if let Some(v) = &saved.switch_applications_backward { gsettings_set(WM_SCHEMA, "switch-applications-backward", v); }
    if let Some(v) = &saved.switch_windows { gsettings_set(WM_SCHEMA, "switch-windows", v); }
    if let Some(v) = &saved.switch_windows_backward { gsettings_set(WM_SCHEMA, "switch-windows-backward", v); }
    if let Some(v) = &saved.overlay_key { gsettings_set(MUTTER_SCHEMA, "overlay-key", v); }

    eprintln!("[wm_lock] Atajos Alt+Tab y Super restaurados");
}

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub block_duration: u64,
    pub sensitivity: String,
    pub auto_start: bool,
    pub show_progress: bool,
    pub overlay_theme: String,
    pub break_reminders_enabled: bool,
    pub warning_disable_category: String,
    pub warning_delete_keyword: String,
    pub warning_delete_category: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            block_duration: 40,
            sensitivity: "medium".to_string(),
            auto_start: false,
            show_progress: true,
            overlay_theme: "dark".to_string(),
            break_reminders_enabled: true,
            warning_disable_category: "Estás bajando la guardia justo donde más la necesitas. Cada excepción que te permites hoy es la que tu futuro yo tendrá que pagar. Piénsalo con la cabeza fría, no con el impulso.".to_string(),
            warning_delete_keyword: "Estás abriendo una grieta en el muro que tú mismo decidiste construir. Las excusas de hoy son las recaídas de mañana. ¿De verdad quieres facilitarte el camino de vuelta?".to_string(),
            warning_delete_category: "Estás desmantelando una defensa que tú mismo elegiste tener. Pregúntate con honestidad: ¿quién sale ganando si bajas esta barrera ahora? No es la versión de ti que quiere avanzar.".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: String,
    pub name: String,
    pub keywords: Vec<String>,
    pub enabled: bool,
    pub detection_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectionEvent {
    pub id: String,
    pub time: DateTime<Utc>,
    pub category: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyStat {
    pub date: String,
    pub interventions: u64,
    pub time_saved: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TotalStats {
    pub interventions: u64,
    pub time_saved: u64,
    pub streak_days: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Whitelist {
    pub sites: Vec<String>,
    pub apps: Vec<String>,
}

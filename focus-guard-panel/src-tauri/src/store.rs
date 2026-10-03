use std::sync::Arc;
use std::time::Instant;
use tokio::sync::RwLock;
use uuid::Uuid;
use crate::models::*;
use crate::persistence::{load, save, SavedState};

#[derive(Debug, Clone)]
pub struct AppState {
    pub monitoring: Arc<RwLock<bool>>,
    pub config: Arc<RwLock<Config>>,
    pub categories: Arc<RwLock<Vec<Category>>>,
    pub phrases: Arc<RwLock<Vec<String>>>,
    pub whitelist: Arc<RwLock<Whitelist>>,
    pub events: Arc<RwLock<Vec<DetectionEvent>>>,
    pub start_time: Arc<RwLock<Option<Instant>>>,
    pub current_phrase: Arc<RwLock<String>>,
    pub overlay_active: Arc<RwLock<bool>>,
    pub last_overlay_end: Arc<RwLock<Option<std::time::Instant>>>,
    pub app_handle: Arc<RwLock<Option<tauri::AppHandle>>>,
    pub wm_lock_state: Arc<RwLock<Option<crate::wm_lock::SavedShortcuts>>>,
}

impl AppState {
    pub fn new() -> Self {
        let saved = load();

        let default_categories = vec![
            Category { id: Uuid::new_v4().to_string(), name: "Adult Content".to_string(), keywords: vec!["porn".to_string(), "xxx".to_string()], enabled: true, detection_count: 0 },
            Category { id: Uuid::new_v4().to_string(), name: "Short-form Video".to_string(), keywords: vec!["youtube shorts".to_string(), "tiktok".to_string(), "reels".to_string(), "shorts".to_string(), "make your day".to_string(), "instagram".to_string()], enabled: true, detection_count: 0 },
            Category { id: Uuid::new_v4().to_string(), name: "Social Media".to_string(), keywords: vec!["twitter".to_string(), "facebook".to_string(), "reddit".to_string(), "x.com".to_string(), "x / home".to_string(), "x/home".to_string()], enabled: true, detection_count: 0 },
            Category { id: Uuid::new_v4().to_string(), name: "Gaming".to_string(), keywords: vec!["steam".to_string(), "twitch".to_string()], enabled: false, detection_count: 0 },
        ];

        let default_phrases = vec![
            "Cada vez que resistes una urgencia que no te conviene, recuperas un poco de soberanía sobre tu agenda mental.".to_string(),
            "La libertad práctica depende de un segundo de pausa.".to_string(),
            "El impulso manda menos cuando entrenas la habilidad de no obedecerlo de inmediato.".to_string(),
            "Cuanto más practicas la pausa, menos automático se vuelve el gesto que antes parecía inevitable.".to_string(),
            "Tu identidad se consolida por repetición; lo que haces a menudo acaba pareciendo más tú.".to_string(),
        ];

        Self {
            monitoring: Arc::new(RwLock::new(true)),
            config: Arc::new(RwLock::new(saved.config.unwrap_or_default())),
            categories: Arc::new(RwLock::new(saved.categories.unwrap_or(default_categories))),
            phrases: Arc::new(RwLock::new(saved.phrases.unwrap_or(default_phrases))),
            whitelist: Arc::new(RwLock::new(saved.whitelist.unwrap_or(Whitelist { sites: vec![], apps: vec![] }))),
            events: Arc::new(RwLock::new(saved.events.unwrap_or_default())),
            start_time: Arc::new(RwLock::new(Some(std::time::Instant::now()))),
            current_phrase: Arc::new(RwLock::new(String::new())),
            overlay_active: Arc::new(RwLock::new(false)),
            last_overlay_end: Arc::new(RwLock::new(None)),
            app_handle: Arc::new(RwLock::new(None)),
            wm_lock_state: Arc::new(RwLock::new(None)),
        }
    }

    pub async fn save(&self) {
        let saved = SavedState {
            config: Some(self.config.read().await.clone()),
            categories: Some(self.categories.read().await.clone()),
            phrases: Some(self.phrases.read().await.clone()),
            whitelist: Some(self.whitelist.read().await.clone()),
            events: Some(self.events.read().await.iter().take(200).cloned().collect()),
        };
        save(&saved);
    }
}

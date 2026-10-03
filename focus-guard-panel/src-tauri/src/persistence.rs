use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use crate::models::{Category, Config, DetectionEvent, Whitelist};

#[derive(Serialize, Deserialize, Default)]
pub struct SavedState {
    pub config: Option<Config>,
    pub categories: Option<Vec<Category>>,
    pub phrases: Option<Vec<String>>,
    pub whitelist: Option<Whitelist>,
    pub events: Option<Vec<DetectionEvent>>,
}

pub fn data_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    let dir = PathBuf::from(format!("{}/.config/focus-guard", home));
    fs::create_dir_all(&dir).ok();
    dir.join("data.json")
}

pub fn load() -> SavedState {
    match fs::read_to_string(data_path()) {
        Ok(s) => serde_json::from_str(&s).unwrap_or_default(),
        Err(_) => SavedState::default(),
    }
}

pub fn save(state: &SavedState) {
    if let Ok(json) = serde_json::to_string_pretty(state) {
        fs::write(data_path(), json).ok();
    }
}

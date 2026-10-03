use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{delete, get, post, put},
    Router,
};
use chrono::Utc;
use serde::Deserialize;
use serde_json::{json, Value};
use tower_http::cors::{Any, CorsLayer};
use uuid::Uuid;
use crate::models::*;
use crate::store::AppState;

pub fn router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/api/status", get(get_status))
        .route("/api/monitoring", post(set_monitoring))
        .route("/api/config", get(get_config).put(put_config))
        .route("/api/categories", get(get_categories).post(post_category))
        .route("/api/categories/:id", put(put_category).delete(delete_category))
        .route("/api/phrases", get(get_phrases).put(put_phrases))
        .route("/api/whitelist", get(get_whitelist).put(put_whitelist))
        .route("/api/stats", get(get_stats))
        .route("/api/stats/reset", post(reset_stats))
        .route("/api/recent", get(get_recent))
        .route("/api/overlay", get(get_overlay))
        .route("/api/overlay/close", post(close_overlay))
        .route("/api/url", post(post_url))
        .route("/api/warning", post(post_warning))
        .layer(cors)
        .with_state(state)
}

async fn get_status(State(s): State<AppState>) -> Json<Value> {
    let monitoring = *s.monitoring.read().await;
    let events = s.events.read().await;
    let last = events.first().map(|e| e.time.to_rfc3339());
    let today = events.iter().filter(|e| {
        e.time.date_naive() == Utc::now().date_naive()
    }).count();
    let uptime = if monitoring {
        let st = s.start_time.read().await;
        if let Some(t) = *st {
            let secs = t.elapsed().as_secs();
            format!("{}h {}m", secs / 3600, (secs % 3600) / 60)
        } else { "0m".to_string() }
    } else { "—".to_string() };

    Json(json!({
        "monitoring": monitoring,
        "todayInterventions": today,
        "uptime": uptime,
        "lastDetection": last,
    }))
}

#[derive(Deserialize)]
struct MonitoringAction { action: String }

async fn set_monitoring(
    State(s): State<AppState>,
    Json(body): Json<MonitoringAction>,
) -> Json<Value> {
    let mut m = s.monitoring.write().await;
    let mut st = s.start_time.write().await;
    *m = body.action == "start";
    if *m {
        *st = Some(std::time::Instant::now());
    } else {
        *st = None;
    }
    Json(json!({ "monitoring": *m }))
}

async fn get_config(State(s): State<AppState>) -> Json<Config> {
    Json(s.config.read().await.clone())
}

async fn put_config(State(s): State<AppState>, Json(body): Json<Config>) -> Json<Value> {
    *s.config.write().await = body;
    s.save().await;
    Json(json!({ "ok": true }))
}

async fn get_categories(State(s): State<AppState>) -> Json<Vec<Category>> {
    Json(s.categories.read().await.clone())
}

async fn post_category(State(s): State<AppState>, Json(mut body): Json<Category>) -> Json<Category> {
    body.id = Uuid::new_v4().to_string();
    body.detection_count = 0;
    s.categories.write().await.push(body.clone());
    s.save().await;
    Json(body)
}

async fn put_category(
    State(s): State<AppState>,
    Path(id): Path<String>,
    Json(patch): Json<serde_json::Value>,
) -> Result<Json<Category>, StatusCode> {
    let mut cats = s.categories.write().await;
    if let Some(c) = cats.iter_mut().find(|c| c.id == id) {
        if let Some(name) = patch.get("name").and_then(|v| v.as_str()) { c.name = name.to_string(); }
        if let Some(kws) = patch.get("keywords").and_then(|v| v.as_array()) { c.keywords = kws.iter().filter_map(|v| v.as_str()).map(|s| s.to_string()).collect(); }
        if let Some(enabled) = patch.get("enabled").and_then(|v| v.as_bool()) { c.enabled = enabled; }
        let result = c.clone();
        drop(cats);
        s.save().await;
        Ok(Json(result))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

async fn delete_category(
    State(s): State<AppState>,
    Path(id): Path<String>,
) -> Json<Value> {
    s.categories.write().await.retain(|c| c.id != id);
    s.save().await;
    Json(json!({ "ok": true }))
}

async fn get_phrases(State(s): State<AppState>) -> Json<Value> {
    let phrases = s.phrases.read().await.clone();
    Json(json!({ "phrases": phrases, "filePath": "~/.config/focus-guard/phrases.txt" }))
}

#[derive(Deserialize)]
struct PhrasesBody { phrases: Vec<String> }

async fn put_phrases(State(s): State<AppState>, Json(body): Json<PhrasesBody>) -> Json<Value> {
    *s.phrases.write().await = body.phrases;
    s.save().await;
    Json(json!({ "ok": true }))
}

async fn get_whitelist(State(s): State<AppState>) -> Json<Whitelist> {
    Json(s.whitelist.read().await.clone())
}

async fn put_whitelist(State(s): State<AppState>, Json(body): Json<Whitelist>) -> Json<Value> {
    *s.whitelist.write().await = body;
    s.save().await;
    Json(json!({ "ok": true }))
}

async fn get_stats(State(s): State<AppState>) -> Json<Value> {
    let events = s.events.read().await;
    let today = Utc::now().date_naive();
    let today_count = events.iter().filter(|e| e.time.date_naive() == today).count() as u64;
    let total = events.len() as u64;

    Json(json!({
        "daily": [{ "date": today.to_string(), "interventions": today_count, "timeSaved": today_count * 40 }],
        "byCategory": [],
        "total": { "interventions": total, "timeSaved": total * 40, "streakDays": 0 }
    }))
}

async fn reset_stats(State(s): State<AppState>) -> Json<Value> {
    s.events.write().await.clear();
    s.save().await;
    Json(json!({ "ok": true }))
}

#[derive(Deserialize)]
struct UrlPayload { url: String, title: String }

#[derive(Deserialize)]
struct WarningPayload { message: String }

async fn post_warning(State(s): State<AppState>, Json(body): Json<WarningPayload>) -> Json<Value> {
    let handle_opt = s.app_handle.read().await.clone();
    if let Some(handle) = handle_opt {
        crate::monitor::show_warning_overlay(&s, &handle, body.message).await;
    }
    Json(json!({ "ok": true }))
}

async fn post_url(State(s): State<AppState>, Json(body): Json<UrlPayload>) -> Json<Value> {
    let combined = format!("{} {}", body.url.to_lowercase(), body.title.to_lowercase());
    let whitelist = s.whitelist.read().await;
    for site in &whitelist.sites {
        if body.url.contains(site.as_str()) {
            return Json(json!({ "ok": true, "blocked": false }));
        }
    }
    drop(whitelist);
    let categories = s.categories.read().await;
    for cat in categories.iter().filter(|c| c.enabled) {
        for kw in &cat.keywords {
            if combined.contains(kw.to_lowercase().as_str()) {
                let event = crate::models::DetectionEvent {
                    id: uuid::Uuid::new_v4().to_string(),
                    time: chrono::Utc::now(),
                    category: cat.name.clone(),
                    title: body.title.clone(),
                };
                drop(categories);
                let mut events = s.events.write().await;
                let is_dup = events.first().map(|e| {
                    e.title == body.title && (chrono::Utc::now() - e.time).num_seconds() < 30
                }).unwrap_or(false);
                if !is_dup {
                    events.insert(0, event);
                    if events.len() > 500 { events.truncate(500); }
                    drop(events);
                    s.save().await;
                    // Disparar overlay también desde detección por URL
                    let handle_opt = s.app_handle.read().await.clone();
                    if let Some(handle) = handle_opt {
                        crate::monitor::trigger_overlay_from_detection(&s, &handle).await;
                    }
                }
                return Json(json!({ "ok": true, "blocked": true }));
            }
        }
    }
    Json(json!({ "ok": true, "blocked": false }))
}

async fn close_overlay(State(s): State<AppState>) -> Json<Value> {
    *s.overlay_active.write().await = false;
    *s.current_phrase.write().await = String::new();
    Json(json!({ "ok": true }))
}

async fn get_overlay(State(s): State<AppState>) -> Json<Value> {
    let phrase = s.current_phrase.read().await.clone();
    let duration = s.config.read().await.block_duration;
    Json(json!({ "phrase": phrase, "duration": duration }))
}

async fn get_recent(State(s): State<AppState>) -> Json<Value> {
    let events = s.events.read().await;
    let recent: Vec<Value> = events.iter().take(10).map(|e| json!({
        "time": e.time.to_rfc3339(),
        "category": e.category,
        "title": e.title,
    })).collect();
    Json(json!(recent))
}

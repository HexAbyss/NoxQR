mod error;
mod models;
mod routes;
mod services;

use std::{env, net::SocketAddr};

use axum::{routing::{get, post}, Json, Router};
use serde_json::json;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
            "noxqr_backend=info,tower_http=info,axum=info".into()
        }))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let address = env::var("NOXQR_BACKEND_ADDR")
        .unwrap_or_else(|_| "0.0.0.0:3001".to_string())
        .parse::<SocketAddr>()
        .expect("NOXQR_BACKEND_ADDR must be a valid socket address");

    let app = Router::new()
        .route("/health", get(health))
        .route("/generate", post(routes::generate::generate_qr))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        );

    let listener = tokio::net::TcpListener::bind(address)
        .await
        .expect("failed to bind TCP listener");

    tracing::info!("NoxQR backend listening on {}", address);

    axum::serve(listener, app)
        .await
        .expect("backend server exited unexpectedly");
}

async fn health() -> Json<serde_json::Value> {
    Json(json!({ "status": "ok" }))
}

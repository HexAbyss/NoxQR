use axum::Json;

use crate::{
    engine::pipeline::QrEngine,
    error::AppError,
    models::{request::GenerateRequest, response::GenerateResponse},
};

pub async fn generate_qr(
    Json(payload): Json<GenerateRequest>,
) -> Result<Json<GenerateResponse>, AppError> {
    let engine = QrEngine;
    let response = engine.generate(payload)?;

    Ok(Json(response))
}
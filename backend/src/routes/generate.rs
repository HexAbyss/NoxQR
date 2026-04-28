use axum::Json;

use crate::{error::AppError, models::{request::GenerateRequest, response::GenerateResponse}, services::qr_engine::QrEngine};

pub async fn generate_qr(
    Json(payload): Json<GenerateRequest>,
) -> Result<Json<GenerateResponse>, AppError> {
    let engine = QrEngine;
    let response = engine.generate(payload)?;

    Ok(Json(response))
}

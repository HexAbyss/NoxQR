use std::{error::Error, fmt::{Display, Formatter}};

use axum::{http::StatusCode, response::{IntoResponse, Response}, Json};
use serde::Serialize;

#[derive(Debug)]
pub struct AppError {
    status: StatusCode,
    message: String,
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
}

impl AppError {
    pub fn bad_request(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::BAD_REQUEST,
            message: message.into(),
        }
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: message.into(),
        }
    }
}

impl Display for AppError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.message)
    }
}

impl Error for AppError {}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(ErrorBody {
                error: self.message,
            }),
        )
            .into_response()
    }
}

impl From<image::ImageError> for AppError {
    fn from(_: image::ImageError) -> Self {
        Self::internal("Failed to encode PNG output")
    }
}

impl From<qrcode::types::QrError> for AppError {
    fn from(error: qrcode::types::QrError) -> Self {
        Self::bad_request(format!("Unable to encode QR data: {error}"))
    }
}

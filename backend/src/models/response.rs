use serde::Serialize;

use crate::validation::ValidationResult;

#[derive(Debug, Serialize)]
pub struct GenerateResponse {
    pub svg: String,
    pub png_base64: String,
    pub validation: ValidationResult,
}

use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct GenerateResponse {
    pub svg: String,
    pub png_base64: String,
}

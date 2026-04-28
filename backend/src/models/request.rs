use serde::Deserialize;

use crate::services::renderer::RenderStyle;

#[derive(Debug, Clone, Deserialize)]
pub struct GenerateRequest {
    pub data: String,
    #[serde(default)]
    pub style: RenderStyle,
    pub color: String,
    pub background: String,
    #[serde(default)]
    pub transparent_background: bool,
    pub size: u32,
}

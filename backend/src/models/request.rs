use serde::Deserialize;

use crate::render::{
    ArtisticPreset, PerceptionMode, QRFinderBorderStyle, QRFinderCenterStyle,
    QRFrameStyle, RenderStyle,
};

fn default_logo_scale() -> f32 {
    0.22
}

fn default_perception_strength() -> f32 {
    0.34
}

fn default_border_color() -> String {
    "#1F2F48".to_string()
}

fn default_center_color() -> String {
    "#00FFAA".to_string()
}

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
    #[serde(default)]
    pub frame_style: QRFrameStyle,
    #[serde(default)]
    pub finder_border_style: QRFinderBorderStyle,
    #[serde(default)]
    pub finder_center_style: QRFinderCenterStyle,
    #[serde(default = "default_border_color")]
    pub border_color: String,
    #[serde(default = "default_center_color")]
    pub center_color: String,
    #[serde(default)]
    pub gradient_enabled: bool,
    #[serde(default)]
    pub preset: ArtisticPreset,
    #[serde(default)]
    pub camouflage: f32,
    #[serde(default)]
    pub perception_mode: PerceptionMode,
    #[serde(default = "default_perception_strength")]
    pub perception_strength: f32,
    #[serde(default)]
    pub reference_image: Option<String>,
    #[serde(default)]
    pub logo_image: Option<String>,
    #[serde(default = "default_logo_scale")]
    pub logo_scale: f32,
}

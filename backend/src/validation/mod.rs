use image::Rgba;

use crate::{error::AppError, models::request::GenerateRequest, render::RenderStyle};

const MIN_SIZE: u32 = 256;
const MAX_SIZE: u32 = 1024;
const MIN_CONTRAST_RATIO: f32 = 3.5;

pub struct ValidatedGenerateRequest {
    pub data: String,
    pub style: RenderStyle,
    pub size: u32,
    pub transparent_background: bool,
    pub foreground: ParsedColor,
    pub background: ParsedColor,
}

#[derive(Debug, Clone, Copy)]
pub struct ParsedColor {
    r: u8,
    g: u8,
    b: u8,
}

impl ParsedColor {
    pub fn parse(value: &str) -> Result<Self, AppError> {
        let normalized = value.trim().trim_start_matches('#');

        if normalized.len() != 6
            || !normalized
                .chars()
                .all(|character| character.is_ascii_hexdigit())
        {
            return Err(AppError::bad_request(format!(
                "Invalid color '{value}'. Use the #RRGGBB format."
            )));
        }

        let r = u8::from_str_radix(&normalized[0..2], 16)
            .map_err(|_| AppError::bad_request(format!("Invalid color '{value}'")))?;
        let g = u8::from_str_radix(&normalized[2..4], 16)
            .map_err(|_| AppError::bad_request(format!("Invalid color '{value}'")))?;
        let b = u8::from_str_radix(&normalized[4..6], 16)
            .map_err(|_| AppError::bad_request(format!("Invalid color '{value}'")))?;

        Ok(Self { r, g, b })
    }

    pub fn to_rgba(self) -> Rgba<u8> {
        Rgba([self.r, self.g, self.b, 255])
    }

    pub fn to_rgba_with_alpha(self, alpha: u8) -> Rgba<u8> {
        Rgba([self.r, self.g, self.b, alpha])
    }

    pub fn to_hex(self) -> String {
        format!("#{:02X}{:02X}{:02X}", self.r, self.g, self.b)
    }

    fn relative_luminance(self) -> f32 {
        let [red, green, blue] = [self.r, self.g, self.b].map(channel_to_linear);
        (0.2126 * red) + (0.7152 * green) + (0.0722 * blue)
    }
}

pub fn validate_generate_request(
    request: GenerateRequest,
) -> Result<ValidatedGenerateRequest, AppError> {
    let data = request.data.trim();
    if data.is_empty() {
        return Err(AppError::bad_request("QR data cannot be empty"));
    }

    if !(MIN_SIZE..=MAX_SIZE).contains(&request.size) {
        return Err(AppError::bad_request(format!(
            "Size must be between {MIN_SIZE} and {MAX_SIZE} pixels"
        )));
    }

    let foreground = ParsedColor::parse(&request.color)?;
    let background = ParsedColor::parse(&request.background)?;

    if !request.transparent_background {
        let contrast = contrast_ratio(foreground, background);

        if contrast < MIN_CONTRAST_RATIO {
            return Err(AppError::bad_request(format!(
                "Foreground and background contrast is too low ({contrast:.2}:1). Use stronger contrast to preserve scan reliability."
            )));
        }
    }

    Ok(ValidatedGenerateRequest {
        data: data.to_string(),
        style: request.style,
        size: request.size,
        transparent_background: request.transparent_background,
        foreground,
        background,
    })
}

fn channel_to_linear(channel: u8) -> f32 {
    let value = channel as f32 / 255.0;

    if value <= 0.03928 {
        value / 12.92
    } else {
        ((value + 0.055) / 1.055).powf(2.4)
    }
}

fn contrast_ratio(foreground: ParsedColor, background: ParsedColor) -> f32 {
    let foreground_luminance = foreground.relative_luminance();
    let background_luminance = background.relative_luminance();
    let (lighter, darker) = if foreground_luminance >= background_luminance {
        (foreground_luminance, background_luminance)
    } else {
        (background_luminance, foreground_luminance)
    };

    (lighter + 0.05) / (darker + 0.05)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn contrast_ratio_favors_dark_and_light_pairs() {
        let foreground = ParsedColor::parse("#00FFAA").expect("valid foreground");
        let background = ParsedColor::parse("#05070A").expect("valid background");

        assert!(contrast_ratio(foreground, background) > MIN_CONTRAST_RATIO);
    }
}
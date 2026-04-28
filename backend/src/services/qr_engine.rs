use std::io::Cursor;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use image::{DynamicImage, ImageFormat, Rgba, RgbaImage};
use qrcode::{types::Color, EcLevel, QrCode};

use crate::{error::AppError, models::{request::GenerateRequest, response::GenerateResponse}};

use super::{renderer::{ModuleKind, RasterModuleGeometry, Renderer, SvgModuleGeometry}, styles::{self, square::SquareRenderer}};

const QUIET_ZONE: usize = 4;
const MIN_SIZE: u32 = 256;
const MAX_SIZE: u32 = 1024;
const MIN_CONTRAST_RATIO: f32 = 3.5;

pub struct QrEngine;

impl QrEngine {
    pub fn generate(&self, request: GenerateRequest) -> Result<GenerateResponse, AppError> {
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
        let foreground_hex = foreground.to_hex();
        let background_hex = background.to_hex();
        if !request.transparent_background {
            let contrast = contrast_ratio(foreground, background);

            if contrast < MIN_CONTRAST_RATIO {
                return Err(AppError::bad_request(format!(
                    "Foreground and background contrast is too low ({contrast:.2}:1). Use stronger contrast to preserve scan reliability."
                )));
            }
        }

        let matrix = QrMatrix::from_data(data)?;
        let total_modules = matrix.width + (QUIET_ZONE * 2);
        let styled_renderer = styles::renderer_for(request.style);
        let structural_renderer = SquareRenderer;

        // Structural modules stay conservative even when the selected style is more expressive.
        // That keeps finder, timing, and alignment patterns stable for scanners.
        let mut svg = String::with_capacity(total_modules * total_modules * 48);
        svg.push_str(&format!(
            r#"<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {view_box} {view_box}" fill="none" role="img" aria-label="Generated artistic QR code">"#,
            size = request.size,
            view_box = total_modules,
        ));
        if !request.transparent_background {
            svg.push_str(&format!(
                r#"<rect width="{view_box}" height="{view_box}" fill="{background}" />"#,
                view_box = total_modules,
                background = background_hex,
            ));
        }

        let mut image = RgbaImage::from_pixel(
            request.size,
            request.size,
            if request.transparent_background {
                background.to_rgba_with_alpha(0)
            } else {
                background.to_rgba()
            },
        );

        for y in 0..matrix.width {
            for x in 0..matrix.width {
                if !matrix.is_dark(x, y) {
                    continue;
                }

                let kind = matrix.module_kind(x, y);
                let grid_x = x + QUIET_ZONE;
                let grid_y = y + QUIET_ZONE;
                let svg_geometry = SvgModuleGeometry {
                    cell_x: x,
                    cell_y: y,
                    x: grid_x as f32,
                    y: grid_y as f32,
                    size: 1.0,
                    kind,
                };
                let raster_geometry = raster_geometry(
                    x,
                    y,
                    grid_x,
                    grid_y,
                    total_modules,
                    request.size,
                    kind,
                );

                let renderer: &dyn Renderer = if kind == ModuleKind::Structural {
                    &structural_renderer
                } else {
                    styled_renderer.as_ref()
                };

                svg.push_str(&renderer.render_svg_module(svg_geometry, &foreground_hex));
                renderer.rasterize_module(&mut image, raster_geometry, foreground.to_rgba());
            }
        }

        svg.push_str("</svg>");

        Ok(GenerateResponse {
            svg,
            png_base64: encode_png(image)?,
        })
    }
}

fn raster_geometry(
    cell_x: usize,
    cell_y: usize,
    grid_x: usize,
    grid_y: usize,
    total_modules: usize,
    canvas_size: u32,
    kind: ModuleKind,
) -> RasterModuleGeometry {
    // Integer division on the cell edges keeps raster output deterministic and guarantees the
    // entire canvas is covered without fractional drift.
    let x0 = ((grid_x as u64) * (canvas_size as u64) / (total_modules as u64)) as u32;
    let x1 = (((grid_x + 1) as u64) * (canvas_size as u64) / (total_modules as u64)) as u32;
    let y0 = ((grid_y as u64) * (canvas_size as u64) / (total_modules as u64)) as u32;
    let y1 = (((grid_y + 1) as u64) * (canvas_size as u64) / (total_modules as u64)) as u32;

    RasterModuleGeometry {
        cell_x,
        cell_y,
        x0,
        y0,
        x1,
        y1,
        kind,
    }
}

fn encode_png(image: RgbaImage) -> Result<String, AppError> {
    let mut cursor = Cursor::new(Vec::new());
    DynamicImage::ImageRgba8(image).write_to(&mut cursor, ImageFormat::Png)?;

    Ok(format!(
        "data:image/png;base64,{}",
        BASE64.encode(cursor.into_inner())
    ))
}

#[derive(Debug, Clone, Copy)]
struct ParsedColor {
    r: u8,
    g: u8,
    b: u8,
}

impl ParsedColor {
    fn parse(value: &str) -> Result<Self, AppError> {
        let normalized = value.trim().trim_start_matches('#');

        if normalized.len() != 6 || !normalized.chars().all(|character| character.is_ascii_hexdigit()) {
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

    fn to_rgba(self) -> Rgba<u8> {
        Rgba([self.r, self.g, self.b, 255])
    }

    fn to_rgba_with_alpha(self, alpha: u8) -> Rgba<u8> {
        Rgba([self.r, self.g, self.b, alpha])
    }

    fn to_hex(self) -> String {
        format!("#{:02X}{:02X}{:02X}", self.r, self.g, self.b)
    }

    fn relative_luminance(self) -> f32 {
        let [red, green, blue] = [self.r, self.g, self.b].map(channel_to_linear);
        (0.2126 * red) + (0.7152 * green) + (0.0722 * blue)
    }
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

struct QrMatrix {
    width: usize,
    version: usize,
    modules: Vec<bool>,
}

impl QrMatrix {
    fn from_data(data: &str) -> Result<Self, AppError> {
        let code = QrCode::with_error_correction_level(data.as_bytes(), EcLevel::H)?;
        let width = code.width();
        let version = ((width - 21) / 4) + 1;
        let modules = code
            .to_colors()
            .into_iter()
            .map(|module| module == Color::Dark)
            .collect();

        Ok(Self {
            width,
            version,
            modules,
        })
    }

    fn is_dark(&self, x: usize, y: usize) -> bool {
        self.modules[(y * self.width) + x]
    }

    fn module_kind(&self, x: usize, y: usize) -> ModuleKind {
        if self.is_structural(x, y) {
            ModuleKind::Structural
        } else {
            ModuleKind::Data
        }
    }

    fn is_structural(&self, x: usize, y: usize) -> bool {
        is_finder_module(x, y, self.width)
            || is_alignment_module(x, y, self.width, self.version)
            || is_timing_module(x, y, self.width)
            || is_format_module(x, y, self.width)
            || is_version_module(x, y, self.width, self.version)
            || is_fixed_dark_module(x, y, self.width)
    }
}

fn is_finder_module(x: usize, y: usize, width: usize) -> bool {
    in_square(x, y, 0, 0, 7)
        || in_square(x, y, width - 7, 0, 7)
        || in_square(x, y, 0, width - 7, 7)
}

fn is_timing_module(x: usize, y: usize, width: usize) -> bool {
    ((x == 6) && (8..(width - 8)).contains(&y)) || ((y == 6) && (8..(width - 8)).contains(&x))
}

fn is_format_module(x: usize, y: usize, width: usize) -> bool {
    let top_left = ((x == 8) && (y <= 8) && (y != 6)) || ((y == 8) && (x <= 8) && (x != 6));
    let top_right = y == 8 && x >= width - 8;
    let bottom_left = x == 8 && y >= width - 7;

    top_left || top_right || bottom_left
}

fn is_version_module(x: usize, y: usize, width: usize, version: usize) -> bool {
    if version < 7 {
        return false;
    }

    let top_right = y < 6 && ((width - 11)..(width - 8)).contains(&x);
    let bottom_left = x < 6 && ((width - 11)..(width - 8)).contains(&y);

    top_right || bottom_left
}

fn is_fixed_dark_module(x: usize, y: usize, width: usize) -> bool {
    x == 8 && y == width - 8
}

fn is_alignment_module(x: usize, y: usize, width: usize, version: usize) -> bool {
    let centers = alignment_pattern_centers(version);

    if centers.is_empty() {
        return false;
    }

    for &center_y in centers {
        for &center_x in centers {
            if overlaps_reserved_alignment_center(center_x, center_y, width) {
                continue;
            }

            if x.abs_diff(center_x) <= 2 && y.abs_diff(center_y) <= 2 {
                return true;
            }
        }
    }

    false
}

fn overlaps_reserved_alignment_center(center_x: usize, center_y: usize, width: usize) -> bool {
    (center_x <= 8 && center_y <= 8)
        || (center_x >= width - 9 && center_y <= 8)
        || (center_x <= 8 && center_y >= width - 9)
}

fn in_square(x: usize, y: usize, left: usize, top: usize, size: usize) -> bool {
    (left..(left + size)).contains(&x) && (top..(top + size)).contains(&y)
}

fn alignment_pattern_centers(version: usize) -> &'static [usize] {
    const TABLE: [&[usize]; 40] = [
        &[],
        &[6, 18],
        &[6, 22],
        &[6, 26],
        &[6, 30],
        &[6, 34],
        &[6, 22, 38],
        &[6, 24, 42],
        &[6, 26, 46],
        &[6, 28, 50],
        &[6, 30, 54],
        &[6, 32, 58],
        &[6, 34, 62],
        &[6, 26, 46, 66],
        &[6, 26, 48, 70],
        &[6, 26, 50, 74],
        &[6, 30, 54, 78],
        &[6, 30, 56, 82],
        &[6, 30, 58, 86],
        &[6, 34, 62, 90],
        &[6, 28, 50, 72, 94],
        &[6, 26, 50, 74, 98],
        &[6, 30, 54, 78, 102],
        &[6, 28, 54, 80, 106],
        &[6, 32, 58, 84, 110],
        &[6, 30, 58, 86, 114],
        &[6, 34, 62, 90, 118],
        &[6, 26, 50, 74, 98, 122],
        &[6, 30, 54, 78, 102, 126],
        &[6, 26, 52, 78, 104, 130],
        &[6, 30, 56, 82, 108, 134],
        &[6, 34, 60, 86, 112, 138],
        &[6, 30, 58, 86, 114, 142],
        &[6, 34, 62, 90, 118, 146],
        &[6, 30, 54, 78, 102, 126, 150],
        &[6, 24, 50, 76, 102, 128, 154],
        &[6, 28, 54, 80, 106, 132, 158],
        &[6, 32, 58, 84, 110, 136, 162],
        &[6, 26, 54, 82, 110, 138, 166],
        &[6, 30, 58, 86, 114, 142, 170],
    ];

    TABLE[version.saturating_sub(1).min(TABLE.len() - 1)]
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

    #[test]
    fn finder_patterns_remain_structural() {
        assert!(is_finder_module(0, 0, 21));
        assert!(is_finder_module(20, 0, 21));
        assert!(is_finder_module(0, 20, 21));
        assert!(!is_finder_module(10, 10, 21));
    }

    #[test]
    fn alignment_patterns_skip_reserved_corners() {
        assert!(is_alignment_module(22, 22, 45, 7));
        assert!(!is_alignment_module(6, 6, 45, 7));
    }
}

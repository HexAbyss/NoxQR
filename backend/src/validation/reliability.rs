use image::{imageops, GrayImage, Rgba, RgbaImage};
use rqrr::PreparedImage;
use serde::Serialize;

use crate::{core::matrix::QrMatrix, render::RenderTelemetry};

use super::{contrast_ratio, ValidatedGenerateRequest};

const AUTO_CORRECTION_SCORE_THRESHOLD: f32 = 0.78;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Serialize)]
pub struct ValidationMetrics {
    pub contrast_ratio: f32,
    pub distortion: f32,
    pub density: f32,
    pub quiet_zone_integrity: f32,
    pub simulation_pass_rate: f32,
}

#[derive(Debug, Clone, Serialize)]
pub struct SimulationResult {
    pub name: String,
    pub passed: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct ValidationResult {
    pub score: f32,
    pub risk: RiskLevel,
    pub metrics: ValidationMetrics,
    pub simulations: Vec<SimulationResult>,
    pub corrections_applied: Vec<String>,
    pub suggestions: Vec<String>,
    pub auto_corrected: bool,
}

impl ValidationResult {
    pub fn with_corrections(mut self, corrections_applied: Vec<String>) -> Self {
        self.auto_corrected = !corrections_applied.is_empty();
        self.corrections_applied = corrections_applied;
        self
    }

    pub fn baseline_passed(&self) -> bool {
        self.simulations
            .iter()
            .find(|simulation| simulation.name == "baseline")
            .is_some_and(|simulation| simulation.passed)
    }
}

pub fn assess_render_reliability(
    matrix: &QrMatrix,
    image: &RgbaImage,
    request: &ValidatedGenerateRequest,
    telemetry: &RenderTelemetry,
    quiet_zone: usize,
) -> ValidationResult {
    let validation_image = composite_for_validation(image, request.background.to_rgba());
    let simulations = run_simulations(&validation_image);
    let simulation_pass_rate = if simulations.is_empty() {
        0.0
    } else {
        simulations.iter().filter(|simulation| simulation.passed).count() as f32 / simulations.len() as f32
    };

    let contrast_ratio = contrast_ratio(request.foreground, request.background);
    let distortion = distortion_severity(telemetry);
    let density = density_ratio(&validation_image, request.background.to_rgba(), matrix.width(), quiet_zone);
    let quiet_zone_integrity = quiet_zone_integrity(&validation_image, request.background.to_rgba(), matrix.width(), quiet_zone);

    let contrast_score = contrast_score(contrast_ratio, request.transparent_background);
    let distortion_score = 1.0 - distortion;
    let density_score = density_score(density);
    let baseline_bonus = if simulations.first().is_some_and(|simulation| simulation.passed) {
        0.05
    } else {
        0.0
    };
    let mut score = (
        (contrast_score * 0.22)
            + (distortion_score * 0.18)
            + (density_score * 0.16)
            + (quiet_zone_integrity * 0.14)
            + (simulation_pass_rate * 0.25)
            + baseline_bonus
    )
        .clamp(0.0, 1.0);

    if !simulations.first().is_some_and(|simulation| simulation.passed) {
        score = score.min(0.58);
    }

    let risk = risk_from_score(score, simulations.first().is_some_and(|simulation| simulation.passed));
    let metrics = ValidationMetrics {
        contrast_ratio,
        distortion,
        density,
        quiet_zone_integrity,
        simulation_pass_rate,
    };
    let suggestions = suggestions(&metrics, request.transparent_background);

    ValidationResult {
        score,
        risk,
        metrics,
        simulations,
        corrections_applied: Vec::new(),
        suggestions,
        auto_corrected: false,
    }
}

pub fn recommended_safety_bias(result: &ValidationResult) -> Option<f32> {
    if result.score >= AUTO_CORRECTION_SCORE_THRESHOLD {
        return None;
    }

    let distortion_or_density_risk = result.metrics.distortion > 0.16
        || result.metrics.density < 0.17
        || result.metrics.simulation_pass_rate < 0.75
        || !result.baseline_passed();

    if !distortion_or_density_risk {
        return None;
    }

    Some(match result.risk {
        RiskLevel::Low => 0.35,
        RiskLevel::Medium => 0.62,
        RiskLevel::High => 0.88,
    })
}

fn risk_from_score(score: f32, baseline_passed: bool) -> RiskLevel {
    if !baseline_passed {
        return RiskLevel::High;
    }

    if score >= 0.86 {
        RiskLevel::Low
    } else if score >= 0.70 {
        RiskLevel::Medium
    } else {
        RiskLevel::High
    }
}

fn suggestions(metrics: &ValidationMetrics, transparent_background: bool) -> Vec<String> {
    let mut messages = Vec::new();

    if transparent_background {
        messages.push("Transparent exports inherit the contrast of the host surface.".to_string());
    }

    if metrics.distortion > 0.22 {
        messages.push("Reduce visual distortion for hostile scan conditions or small canvas sizes.".to_string());
    }

    if metrics.density < 0.18 {
        messages.push("Increase module occupancy or use a less fragmented style profile.".to_string());
    }

    if metrics.simulation_pass_rate < 0.75 {
        messages.push("Prefer larger canvases when blur, distance, or poor lighting are expected.".to_string());
    }

    if metrics.quiet_zone_integrity < 0.98 {
        messages.push("Protect the quiet zone from visual spill to preserve scanner acquisition.".to_string());
    }

    messages
}

fn contrast_score(contrast_ratio: f32, transparent_background: bool) -> f32 {
    let base = ((contrast_ratio - 1.0) / 6.0).clamp(0.0, 1.0);

    if transparent_background {
        base * 0.92
    } else {
        base
    }
}

fn distortion_severity(telemetry: &RenderTelemetry) -> f32 {
    if telemetry.module_count == 0 {
        return 0.0;
    }

    let offset = ((telemetry.average_offset / 0.05) * 0.65 + (telemetry.max_offset / 0.08) * 0.35)
        .clamp(0.0, 1.0);
    let scale = ((telemetry.average_scale_delta / 0.20) * 0.7 + (telemetry.max_scale_delta / 0.24) * 0.3)
        .clamp(0.0, 1.0);
    let rotation = ((telemetry.average_rotation_degrees / 18.0) * 0.7
        + (telemetry.max_rotation_degrees / 28.0) * 0.3)
        .clamp(0.0, 1.0);
    let data_bias = telemetry.data_module_count as f32 / telemetry.module_count as f32;
    let strict_bias = telemetry.strict_module_count as f32 / telemetry.module_count as f32;
    let importance_bias = (1.0 - telemetry.average_importance).clamp(0.0, 1.0);

    ((offset * 0.34)
        + (scale * 0.24)
        + (rotation * 0.16)
        + (data_bias * importance_bias * 0.18)
        + (strict_bias * 0.08))
        .clamp(0.0, 1.0)
}

fn density_score(density: f32) -> f32 {
    if (0.18..=0.52).contains(&density) {
        return 1.0;
    }

    if density < 0.18 {
        return (density / 0.18).clamp(0.0, 1.0);
    }

    (1.0 - ((density - 0.52) / 0.30)).clamp(0.0, 1.0)
}

fn density_ratio(image: &RgbaImage, background: Rgba<u8>, matrix_width: usize, quiet_zone: usize) -> f32 {
    let quiet_zone_px = quiet_zone_pixels(image.width(), matrix_width, quiet_zone);
    let background_luma = luma(background);
    let mut filled = 0usize;
    let mut total = 0usize;

    for y in quiet_zone_px..image.height().saturating_sub(quiet_zone_px) {
        for x in quiet_zone_px..image.width().saturating_sub(quiet_zone_px) {
            total += 1;

            let pixel = image.get_pixel(x, y);
            if luma(*pixel).abs_diff(background_luma) > 24 {
                filled += 1;
            }
        }
    }

    if total == 0 {
        0.0
    } else {
        filled as f32 / total as f32
    }
}

fn quiet_zone_integrity(image: &RgbaImage, background: Rgba<u8>, matrix_width: usize, quiet_zone: usize) -> f32 {
    let quiet_zone_px = quiet_zone_pixels(image.width(), matrix_width, quiet_zone);

    if quiet_zone_px == 0 {
        return 1.0;
    }

    let mut preserved = 0usize;
    let mut total = 0usize;

    for y in 0..image.height() {
        for x in 0..image.width() {
            let in_quiet_zone = x < quiet_zone_px
                || y < quiet_zone_px
                || x >= image.width().saturating_sub(quiet_zone_px)
                || y >= image.height().saturating_sub(quiet_zone_px);

            if !in_quiet_zone {
                continue;
            }

            total += 1;
            if close_to_background(*image.get_pixel(x, y), background) {
                preserved += 1;
            }
        }
    }

    if total == 0 {
        1.0
    } else {
        preserved as f32 / total as f32
    }
}

fn run_simulations(image: &RgbaImage) -> Vec<SimulationResult> {
    let grayscale = image::DynamicImage::ImageRgba8(image.clone()).to_luma8();
    let width = grayscale.width();
    let height = grayscale.height();
    let distant = imageops::resize(
        &grayscale,
        (width / 3).max(48),
        (height / 3).max(48),
        imageops::FilterType::Triangle,
    );
    let distance_reconstruction = imageops::resize(
        &distant,
        width,
        height,
        imageops::FilterType::CatmullRom,
    );
    let low_light = imageops::contrast(&imageops::brighten(&grayscale, -42), -18.0);

    [
        ("baseline", grayscale.clone()),
        ("blur", imageops::blur(&grayscale, 1.4)),
        ("distance", distance_reconstruction),
        ("low_light", low_light),
    ]
    .into_iter()
    .map(|(name, image)| SimulationResult {
        name: name.to_string(),
        passed: decode_gray_image(&image),
    })
    .collect()
}

fn decode_gray_image(image: &GrayImage) -> bool {
    for invert in [false, true] {
        let mut normalized = image.clone();

        if invert {
            imageops::invert(&mut normalized);
        }

        let Some(min) = normalized.pixels().map(|pixel| pixel[0]).min() else {
            return false;
        };
        let Some(max) = normalized.pixels().map(|pixel| pixel[0]).max() else {
            return false;
        };
        let threshold = ((min as u16 + max as u16) / 2) as u8;

        for pixel in normalized.pixels_mut() {
            pixel[0] = if pixel[0] >= threshold { 255 } else { 0 };
        }

        let mut prepared = PreparedImage::prepare(normalized);
        if prepared
            .detect_grids()
            .into_iter()
            .any(|grid| grid.decode().is_ok())
        {
            return true;
        }
    }

    false
}

fn composite_for_validation(image: &RgbaImage, background: Rgba<u8>) -> RgbaImage {
    let mut composited = RgbaImage::new(image.width(), image.height());

    for (x, y, pixel) in image.enumerate_pixels() {
        let alpha = pixel[3] as f32 / 255.0;
        let blend = |source: u8, back: u8| -> u8 {
            (((source as f32) * alpha) + ((back as f32) * (1.0 - alpha))).round() as u8
        };

        composited.put_pixel(
            x,
            y,
            Rgba([
                blend(pixel[0], background[0]),
                blend(pixel[1], background[1]),
                blend(pixel[2], background[2]),
                255,
            ]),
        );
    }

    composited
}

fn quiet_zone_pixels(canvas_size: u32, matrix_width: usize, quiet_zone: usize) -> u32 {
    let total_modules = matrix_width + (quiet_zone * 2);
    ((canvas_size as usize * quiet_zone) / total_modules) as u32
}

fn luma(pixel: Rgba<u8>) -> u8 {
    ((0.2126 * pixel[0] as f32) + (0.7152 * pixel[1] as f32) + (0.0722 * pixel[2] as f32)).round() as u8
}

fn close_to_background(pixel: Rgba<u8>, background: Rgba<u8>) -> bool {
    pixel[0].abs_diff(background[0]) <= 8
        && pixel[1].abs_diff(background[1]) <= 8
        && pixel[2].abs_diff(background[2]) <= 8
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::render::RenderTelemetry;

    #[test]
    fn high_scores_map_to_low_risk() {
        assert_eq!(risk_from_score(0.9, true), RiskLevel::Low);
        assert_eq!(risk_from_score(0.74, true), RiskLevel::Medium);
        assert_eq!(risk_from_score(0.61, true), RiskLevel::High);
        assert_eq!(risk_from_score(0.95, false), RiskLevel::High);
    }

    #[test]
    fn distortion_risk_recommends_safety_bias() {
        let result = ValidationResult {
            score: 0.62,
            risk: RiskLevel::High,
            metrics: ValidationMetrics {
                contrast_ratio: 8.0,
                distortion: 0.28,
                density: 0.24,
                quiet_zone_integrity: 1.0,
                simulation_pass_rate: 0.5,
            },
            simulations: vec![SimulationResult {
                name: "baseline".to_string(),
                passed: false,
            }],
            corrections_applied: Vec::new(),
            suggestions: Vec::new(),
            auto_corrected: false,
        };

        assert_eq!(recommended_safety_bias(&result), Some(0.88));
    }

    #[test]
    fn distortion_metric_uses_telemetry() {
        let telemetry = RenderTelemetry {
            module_count: 120,
            data_module_count: 100,
            strict_module_count: 20,
            average_offset: 0.018,
            max_offset: 0.03,
            average_scale_delta: 0.12,
            max_scale_delta: 0.18,
            average_rotation_degrees: 9.0,
            max_rotation_degrees: 15.0,
            average_importance: 0.72,
        };

        assert!(distortion_severity(&telemetry) > 0.0);
    }
}
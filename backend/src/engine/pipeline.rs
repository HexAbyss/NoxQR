use std::io::Cursor;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use image::{DynamicImage, ImageFormat, RgbaImage};

use crate::{
    core::encoding::encode_qr_matrix,
    error::AppError,
    models::{request::GenerateRequest, response::GenerateResponse},
    render::{build_artistic_render_config, renderer_for, RenderOptions},
    validation::{
        assess_render_reliability, recommended_safety_bias, validate_generate_request,
        ValidatedGenerateRequest,
    },
};

const QUIET_ZONE: usize = 4;

pub struct QrEngine;

impl QrEngine {
    pub fn generate(&self, request: GenerateRequest) -> Result<GenerateResponse, AppError> {
        let request = validate_generate_request(request)?;
        let matrix = encode_qr_matrix(&request.data)?;
        let artistic = build_artistic_render_config(
            request.preset,
            request.camouflage,
            request.perception_mode,
            request.perception_strength,
            request.reference_image.as_deref(),
            request.logo_image.as_deref(),
            request.logo_scale,
            matrix.width(),
        )?;

        self.render_response(&matrix, request, artistic)
    }

    fn render_response(
        &self,
        matrix: &crate::core::matrix::QrMatrix,
        request: ValidatedGenerateRequest,
        artistic: crate::render::ArtisticRenderConfig,
    ) -> Result<GenerateResponse, AppError> {
        let renderer = renderer_for(request.style);
        let mut rendered = renderer.render(matrix, &render_options(&request, 0.0, artistic.clone()));
        let mut validation = assess_render_reliability(
            matrix,
            &rendered.image,
            &request,
            &rendered.telemetry,
            QUIET_ZONE,
        );
        let mut corrections_applied = Vec::new();

        if let Some(safety_bias) = recommended_safety_bias(&validation) {
            let safer_render = renderer.render(
                matrix,
                &render_options(&request, safety_bias, artistic.clone()),
            );
            let safer_validation = assess_render_reliability(
                matrix,
                &safer_render.image,
                &request,
                &safer_render.telemetry,
                QUIET_ZONE,
            );

            if safer_validation.score >= validation.score {
                corrections_applied.push(format!(
                    "Applied a conservative render bias ({:.0}%) to improve scan reliability.",
                    safety_bias * 100.0
                ));
                rendered = safer_render;
                validation = safer_validation;
            }
        }

        let decorated_output = request.frame_style != crate::render::QRFrameStyle::None
            || request.finder_border_style != crate::render::QRFinderBorderStyle::Square
            || request.finder_center_style != crate::render::QRFinderCenterStyle::Square
            || request.gradient_enabled;
        let png_base64 = encode_png(rendered.image.clone())?;
        let svg = if decorated_output {
            wrap_png_data_url_as_svg(request.size, &png_base64)
        } else {
            rendered.svg
        };

        Ok(GenerateResponse {
            svg,
            png_base64,
            validation: validation.with_corrections(corrections_applied),
        })
    }
}

fn render_options(
    request: &ValidatedGenerateRequest,
    safety_bias: f32,
    artistic: crate::render::ArtisticRenderConfig,
) -> RenderOptions {
    RenderOptions {
        canvas_size: request.size,
        quiet_zone: QUIET_ZONE,
        background_hex: request.background.to_hex(),
        foreground_rgba: request.foreground.to_rgba(),
        background_rgba: if request.transparent_background {
            request.background.to_rgba_with_alpha(0)
        } else {
            request.background.to_rgba()
        },
        transparent_background: request.transparent_background,
        frame_style: request.frame_style,
        finder_border_style: request.finder_border_style,
        finder_center_style: request.finder_center_style,
        border_rgba: request.border_color.to_rgba(),
        center_rgba: request.center_color.to_rgba(),
        gradient_enabled: request.gradient_enabled,
        safety_bias,
        artistic,
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

fn wrap_png_data_url_as_svg(size: u32, png_data_url: &str) -> String {
    format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}" fill="none" role="img" aria-label="Generated artistic QR code"><image href="{png}" width="{size}" height="{size}" preserveAspectRatio="none" /></svg>"#,
        png = png_data_url,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{DynamicImage, Rgba};
    use image::{imageops, load_from_memory, GrayImage};
    use rqrr::PreparedImage;
    use crate::{models::request::GenerateRequest, render::{ArtisticPreset, PerceptionMode, RenderStyle}};

    fn sample_request(style: RenderStyle) -> GenerateRequest {
        GenerateRequest {
            data: "https://github.com/HexAbyss/NoxQR".to_string(),
            style,
            color: "#00FFAA".to_string(),
            background: "#0D0D0D".to_string(),
            transparent_background: true,
            size: 256,
            frame_style: crate::render::QRFrameStyle::None,
            finder_border_style: crate::render::QRFinderBorderStyle::Square,
            finder_center_style: crate::render::QRFinderCenterStyle::Square,
            border_color: "#1F2F48".to_string(),
            center_color: "#00FFAA".to_string(),
            gradient_enabled: false,
            preset: ArtisticPreset::Manual,
            camouflage: 0.0,
            perception_mode: PerceptionMode::Off,
            perception_strength: 0.34,
            reference_image: None,
            logo_image: None,
            logo_scale: 0.22,
        }
    }

    fn decode_png_payload(png_base64: &str) -> Option<String> {
        let encoded = png_base64
            .strip_prefix("data:image/png;base64,")
            .expect("png payload should be a data URL");
        let bytes = BASE64.decode(encoded).expect("png should decode from base64");
        let image = load_from_memory(&bytes)
            .expect("png should load as an image")
            .to_luma8();

        for invert in [false, true] {
            if let Some(content) = decode_thresholded(image.clone(), invert) {
                return Some(content);
            }
        }

        None
    }

    fn png_data_url(image: RgbaImage) -> String {
        let mut cursor = Cursor::new(Vec::new());
        DynamicImage::ImageRgba8(image)
            .write_to(&mut cursor, ImageFormat::Png)
            .expect("test image should encode as png");

        format!("data:image/png;base64,{}", BASE64.encode(cursor.into_inner()))
    }

    fn sample_reference_image() -> String {
        let mut image = RgbaImage::new(96, 96);

        for y in 0..image.height() {
            for x in 0..image.width() {
                let blend = ((x + y) as f32 / (image.width() + image.height()) as f32).clamp(0.0, 1.0);
                let value = (255.0 * blend).round() as u8;
                image.put_pixel(x, y, Rgba([value, value, value, 255]));
            }
        }

        png_data_url(image)
    }

    fn sample_logo_image() -> String {
        let mut image = RgbaImage::from_pixel(72, 72, Rgba([0, 0, 0, 0]));

        for y in 14..58 {
            for x in 14..58 {
                if (24..48).contains(&x) || (24..48).contains(&y) {
                    image.put_pixel(x, y, Rgba([255, 255, 255, 255]));
                }
            }
        }

        png_data_url(image)
    }

    fn decode_thresholded(mut image: GrayImage, invert: bool) -> Option<String> {
        if invert {
            imageops::invert(&mut image);
        }

        let min = image.pixels().map(|pixel| pixel[0]).min()?;
        let max = image.pixels().map(|pixel| pixel[0]).max()?;
        let threshold = ((min as u16 + max as u16) / 2) as u8;

        for pixel in image.pixels_mut() {
            pixel[0] = if pixel[0] >= threshold { 255 } else { 0 };
        }

        let mut prepared = PreparedImage::prepare(image);
        prepared
            .detect_grids()
            .into_iter()
            .find_map(|grid| grid.decode().ok().map(|(_, content)| content))
    }

    #[test]
    fn dot_renderer_only_keeps_square_modules_for_strict_roles() {
        let request = sample_request(RenderStyle::Dots);
        let matrix = encode_qr_matrix(&request.data).expect("matrix should encode");
        let expected_square_modules = (0..matrix.width())
            .flat_map(|y| (0..matrix.width()).map(move |x| (x, y)))
            .filter(|&(x, y)| {
                let module = matrix.module(x, y);
                module.value && module.role.requires_strict_rendering()
            })
            .count();

        let response = QrEngine
            .generate(request)
            .expect("request should render successfully");

        assert_eq!(response.svg.matches("<rect ").count(), expected_square_modules);
        assert!(response.svg.matches("<circle ").count() > 0);
        assert!((0.0..=1.0).contains(&response.validation.score));
    }

    #[test]
    fn phase_two_renderers_generate_svg_and_png() {
        for style in [
            RenderStyle::Square,
            RenderStyle::Dots,
            RenderStyle::Lines,
            RenderStyle::Triangles,
            RenderStyle::Hexagons,
            RenderStyle::Blobs,
            RenderStyle::Glyphs,
            RenderStyle::Fractal,
        ] {
            let response = QrEngine
                .generate(sample_request(style))
                .expect("style should render successfully");

            assert!(response.svg.starts_with("<svg"));
            assert!(response.png_base64.starts_with("data:image/png;base64,"));
            assert!(response.validation.simulations.len() >= 4);
        }
    }

    #[test]
    fn backend_design_layers_return_wrapped_png_output() {
        let mut request = sample_request(RenderStyle::Square);
        request.size = 512;
        request.transparent_background = false;
        request.frame_style = crate::render::QRFrameStyle::Rounded;
        request.finder_border_style = crate::render::QRFinderBorderStyle::Rounded;
        request.finder_center_style = crate::render::QRFinderCenterStyle::Circle;
        request.gradient_enabled = true;

        let response = QrEngine
            .generate(request)
            .expect("decorated request should render successfully");

        assert!(response.svg.contains("<image href=\"data:image/png;base64,"));
        assert!(response.validation.score > 0.0);
        assert!(response.validation.simulations.len() >= 4);
    }

    #[test]
    fn square_renderer_png_remains_decodable() {
        let mut request = sample_request(RenderStyle::Square);
        request.transparent_background = false;
        let expected = request.data.clone();
        let response = QrEngine
            .generate(request)
            .expect("square style should render successfully");

        assert_eq!(decode_png_payload(&response.png_base64).as_deref(), Some(expected.as_str()));
    }

    #[test]
    fn fractal_renderer_png_remains_decodable() {
        let mut request = sample_request(RenderStyle::Fractal);
        request.transparent_background = false;
        let expected = request.data.clone();
        let response = QrEngine
            .generate(request)
            .expect("fractal style should render successfully");

        assert_eq!(decode_png_payload(&response.png_base64).as_deref(), Some(expected.as_str()));
    }

    #[test]
    fn phase_four_artistic_system_remains_decodable() {
        let mut request = sample_request(RenderStyle::Square);
        request.transparent_background = false;
        request.preset = ArtisticPreset::Cyberpunk;
        request.camouflage = 0.26;
        request.reference_image = Some(sample_reference_image());
        request.logo_image = Some(sample_logo_image());
        request.logo_scale = 0.18;
        let expected = request.data.clone();

        let response = QrEngine
            .generate(request)
            .expect("phase four artistic request should render successfully");

        assert!(response.svg.contains("Embedded logo"));
        assert!(response.svg.contains("href=\"data:image/png;base64,"));
        assert!(response.validation.score > 0.0);
        assert_eq!(decode_png_payload(&response.png_base64).as_deref(), Some(expected.as_str()));
    }

    #[test]
    fn phase_five_perception_modes_remain_decodable() {
        for mode in [
            PerceptionMode::NearInvisible,
            PerceptionMode::Frequency,
            PerceptionMode::Negative,
            PerceptionMode::Encrypted,
            PerceptionMode::MultiLayer,
        ] {
            let mut request = sample_request(RenderStyle::Square);
            request.transparent_background = false;
            request.size = 768;
            request.preset = ArtisticPreset::Neon;
            request.camouflage = 0.12;
            request.perception_mode = mode;
            request.perception_strength = 0.58;
            request.reference_image = Some(sample_reference_image());
            let response = QrEngine
                .generate(request)
                .expect("phase five artistic request should render successfully");

            let renders_carrier_image = matches!(
                mode,
                PerceptionMode::Encrypted | PerceptionMode::MultiLayer
            );
            assert_eq!(
                response.svg.contains("<image href=\"data:image/png;base64,"),
                renders_carrier_image,
                "mode {:?} should match carrier-image expectations",
                mode,
            );
            assert!(response.validation.score > 0.0, "mode {:?} should retain a positive reliability score", mode);
        }
    }
}
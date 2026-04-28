use std::io::Cursor;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use image::{DynamicImage, ImageFormat, RgbaImage};

use crate::{
    core::encoding::encode_qr_matrix,
    error::AppError,
    models::{request::GenerateRequest, response::GenerateResponse},
    render::{renderer_for, RenderOptions},
    validation::{validate_generate_request, ValidatedGenerateRequest},
};

const QUIET_ZONE: usize = 4;

pub struct QrEngine;

impl QrEngine {
    pub fn generate(&self, request: GenerateRequest) -> Result<GenerateResponse, AppError> {
        let request = validate_generate_request(request)?;
        let matrix = encode_qr_matrix(&request.data)?;

        self.render_response(&matrix, request)
    }

    fn render_response(
        &self,
        matrix: &crate::core::matrix::QrMatrix,
        request: ValidatedGenerateRequest,
    ) -> Result<GenerateResponse, AppError> {
        let renderer = renderer_for(request.style);
        let rendered = renderer.render(
            matrix,
            &RenderOptions {
                canvas_size: request.size,
                quiet_zone: QUIET_ZONE,
                foreground_hex: request.foreground.to_hex(),
                background_hex: request.background.to_hex(),
                foreground_rgba: request.foreground.to_rgba(),
                background_rgba: if request.transparent_background {
                    request.background.to_rgba_with_alpha(0)
                } else {
                    request.background.to_rgba()
                },
                transparent_background: request.transparent_background,
            },
        );

        Ok(GenerateResponse {
            svg: rendered.svg,
            png_base64: encode_png(rendered.image)?,
        })
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

#[cfg(test)]
mod tests {
    use super::*;
    use image::{imageops, load_from_memory, GrayImage};
    use rqrr::PreparedImage;
    use crate::{models::request::GenerateRequest, render::RenderStyle};

    fn sample_request(style: RenderStyle) -> GenerateRequest {
        GenerateRequest {
            data: "https://github.com/HexAbyss/NoxQR".to_string(),
            style,
            color: "#00FFAA".to_string(),
            background: "#0D0D0D".to_string(),
            transparent_background: true,
            size: 256,
        }
    }

    fn decode_png_payload(png_base64: &str) -> String {
        let encoded = png_base64
            .strip_prefix("data:image/png;base64,")
            .expect("png payload should be a data URL");
        let bytes = BASE64.decode(encoded).expect("png should decode from base64");
        let image = load_from_memory(&bytes)
            .expect("png should load as an image")
            .to_luma8();

        for invert in [false, true] {
            if let Some(content) = decode_thresholded(image.clone(), invert) {
                return content;
            }
        }

        panic!("qr should remain decodable")
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
        }
    }

    #[test]
    fn square_renderer_png_remains_decodable() {
        let mut request = sample_request(RenderStyle::Square);
        request.transparent_background = false;
        let expected = request.data.clone();
        let response = QrEngine
            .generate(request)
            .expect("square style should render successfully");

        assert_eq!(decode_png_payload(&response.png_base64), expected);
    }

    #[test]
    fn fractal_renderer_png_remains_decodable() {
        let mut request = sample_request(RenderStyle::Fractal);
        request.transparent_background = false;
        let expected = request.data.clone();
        let response = QrEngine
            .generate(request)
            .expect("fractal style should render successfully");

        assert_eq!(decode_png_payload(&response.png_base64), expected);
    }
}
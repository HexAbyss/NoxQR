use std::io::Cursor;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use image::{DynamicImage, ImageFormat, RgbaImage};

use crate::{
    core::{encoding::encode_qr_matrix, matrix::QrMatrix},
    error::AppError,
    models::{request::GenerateRequest, response::GenerateResponse},
    render::{renderer_for, ModuleKind, RasterModuleGeometry, Renderer, SvgModuleGeometry},
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
        matrix: &QrMatrix,
        request: ValidatedGenerateRequest,
    ) -> Result<GenerateResponse, AppError> {
        let total_modules = matrix.width() + (QUIET_ZONE * 2);
        let styled_renderer = renderer_for(request.style);
        let structural_renderer = crate::render::styles::square::SquareRenderer;
        let foreground_hex = request.foreground.to_hex();
        let background_hex = request.background.to_hex();

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
                request.background.to_rgba_with_alpha(0)
            } else {
                request.background.to_rgba()
            },
        );

        for y in 0..matrix.width() {
            for x in 0..matrix.width() {
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
                renderer.rasterize_module(&mut image, raster_geometry, request.foreground.to_rgba());
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
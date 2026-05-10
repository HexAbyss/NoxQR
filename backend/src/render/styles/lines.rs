use image::{Rgba, RgbaImage};

use crate::render::{fill_rect, RasterModuleGeometry, Renderer, SvgModuleGeometry};

#[derive(Debug, Default)]
pub struct LineRenderer;

impl Renderer for LineRenderer {
    fn render_svg_module(&self, geometry: SvgModuleGeometry, color: &str) -> String {
        let thickness_ratio = 0.26 + (geometry.importance * 0.08);
        let thickness = geometry.scaled_size() * thickness_ratio;
        let radius = thickness / 2.0;
        let (x, y, width, height) = geometry.rect(1.0, thickness_ratio);

        format!(
            r#"<rect x="{x:.4}" y="{y:.4}" width="{width:.4}" height="{height:.4}" rx="{radius:.4}" fill="{color}" />"#,
            x = x,
            y = y,
            width = width,
            height = height,
            radius = radius,
            color = color,
        )
    }

    fn rasterize_module(&self, canvas: &mut RgbaImage, geometry: RasterModuleGeometry, color: Rgba<u8>) {
        let thickness_ratio = 0.26 + (geometry.importance * 0.08);
        let (x0, y0, x1, y1) = geometry.rect_bounds(1.0, thickness_ratio);
        fill_rect(canvas, x0, y0, x1, y1, color);
    }
}
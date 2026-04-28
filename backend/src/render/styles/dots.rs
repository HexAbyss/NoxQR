use image::{Rgba, RgbaImage};

use crate::render::{fill_circle, RasterModuleGeometry, Renderer, SvgModuleGeometry};

#[derive(Debug, Default)]
pub struct DotRenderer;

impl Renderer for DotRenderer {
    fn render_svg_module(&self, geometry: SvgModuleGeometry, color: &str) -> String {
        let radius = geometry.size * 0.38;

        format!(
            r#"<circle cx="{cx:.4}" cy="{cy:.4}" r="{radius:.4}" fill="{color}" />"#,
            cx = geometry.x + (geometry.size / 2.0),
            cy = geometry.y + (geometry.size / 2.0),
            radius = radius,
            color = color,
        )
    }

    fn rasterize_module(&self, canvas: &mut RgbaImage, geometry: RasterModuleGeometry, color: Rgba<u8>) {
        let radius = ((geometry.width().min(geometry.height()) as f32) * 0.38).round() as i32;
        let center_x = geometry.x0 as i32 + (geometry.width() as i32 / 2);
        let center_y = geometry.y0 as i32 + (geometry.height() as i32 / 2);

        fill_circle(canvas, center_x, center_y, radius, color);
    }
}
use image::{Rgba, RgbaImage};

use crate::render::{expressive_transform, fill_circle, ModuleTransform, RasterModuleGeometry, Renderer, SvgModuleGeometry};

#[derive(Debug, Default)]
pub struct DotRenderer;

impl Renderer for DotRenderer {
    fn module_transform(&self, geometry: SvgModuleGeometry, matrix_width: usize) -> ModuleTransform {
        expressive_transform(
            geometry.cell_x,
            geometry.cell_y,
            matrix_width,
            geometry.importance,
            0.045,
            0.74,
            0.92,
            0.0,
        )
    }

    fn render_svg_module(&self, geometry: SvgModuleGeometry, color: &str) -> String {
        let radius = geometry.scaled_size() * (0.24 + (geometry.importance * 0.18));
        let (center_x, center_y) = geometry.center();

        format!(
            r#"<circle cx="{cx:.4}" cy="{cy:.4}" r="{radius:.4}" fill="{color}" />"#,
            cx = center_x,
            cy = center_y,
            radius = radius,
            color = color,
        )
    }

    fn rasterize_module(&self, canvas: &mut RgbaImage, geometry: RasterModuleGeometry, color: Rgba<u8>) {
        let radius = (geometry.scaled_size() * (0.24 + (geometry.importance * 0.18))).round() as i32;
        let (center_x, center_y) = geometry.center();

        fill_circle(canvas, center_x.round() as i32, center_y.round() as i32, radius, color);
    }
}
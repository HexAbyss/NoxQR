use image::{Rgba, RgbaImage};

use crate::render::{
    expressive_transform, fill_polygon, svg_polygon, ModuleTransform, RasterModuleGeometry,
    Renderer, SvgModuleGeometry,
};

#[derive(Debug, Default)]
pub struct TriangleRenderer;

impl Renderer for TriangleRenderer {
    fn module_transform(&self, geometry: SvgModuleGeometry, matrix_width: usize) -> ModuleTransform {
        let rotation_bias = if ((geometry.cell_x + geometry.cell_y) % 2) == 0 {
            -90.0
        } else {
            90.0
        };

        expressive_transform(
            geometry.cell_x,
            geometry.cell_y,
            matrix_width,
            geometry.importance,
            0.04,
            0.74,
            0.90,
            rotation_bias,
        )
    }

    fn render_svg_module(&self, geometry: SvgModuleGeometry, color: &str) -> String {
        svg_polygon(&geometry.regular_polygon(3, 0.38 + (geometry.importance * 0.08), -90.0), color)
    }

    fn rasterize_module(&self, canvas: &mut RgbaImage, geometry: RasterModuleGeometry, color: Rgba<u8>) {
        fill_polygon(
            canvas,
            &geometry.regular_polygon(3, 0.38 + (geometry.importance * 0.08), -90.0),
            color,
        );
    }
}
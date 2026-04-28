use image::{Rgba, RgbaImage};

use crate::render::{
    expressive_transform, fill_polygon, svg_polygon, ModuleTransform, RasterModuleGeometry,
    Renderer, SvgModuleGeometry,
};

#[derive(Debug, Default)]
pub struct HexagonRenderer;

impl Renderer for HexagonRenderer {
    fn module_transform(&self, geometry: SvgModuleGeometry, matrix_width: usize) -> ModuleTransform {
        expressive_transform(
            geometry.cell_x,
            geometry.cell_y,
            matrix_width,
            geometry.importance,
            0.03,
            0.76,
            0.92,
            30.0,
        )
    }

    fn render_svg_module(&self, geometry: SvgModuleGeometry, color: &str) -> String {
        svg_polygon(&geometry.regular_polygon(6, 0.34 + (geometry.importance * 0.08), 30.0), color)
    }

    fn rasterize_module(&self, canvas: &mut RgbaImage, geometry: RasterModuleGeometry, color: Rgba<u8>) {
        fill_polygon(
            canvas,
            &geometry.regular_polygon(6, 0.34 + (geometry.importance * 0.08), 30.0),
            color,
        );
    }
}
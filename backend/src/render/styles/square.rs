use image::{Rgba, RgbaImage};

use crate::render::{expressive_transform, fill_rect, ModuleTransform, RasterModuleGeometry, Renderer, SvgModuleGeometry};

#[derive(Debug, Default)]
pub struct SquareRenderer;

impl Renderer for SquareRenderer {
    fn module_transform(&self, geometry: SvgModuleGeometry, matrix_width: usize) -> ModuleTransform {
        expressive_transform(
            geometry.cell_x,
            geometry.cell_y,
            matrix_width,
            geometry.importance,
            0.018,
            0.88,
            0.98,
            0.0,
        )
    }

    fn render_svg_module(&self, geometry: SvgModuleGeometry, color: &str) -> String {
        let size_ratio = if geometry.role.requires_strict_rendering() {
            1.0
        } else {
            0.76 + (geometry.importance * 0.22)
        };
        let radius = if geometry.role.requires_strict_rendering() {
            0.0
        } else {
            geometry.scaled_size() * 0.16
        };
        let (x, y, width, height) = geometry.rect(size_ratio, size_ratio);

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
        let size_ratio = if geometry.role.requires_strict_rendering() {
            1.0
        } else {
            0.76 + (geometry.importance * 0.22)
        };
        let (x0, y0, x1, y1) = geometry.rect_bounds(size_ratio, size_ratio);

        fill_rect(canvas, x0, y0, x1, y1, color);
    }
}
use image::{Rgba, RgbaImage};

use crate::render::{
    expressive_transform, fill_rect, ModuleTransform, RasterModuleGeometry, Renderer,
    SvgModuleGeometry,
};

fn glyph_rects_svg(geometry: SvgModuleGeometry) -> [(f32, f32, f32, f32); 2] {
    let thickness = 0.16 + (geometry.importance * 0.08);
    [geometry.rect(0.76, thickness), geometry.rect(thickness, 0.76)]
}

fn glyph_rects_raster(geometry: RasterModuleGeometry) -> [(u32, u32, u32, u32); 2] {
    let thickness = 0.16 + (geometry.importance * 0.08);
    [geometry.rect_bounds(0.76, thickness), geometry.rect_bounds(thickness, 0.76)]
}

#[derive(Debug, Default)]
pub struct GlyphRenderer;

impl Renderer for GlyphRenderer {
    fn module_transform(&self, geometry: SvgModuleGeometry, matrix_width: usize) -> ModuleTransform {
        expressive_transform(
            geometry.cell_x,
            geometry.cell_y,
            matrix_width,
            geometry.importance,
            0.028,
            0.74,
            0.90,
            0.0,
        )
    }

    fn render_svg_module(&self, geometry: SvgModuleGeometry, color: &str) -> String {
        glyph_rects_svg(geometry)
            .into_iter()
            .map(|(x, y, width, height)| {
                format!(
                    r#"<rect x="{x:.4}" y="{y:.4}" width="{width:.4}" height="{height:.4}" rx="{radius:.4}" fill="{color}" />"#,
                    x = x,
                    y = y,
                    width = width,
                    height = height,
                    radius = width.min(height) / 2.0,
                    color = color,
                )
            })
            .collect::<Vec<_>>()
            .join("")
    }

    fn rasterize_module(&self, canvas: &mut RgbaImage, geometry: RasterModuleGeometry, color: Rgba<u8>) {
        for (x0, y0, x1, y1) in glyph_rects_raster(geometry) {
            fill_rect(canvas, x0, y0, x1, y1, color);
        }
    }
}
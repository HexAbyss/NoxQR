use image::{Rgba, RgbaImage};

use crate::render::{
    expressive_transform, fill_circle, modulation_seed, ModuleTransform, RasterModuleGeometry,
    Renderer, SvgModuleGeometry,
};

fn svg_blob_circles(geometry: SvgModuleGeometry) -> Vec<(f32, f32, f32)> {
    let seed = modulation_seed(geometry.cell_x, geometry.cell_y);
    let size = geometry.scaled_size();
    let (center_x, center_y) = geometry.center();
    let spread = size * 0.17;
    let sway = seed * size * 0.05;
    let major = size * (0.18 + (geometry.importance * 0.04));
    let minor = size * (0.14 + (geometry.importance * 0.03));

    vec![
        (center_x - spread, center_y - (spread * 0.3), major),
        (center_x + (spread * 0.55) + (sway * 0.2), center_y - (spread * 0.75), minor),
        (center_x + (spread * 0.75), center_y + (spread * 0.4), major * 0.92),
        (center_x - (spread * 0.35), center_y + (spread * 0.78) - (sway * 0.25), minor * 1.08),
    ]
}

fn raster_blob_circles(geometry: RasterModuleGeometry) -> Vec<(f32, f32, f32)> {
    let seed = modulation_seed(geometry.cell_x, geometry.cell_y);
    let size = geometry.scaled_size();
    let (center_x, center_y) = geometry.center();
    let spread = size * 0.17;
    let sway = seed * size * 0.05;
    let major = size * (0.18 + (geometry.importance * 0.04));
    let minor = size * (0.14 + (geometry.importance * 0.03));

    vec![
        (center_x - spread, center_y - (spread * 0.3), major),
        (center_x + (spread * 0.55) + (sway * 0.2), center_y - (spread * 0.75), minor),
        (center_x + (spread * 0.75), center_y + (spread * 0.4), major * 0.92),
        (center_x - (spread * 0.35), center_y + (spread * 0.78) - (sway * 0.25), minor * 1.08),
    ]
}

#[derive(Debug, Default)]
pub struct BlobRenderer;

impl Renderer for BlobRenderer {
    fn module_transform(&self, geometry: SvgModuleGeometry, matrix_width: usize) -> ModuleTransform {
        expressive_transform(
            geometry.cell_x,
            geometry.cell_y,
            matrix_width,
            geometry.importance,
            0.05,
            0.72,
            0.88,
            0.0,
        )
    }

    fn render_svg_module(&self, geometry: SvgModuleGeometry, color: &str) -> String {
        svg_blob_circles(geometry)
            .into_iter()
            .map(|(center_x, center_y, radius)| {
                format!(
                    r#"<circle cx="{cx:.4}" cy="{cy:.4}" r="{radius:.4}" fill="{color}" />"#,
                    cx = center_x,
                    cy = center_y,
                    radius = radius,
                    color = color,
                )
            })
            .collect::<Vec<_>>()
            .join("")
    }

    fn rasterize_module(&self, canvas: &mut RgbaImage, geometry: RasterModuleGeometry, color: Rgba<u8>) {
        for (center_x, center_y, radius) in raster_blob_circles(geometry) {
            fill_circle(
                canvas,
                center_x.round() as i32,
                center_y.round() as i32,
                radius.round() as i32,
                color,
            );
        }
    }
}
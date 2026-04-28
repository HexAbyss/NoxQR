use image::{Rgba, RgbaImage};

use crate::render::{fill_rect, RasterModuleGeometry, Renderer, SvgModuleGeometry};

#[derive(Debug, Default)]
pub struct LineRenderer;

impl Renderer for LineRenderer {
    fn render_svg_module(&self, geometry: SvgModuleGeometry, color: &str) -> String {
        let is_horizontal = ((geometry.cell_x + geometry.cell_y) % 2) == 0;
        let padding = geometry.size * 0.06;
        let thickness = geometry.size * 0.40;
        let length = geometry.size - (padding * 2.0);
        let radius = thickness / 2.0;
        let x = geometry.x + if is_horizontal { padding } else { (geometry.size - thickness) / 2.0 };
        let y = geometry.y + if is_horizontal { (geometry.size - thickness) / 2.0 } else { padding };
        let width = if is_horizontal { length } else { thickness };
        let height = if is_horizontal { thickness } else { length };

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
        let is_horizontal = ((geometry.cell_x + geometry.cell_y) % 2) == 0;
        let padding = geometry.width().min(geometry.height()) / 16;
        let thickness = ((geometry.width().min(geometry.height()) as f32) * 0.40).round() as u32;

        if is_horizontal {
            let y0 = geometry.y0 + ((geometry.height().saturating_sub(thickness)) / 2);
            fill_rect(
                canvas,
                geometry.x0.saturating_add(padding),
                y0,
                geometry.x1.saturating_sub(padding),
                y0.saturating_add(thickness),
                color,
            );
        } else {
            let x0 = geometry.x0 + ((geometry.width().saturating_sub(thickness)) / 2);
            fill_rect(
                canvas,
                x0,
                geometry.y0.saturating_add(padding),
                x0.saturating_add(thickness),
                geometry.y1.saturating_sub(padding),
                color,
            );
        }
    }
}
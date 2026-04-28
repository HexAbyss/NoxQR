use image::{Rgba, RgbaImage};

use crate::services::renderer::{fill_rect, ModuleKind, RasterModuleGeometry, Renderer, SvgModuleGeometry};

#[derive(Debug, Default)]
pub struct SquareRenderer;

impl Renderer for SquareRenderer {
    fn render_svg_module(&self, geometry: SvgModuleGeometry, color: &str) -> String {
        let padding = match geometry.kind {
            ModuleKind::Structural => 0.0,
            ModuleKind::Data => geometry.size * 0.08,
        };
        let radius = match geometry.kind {
            ModuleKind::Structural => 0.0,
            ModuleKind::Data => geometry.size * 0.18,
        };
        let size = (geometry.size - (padding * 2.0)).max(0.0);

        format!(
            r#"<rect x="{x:.4}" y="{y:.4}" width="{size:.4}" height="{size:.4}" rx="{radius:.4}" fill="{color}" />"#,
            x = geometry.x + padding,
            y = geometry.y + padding,
            size = size,
            radius = radius,
            color = color,
        )
    }

    fn rasterize_module(&self, canvas: &mut RgbaImage, geometry: RasterModuleGeometry, color: Rgba<u8>) {
        let padding = match geometry.kind {
            ModuleKind::Structural => 0,
            ModuleKind::Data => geometry.width().min(geometry.height()) / 10,
        };
        let x0 = geometry.x0.saturating_add(padding);
        let y0 = geometry.y0.saturating_add(padding);
        let x1 = geometry.x1.saturating_sub(padding);
        let y1 = geometry.y1.saturating_sub(padding);

        fill_rect(canvas, x0, y0, x1, y1, color);
    }
}

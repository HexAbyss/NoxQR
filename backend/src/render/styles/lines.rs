use image::{Rgba, RgbaImage};

use crate::render::{
    expressive_transform, fill_polygon, fill_rect, svg_polygon, ModuleTransform,
    RasterModuleGeometry, Renderer, SvgModuleGeometry,
};

#[derive(Debug, Clone, Copy)]
enum LineVariant {
    Horizontal,
    Vertical,
    DiagonalAsc,
    DiagonalDesc,
}

fn line_variant(cell_x: usize, cell_y: usize) -> LineVariant {
    match (cell_x + cell_y) % 4 {
        0 => LineVariant::Horizontal,
        1 => LineVariant::Vertical,
        2 => LineVariant::DiagonalDesc,
        _ => LineVariant::DiagonalAsc,
    }
}

fn diagonal_points(center_x: f32, center_y: f32, half_length: f32, thickness: f32, ascending: bool) -> Vec<(f32, f32)> {
    let (direction_x, direction_y) = if ascending {
        (1.0_f32, -1.0_f32)
    } else {
        (1.0_f32, 1.0_f32)
    };
    let norm = (direction_x * direction_x + direction_y * direction_y).sqrt();
    let unit_x = direction_x / norm;
    let unit_y = direction_y / norm;
    let perpendicular_x = -unit_y * (thickness / 2.0);
    let perpendicular_y = unit_x * (thickness / 2.0);
    let extension_x = unit_x * half_length;
    let extension_y = unit_y * half_length;
    let start_x = center_x - extension_x;
    let start_y = center_y - extension_y;
    let end_x = center_x + extension_x;
    let end_y = center_y + extension_y;

    vec![
        (start_x + perpendicular_x, start_y + perpendicular_y),
        (end_x + perpendicular_x, end_y + perpendicular_y),
        (end_x - perpendicular_x, end_y - perpendicular_y),
        (start_x - perpendicular_x, start_y - perpendicular_y),
    ]
}

#[derive(Debug, Default)]
pub struct LineRenderer;

impl Renderer for LineRenderer {
    fn module_transform(&self, geometry: SvgModuleGeometry, matrix_width: usize) -> ModuleTransform {
        let rotation_bias = match line_variant(geometry.cell_x, geometry.cell_y) {
            LineVariant::Horizontal | LineVariant::Vertical => 0.0,
            LineVariant::DiagonalAsc => -10.0,
            LineVariant::DiagonalDesc => 10.0,
        };

        expressive_transform(
            geometry.cell_x,
            geometry.cell_y,
            matrix_width,
            geometry.importance,
            0.03,
            0.80,
            0.96,
            rotation_bias,
        )
    }

    fn render_svg_module(&self, geometry: SvgModuleGeometry, color: &str) -> String {
        let variant = line_variant(geometry.cell_x, geometry.cell_y);
        let thickness = geometry.scaled_size() * (0.16 + (geometry.importance * 0.12));
        let length = geometry.scaled_size() * 0.90;
        let radius = thickness / 2.0;
        let (center_x, center_y) = geometry.center();

        match variant {
            LineVariant::Horizontal => {
                let (x, y, width, height) = geometry.rect(0.90, 0.16 + (geometry.importance * 0.12));
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
            LineVariant::Vertical => {
                let (x, y, width, height) = geometry.rect(0.16 + (geometry.importance * 0.12), 0.90);
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
            LineVariant::DiagonalAsc => svg_polygon(
                &diagonal_points(center_x, center_y, length / 2.0, thickness, true),
                color,
            ),
            LineVariant::DiagonalDesc => svg_polygon(
                &diagonal_points(center_x, center_y, length / 2.0, thickness, false),
                color,
            ),
        }
    }

    fn rasterize_module(&self, canvas: &mut RgbaImage, geometry: RasterModuleGeometry, color: Rgba<u8>) {
        let variant = line_variant(geometry.cell_x, geometry.cell_y);
        let thickness_ratio = 0.16 + (geometry.importance * 0.12);
        let thickness = geometry.scaled_size() * thickness_ratio;
        let length = geometry.scaled_size() * 0.90;

        match variant {
            LineVariant::Horizontal => {
                let (x0, y0, x1, y1) = geometry.rect_bounds(0.90, thickness_ratio);
                fill_rect(canvas, x0, y0, x1, y1, color);
            }
            LineVariant::Vertical => {
                let (x0, y0, x1, y1) = geometry.rect_bounds(thickness_ratio, 0.90);
                fill_rect(canvas, x0, y0, x1, y1, color);
            }
            LineVariant::DiagonalAsc => {
                let (center_x, center_y) = geometry.center();
                fill_polygon(
                    canvas,
                    &diagonal_points(center_x, center_y, length / 2.0, thickness, true),
                    color,
                );
            }
            LineVariant::DiagonalDesc => {
                let (center_x, center_y) = geometry.center();
                fill_polygon(
                    canvas,
                    &diagonal_points(center_x, center_y, length / 2.0, thickness, false),
                    color,
                );
            }
        }
    }
}
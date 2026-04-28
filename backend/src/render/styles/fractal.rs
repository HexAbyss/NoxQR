use image::{Rgba, RgbaImage};

use crate::render::{
    fill_circle, fill_rect, ModuleTransform, RasterModuleGeometry, Renderer, SvgModuleGeometry,
};

fn fractal_offsets() -> [(f32, f32); 4] {
    [(-1.0, -1.0), (1.0, -1.0), (-1.0, 1.0), (1.0, 1.0)]
}

fn fractal_layout(size: f32, importance: f32) -> (f32, f32, f32) {
    let core_size = size * (0.70 + (importance * 0.06));
    let satellite_size = size * (0.08 + (importance * 0.02));
    let orbit = size * 0.22;

    (core_size, satellite_size, orbit)
}

fn circle_cluster_svg(geometry: SvgModuleGeometry) -> Vec<(f32, f32, f32)> {
    let size = geometry.scaled_size();
    let (center_x, center_y) = geometry.center();
    let (core_size, satellite_size, orbit) = fractal_layout(size, geometry.importance);
    let core_radius = core_size / 2.0;
    let satellite_radius = satellite_size / 2.0;
    let mut circles = Vec::with_capacity(5);

    circles.push((center_x, center_y, core_radius));
    circles.extend(
        fractal_offsets()
            .into_iter()
            .map(|(offset_x, offset_y)| {
                (
                    center_x + (offset_x * orbit),
                    center_y + (offset_y * orbit),
                    satellite_radius,
                )
            }),
    );

    circles
}

fn circle_cluster_raster(geometry: RasterModuleGeometry) -> Vec<(f32, f32, f32)> {
    let size = geometry.scaled_size();
    let (center_x, center_y) = geometry.center();
    let (core_size, satellite_size, orbit) = fractal_layout(size, geometry.importance);
    let core_radius = core_size / 2.0;
    let satellite_radius = satellite_size / 2.0;
    let mut circles = Vec::with_capacity(5);

    circles.push((center_x, center_y, core_radius));
    circles.extend(
        fractal_offsets()
            .into_iter()
            .map(|(offset_x, offset_y)| {
                (
                    center_x + (offset_x * orbit),
                    center_y + (offset_y * orbit),
                    satellite_radius,
                )
            }),
    );

    circles
}

fn rect_cluster_svg(geometry: SvgModuleGeometry) -> Vec<(f32, f32, f32, f32, f32)> {
    let size = geometry.scaled_size();
    let (center_x, center_y) = geometry.center();
    let (core_size, satellite_size, orbit) = fractal_layout(size, geometry.importance);
    let radius = satellite_size * 0.18;
    let mut rects = Vec::with_capacity(5);

    rects.push((
        center_x - (core_size / 2.0),
        center_y - (core_size / 2.0),
        core_size,
        core_size,
        core_size * 0.16,
    ));
    rects.extend(
        fractal_offsets()
            .into_iter()
            .map(|(offset_x, offset_y)| {
                let x = center_x + (offset_x * orbit) - (satellite_size / 2.0);
                let y = center_y + (offset_y * orbit) - (satellite_size / 2.0);

                (x, y, satellite_size, satellite_size, radius)
            }),
    );

    rects
}

fn rect_cluster_raster(geometry: RasterModuleGeometry) -> Vec<(u32, u32, u32, u32)> {
    let size = geometry.scaled_size();
    let (center_x, center_y) = geometry.center();
    let (core_size, satellite_size, orbit) = fractal_layout(size, geometry.importance);
    let bounds = |center_x: f32, center_y: f32, side: f32| {
        (
            (center_x - (side / 2.0)).floor().max(geometry.x0 as f32) as u32,
            (center_y - (side / 2.0)).floor().max(geometry.y0 as f32) as u32,
            (center_x + (side / 2.0)).ceil().min(geometry.x1 as f32) as u32,
            (center_y + (side / 2.0)).ceil().min(geometry.y1 as f32) as u32,
        )
    };
    let mut rects = Vec::with_capacity(5);

    rects.push(bounds(center_x, center_y, core_size));
    rects.extend(fractal_offsets().into_iter().map(|(offset_x, offset_y)| {
        bounds(
            center_x + (offset_x * orbit),
            center_y + (offset_y * orbit),
            satellite_size,
        )
    }));

    rects
}

#[derive(Debug, Default)]
pub struct FractalRenderer;

impl Renderer for FractalRenderer {
    fn prefers_strict_rendering(&self, role: crate::core::matrix::ModuleRole) -> bool {
        !matches!(role, crate::core::matrix::ModuleRole::Data)
    }

    fn module_transform(&self, geometry: SvgModuleGeometry, matrix_width: usize) -> ModuleTransform {
        let _ = (geometry, matrix_width);

        ModuleTransform::default()
    }

    fn render_svg_module(&self, geometry: SvgModuleGeometry, color: &str) -> String {
        let circle_mode = ((geometry.cell_x + geometry.cell_y) % 2) == 0;

        if circle_mode {
            circle_cluster_svg(geometry)
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
        } else {
            rect_cluster_svg(geometry)
                .into_iter()
                .map(|(x, y, width, height, radius)| {
                    format!(
                        r#"<rect x="{x:.4}" y="{y:.4}" width="{width:.4}" height="{height:.4}" rx="{radius:.4}" fill="{color}" />"#,
                        x = x,
                        y = y,
                        width = width,
                        height = height,
                        radius = radius,
                        color = color,
                    )
                })
                .collect::<Vec<_>>()
                .join("")
        }
    }

    fn rasterize_module(&self, canvas: &mut RgbaImage, geometry: RasterModuleGeometry, color: Rgba<u8>) {
        let circle_mode = ((geometry.cell_x + geometry.cell_y) % 2) == 0;

        if circle_mode {
            for (center_x, center_y, radius) in circle_cluster_raster(geometry) {
                fill_circle(
                    canvas,
                    center_x.round() as i32,
                    center_y.round() as i32,
                    radius.round() as i32,
                    color,
                );
            }
        } else {
            for (x0, y0, x1, y1) in rect_cluster_raster(geometry) {
                fill_rect(
                    canvas,
                    x0,
                    y0,
                    x1,
                    y1,
                    color,
                );
            }
        }
    }
}
use std::f32::consts::PI;

use image::{Rgba, RgbaImage};
use serde::{Deserialize, Serialize};

use crate::core::matrix::{Module, ModuleRole, QrMatrix};

#[derive(Debug, Clone, Copy, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RenderStyle {
    #[default]
    Square,
    Dots,
    Lines,
    Triangles,
    Hexagons,
    Blobs,
    Glyphs,
    Fractal,
}

#[derive(Debug, Clone)]
pub struct RenderOptions {
    pub canvas_size: u32,
    pub quiet_zone: usize,
    pub foreground_hex: String,
    pub background_hex: String,
    pub foreground_rgba: Rgba<u8>,
    pub background_rgba: Rgba<u8>,
    pub transparent_background: bool,
    pub safety_bias: f32,
}

#[derive(Debug)]
pub struct RenderOutput {
    pub svg: String,
    pub image: RgbaImage,
    pub telemetry: RenderTelemetry,
}

#[derive(Debug, Clone, Copy, Default)]
pub struct RenderTelemetry {
    pub module_count: usize,
    pub data_module_count: usize,
    pub strict_module_count: usize,
    pub average_offset: f32,
    pub max_offset: f32,
    pub average_scale_delta: f32,
    pub max_scale_delta: f32,
    pub average_rotation_degrees: f32,
    pub max_rotation_degrees: f32,
    pub average_importance: f32,
}

#[derive(Debug, Default)]
struct RenderTelemetryAccumulator {
    module_count: usize,
    data_module_count: usize,
    strict_module_count: usize,
    offset_sum: f32,
    max_offset: f32,
    scale_delta_sum: f32,
    max_scale_delta: f32,
    rotation_sum: f32,
    max_rotation: f32,
    importance_sum: f32,
}

#[derive(Debug, Clone, Copy)]
pub struct ModuleTransform {
    pub offset_x: f32,
    pub offset_y: f32,
    pub scale: f32,
    pub rotation_degrees: f32,
}

impl Default for ModuleTransform {
    fn default() -> Self {
        Self {
            offset_x: 0.0,
            offset_y: 0.0,
            scale: 1.0,
            rotation_degrees: 0.0,
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub struct SvgModuleGeometry {
    pub cell_x: usize,
    pub cell_y: usize,
    pub x: f32,
    pub y: f32,
    pub size: f32,
    pub role: ModuleRole,
    pub importance: f32,
    pub transform: ModuleTransform,
}

#[derive(Debug, Clone, Copy)]
pub struct RasterModuleGeometry {
    pub cell_x: usize,
    pub cell_y: usize,
    pub x0: u32,
    pub y0: u32,
    pub x1: u32,
    pub y1: u32,
    pub role: ModuleRole,
    pub importance: f32,
    pub transform: ModuleTransform,
}

impl SvgModuleGeometry {
    pub fn center(self) -> (f32, f32) {
        (
            self.x + (self.size / 2.0) + (self.transform.offset_x * self.size),
            self.y + (self.size / 2.0) + (self.transform.offset_y * self.size),
        )
    }

    pub fn scaled_size(self) -> f32 {
        self.size * self.transform.scale.max(0.0)
    }

    pub fn rect(self, width_ratio: f32, height_ratio: f32) -> (f32, f32, f32, f32) {
        let width = self.scaled_size() * width_ratio.clamp(0.0, 1.0);
        let height = self.scaled_size() * height_ratio.clamp(0.0, 1.0);
        let (center_x, center_y) = self.center();

        (
            center_x - (width / 2.0),
            center_y - (height / 2.0),
            width,
            height,
        )
    }

    pub fn regular_polygon(
        self,
        sides: usize,
        radius_ratio: f32,
        rotation_offset_degrees: f32,
    ) -> Vec<(f32, f32)> {
        if sides < 3 {
            return Vec::new();
        }

        let radius = self.scaled_size() * radius_ratio.max(0.0);
        let (center_x, center_y) = self.center();
        let rotation = (self.transform.rotation_degrees + rotation_offset_degrees).to_radians();

        (0..sides)
            .map(|index| {
                let angle = rotation + ((index as f32) * ((2.0 * PI) / (sides as f32)));
                (
                    center_x + (radius * angle.cos()),
                    center_y + (radius * angle.sin()),
                )
            })
            .collect()
    }
}

impl RasterModuleGeometry {
    pub fn width(self) -> u32 {
        self.x1.saturating_sub(self.x0)
    }

    pub fn height(self) -> u32 {
        self.y1.saturating_sub(self.y0)
    }

    pub fn center(self) -> (f32, f32) {
        (
            ((self.x0 + self.x1) as f32 / 2.0) + (self.transform.offset_x * self.width() as f32),
            ((self.y0 + self.y1) as f32 / 2.0) + (self.transform.offset_y * self.height() as f32),
        )
    }

    pub fn scaled_size(self) -> f32 {
        (self.width().min(self.height()) as f32) * self.transform.scale.max(0.0)
    }

    pub fn rect_bounds(self, width_ratio: f32, height_ratio: f32) -> (u32, u32, u32, u32) {
        let width = self.scaled_size() * width_ratio.clamp(0.0, 1.0);
        let height = self.scaled_size() * height_ratio.clamp(0.0, 1.0);
        let (center_x, center_y) = self.center();
        let max_x = self.x1.saturating_sub(1) as f32;
        let max_y = self.y1.saturating_sub(1) as f32;
        let x0 = (center_x - (width / 2.0)).floor().max(self.x0 as f32).min(max_x) as u32;
        let y0 = (center_y - (height / 2.0)).floor().max(self.y0 as f32).min(max_y) as u32;
        let x1 = (center_x + (width / 2.0)).ceil().max(self.x0 as f32).min(self.x1 as f32) as u32;
        let y1 = (center_y + (height / 2.0)).ceil().max(self.y0 as f32).min(self.y1 as f32) as u32;

        (x0, y0, x1, y1)
    }

    pub fn regular_polygon(
        self,
        sides: usize,
        radius_ratio: f32,
        rotation_offset_degrees: f32,
    ) -> Vec<(f32, f32)> {
        if sides < 3 {
            return Vec::new();
        }

        let radius = self.scaled_size() * radius_ratio.max(0.0);
        let (center_x, center_y) = self.center();
        let rotation = (self.transform.rotation_degrees + rotation_offset_degrees).to_radians();

        (0..sides)
            .map(|index| {
                let angle = rotation + ((index as f32) * ((2.0 * PI) / (sides as f32)));
                (
                    center_x + (radius * angle.cos()),
                    center_y + (radius * angle.sin()),
                )
            })
            .collect()
    }
}

pub trait Renderer: Send + Sync {
    fn render(&self, matrix: &QrMatrix, options: &RenderOptions) -> RenderOutput {
        render_matrix(self, matrix, options)
    }

    fn prefers_strict_rendering(&self, role: ModuleRole) -> bool {
        role.requires_strict_rendering()
    }

    fn module_transform(&self, _geometry: SvgModuleGeometry, _matrix_width: usize) -> ModuleTransform {
        ModuleTransform::default()
    }

    fn render_svg_module(&self, geometry: SvgModuleGeometry, color: &str) -> String;

    fn rasterize_module(&self, canvas: &mut RgbaImage, geometry: RasterModuleGeometry, color: Rgba<u8>);
}

impl RenderTelemetryAccumulator {
    fn record(&mut self, role: ModuleRole, transform: ModuleTransform, importance: f32) {
        self.module_count += 1;
        self.importance_sum += importance;

        if role == ModuleRole::Data {
            self.data_module_count += 1;
        } else {
            self.strict_module_count += 1;
        }

        let offset = (transform.offset_x.mul_add(transform.offset_x, transform.offset_y * transform.offset_y)).sqrt();
        let scale_delta = (1.0 - transform.scale).abs();
        let rotation = transform.rotation_degrees.abs();

        self.offset_sum += offset;
        self.max_offset = self.max_offset.max(offset);
        self.scale_delta_sum += scale_delta;
        self.max_scale_delta = self.max_scale_delta.max(scale_delta);
        self.rotation_sum += rotation;
        self.max_rotation = self.max_rotation.max(rotation);
    }

    fn finish(self) -> RenderTelemetry {
        if self.module_count == 0 {
            return RenderTelemetry::default();
        }

        let module_count = self.module_count as f32;

        RenderTelemetry {
            module_count: self.module_count,
            data_module_count: self.data_module_count,
            strict_module_count: self.strict_module_count,
            average_offset: self.offset_sum / module_count,
            max_offset: self.max_offset,
            average_scale_delta: self.scale_delta_sum / module_count,
            max_scale_delta: self.max_scale_delta,
            average_rotation_degrees: self.rotation_sum / module_count,
            max_rotation_degrees: self.max_rotation,
            average_importance: self.importance_sum / module_count,
        }
    }
}

fn render_matrix<R: Renderer + ?Sized>(renderer: &R, matrix: &QrMatrix, options: &RenderOptions) -> RenderOutput {
    let _quiet_zone = Module::quiet_zone();
    let total_modules = matrix.width() + (options.quiet_zone * 2);
    let strict_renderer = crate::render::styles::square::SquareRenderer;
    let mut telemetry = RenderTelemetryAccumulator::default();
    let mut svg = String::with_capacity(total_modules * total_modules * 48);
    svg.push_str(&format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {view_box} {view_box}" fill="none" role="img" aria-label="Generated artistic QR code">"#,
        size = options.canvas_size,
        view_box = total_modules,
    ));

    if !options.transparent_background {
        svg.push_str(&format!(
            r#"<rect width="{view_box}" height="{view_box}" fill="{background}" />"#,
            view_box = total_modules,
            background = options.background_hex,
        ));
    }

    let mut image = RgbaImage::from_pixel(options.canvas_size, options.canvas_size, options.background_rgba);

    for y in 0..matrix.width() {
        for x in 0..matrix.width() {
            let module = matrix.module(x, y);

            if !module.value {
                continue;
            }

            let importance = matrix.module_importance(x, y);
            let grid_x = x + options.quiet_zone;
            let grid_y = y + options.quiet_zone;
            let base_svg_geometry = SvgModuleGeometry {
                cell_x: x,
                cell_y: y,
                x: grid_x as f32,
                y: grid_y as f32,
                size: 1.0,
                role: module.role,
                importance,
                transform: ModuleTransform::default(),
            };

            if renderer.prefers_strict_rendering(module.role) {
                telemetry.record(module.role, ModuleTransform::default(), importance);
                let strict_geometry = raster_geometry(
                    x,
                    y,
                    grid_x,
                    grid_y,
                    total_modules,
                    options.canvas_size,
                    module.role,
                    importance,
                    ModuleTransform::default(),
                );
                svg.push_str(&strict_renderer.render_svg_module(base_svg_geometry, &options.foreground_hex));
                strict_renderer.rasterize_module(&mut image, strict_geometry, options.foreground_rgba);
                continue;
            }

            let effective_importance = adjusted_importance(importance, options.safety_bias);
            let transform = apply_safety_bias(
                renderer.module_transform(base_svg_geometry, matrix.width()),
                options.safety_bias,
            );
            telemetry.record(module.role, transform, effective_importance);
            let svg_geometry = SvgModuleGeometry {
                importance: effective_importance,
                transform,
                ..base_svg_geometry
            };
            let raster_geometry = raster_geometry(
                x,
                y,
                grid_x,
                grid_y,
                total_modules,
                options.canvas_size,
                module.role,
                importance,
                transform,
            );

            svg.push_str(&renderer.render_svg_module(svg_geometry, &options.foreground_hex));
            renderer.rasterize_module(&mut image, raster_geometry, options.foreground_rgba);
        }
    }

    svg.push_str("</svg>");

    RenderOutput {
        svg,
        image,
        telemetry: telemetry.finish(),
    }
}

fn adjusted_importance(importance: f32, safety_bias: f32) -> f32 {
    let bias = safety_bias.clamp(0.0, 1.0);
    (importance + ((1.0 - importance) * bias * 0.65)).clamp(0.0, 1.0)
}

fn apply_safety_bias(transform: ModuleTransform, safety_bias: f32) -> ModuleTransform {
    let bias = safety_bias.clamp(0.0, 1.0);

    ModuleTransform {
        offset_x: transform.offset_x * (1.0 - (0.92 * bias)),
        offset_y: transform.offset_y * (1.0 - (0.92 * bias)),
        scale: (transform.scale + ((1.0 - transform.scale) * bias)).clamp(0.0, 1.0),
        rotation_degrees: transform.rotation_degrees * (1.0 - (0.95 * bias)),
    }
}

fn raster_geometry(
    cell_x: usize,
    cell_y: usize,
    grid_x: usize,
    grid_y: usize,
    total_modules: usize,
    canvas_size: u32,
    role: ModuleRole,
    importance: f32,
    transform: ModuleTransform,
) -> RasterModuleGeometry {
    let x0 = ((grid_x as u64) * (canvas_size as u64) / (total_modules as u64)) as u32;
    let x1 = (((grid_x + 1) as u64) * (canvas_size as u64) / (total_modules as u64)) as u32;
    let y0 = ((grid_y as u64) * (canvas_size as u64) / (total_modules as u64)) as u32;
    let y1 = (((grid_y + 1) as u64) * (canvas_size as u64) / (total_modules as u64)) as u32;

    RasterModuleGeometry {
        cell_x,
        cell_y,
        x0,
        y0,
        x1,
        y1,
        role,
        importance,
        transform,
    }
}

pub(crate) fn fill_rect(
    canvas: &mut RgbaImage,
    x0: u32,
    y0: u32,
    x1: u32,
    y1: u32,
    color: Rgba<u8>,
) {
    if x0 >= x1 || y0 >= y1 {
        return;
    }

    for y in y0..y1 {
        for x in x0..x1 {
            canvas.put_pixel(x, y, color);
        }
    }
}

pub(crate) fn fill_circle(
    canvas: &mut RgbaImage,
    center_x: i32,
    center_y: i32,
    radius: i32,
    color: Rgba<u8>,
) {
    if radius <= 0 {
        return;
    }

    let radius_squared = radius * radius;
    let min_x = (center_x - radius).max(0) as u32;
    let max_x = (center_x + radius).max(0) as u32;
    let min_y = (center_y - radius).max(0) as u32;
    let max_y = (center_y + radius).max(0) as u32;

    for y in min_y..=max_y.min(canvas.height().saturating_sub(1)) {
        for x in min_x..=max_x.min(canvas.width().saturating_sub(1)) {
            let dx = x as i32 - center_x;
            let dy = y as i32 - center_y;

            if dx * dx + dy * dy <= radius_squared {
                canvas.put_pixel(x, y, color);
            }
        }
    }
}

pub(crate) fn fill_polygon(canvas: &mut RgbaImage, points: &[(f32, f32)], color: Rgba<u8>) {
    if points.len() < 3 {
        return;
    }

    let Some(min_x) = points.iter().map(|(x, _)| x.floor() as i32).min() else {
        return;
    };
    let Some(max_x) = points.iter().map(|(x, _)| x.ceil() as i32).max() else {
        return;
    };
    let Some(min_y) = points.iter().map(|(_, y)| y.floor() as i32).min() else {
        return;
    };
    let Some(max_y) = points.iter().map(|(_, y)| y.ceil() as i32).max() else {
        return;
    };

    for y in min_y.max(0)..=max_y.min(canvas.height() as i32 - 1) {
        for x in min_x.max(0)..=max_x.min(canvas.width() as i32 - 1) {
            if point_in_polygon((x as f32) + 0.5, (y as f32) + 0.5, points) {
                canvas.put_pixel(x as u32, y as u32, color);
            }
        }
    }
}

fn point_in_polygon(x: f32, y: f32, points: &[(f32, f32)]) -> bool {
    let mut inside = false;
    let mut previous_index = points.len() - 1;

    for (index, &(xi, yi)) in points.iter().enumerate() {
        let (xj, yj) = points[previous_index];
        let intersects = ((yi > y) != (yj > y))
            && (x < (((xj - xi) * (y - yi)) / ((yj - yi) + f32::EPSILON)) + xi);

        if intersects {
            inside = !inside;
        }

        previous_index = index;
    }

    inside
}

pub(crate) fn svg_polygon(points: &[(f32, f32)], color: &str) -> String {
    let points_attr = points
        .iter()
        .map(|(x, y)| format!("{x:.4},{y:.4}"))
        .collect::<Vec<_>>()
        .join(" ");

    format!(r#"<polygon points="{points}" fill="{color}" />"#, points = points_attr, color = color)
}

pub(crate) fn modulation_seed(cell_x: usize, cell_y: usize) -> f32 {
    let hash = ((cell_x as u64 * 73_856_093)
        ^ (cell_y as u64 * 19_349_663)
        ^ ((cell_x as u64 + cell_y as u64) * 83_492_791))
        % 2_048;

    (hash as f32 / 1_024.0) - 1.0
}

fn radial_bias(cell_x: usize, cell_y: usize, matrix_width: usize) -> (f32, f32) {
    let center = (matrix_width as f32 - 1.0) / 2.0;
    let dx = cell_x as f32 - center;
    let dy = cell_y as f32 - center;
    let distance = (dx * dx + dy * dy).sqrt();

    if distance <= f32::EPSILON {
        return (0.0, 0.0);
    }

    (dx / distance, dy / distance)
}

pub(crate) fn expressive_transform(
    cell_x: usize,
    cell_y: usize,
    matrix_width: usize,
    importance: f32,
    max_shift: f32,
    min_scale: f32,
    max_scale: f32,
    rotation_bias: f32,
) -> ModuleTransform {
    let jitter = modulation_seed(cell_x, cell_y);
    let (radial_x, radial_y) = radial_bias(cell_x, cell_y, matrix_width);
    let looseness = (1.0 - importance).clamp(0.0, 0.5);
    let shift = max_shift * (0.75 + looseness);
    let scale = (min_scale + (importance * (max_scale - min_scale)) + (jitter.abs() * 0.04))
        .clamp(min_scale, max_scale);

    ModuleTransform {
        offset_x: (radial_x * 0.45 + jitter * 0.35) * shift,
        offset_y: (radial_y * 0.45 - jitter * 0.35) * shift,
        scale,
        rotation_degrees: rotation_bias + (jitter * 16.0),
    }
}
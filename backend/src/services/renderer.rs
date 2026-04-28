use image::{Rgba, RgbaImage};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RenderStyle {
    #[default]
    Square,
    Dots,
    Lines,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ModuleKind {
    Data,
    Structural,
}

#[derive(Debug, Clone, Copy)]
pub struct SvgModuleGeometry {
    pub cell_x: usize,
    pub cell_y: usize,
    pub x: f32,
    pub y: f32,
    pub size: f32,
    pub kind: ModuleKind,
}

#[derive(Debug, Clone, Copy)]
pub struct RasterModuleGeometry {
    pub cell_x: usize,
    pub cell_y: usize,
    pub x0: u32,
    pub y0: u32,
    pub x1: u32,
    pub y1: u32,
    pub kind: ModuleKind,
}

impl RasterModuleGeometry {
    pub fn width(self) -> u32 {
        self.x1.saturating_sub(self.x0)
    }

    pub fn height(self) -> u32 {
        self.y1.saturating_sub(self.y0)
    }
}

pub trait Renderer: Send + Sync {
    fn render_svg_module(&self, geometry: SvgModuleGeometry, color: &str) -> String;

    fn rasterize_module(&self, canvas: &mut RgbaImage, geometry: RasterModuleGeometry, color: Rgba<u8>);
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

mod renderer;
pub mod styles;

pub use crate::core::matrix::ModuleKind;
pub use renderer::{RasterModuleGeometry, RenderStyle, Renderer, SvgModuleGeometry};
pub(crate) use renderer::{fill_circle, fill_rect};
pub use styles::renderer_for;
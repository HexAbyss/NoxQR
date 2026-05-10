mod artistic;
mod design;
mod renderer;
pub mod styles;

pub use artistic::{
	build_artistic_render_config, validate_image_payload, ArtisticPreset, ArtisticRenderConfig,
	PerceptionMode,
};
pub use renderer::{
	ModuleTransform, QRFinderBorderStyle, QRFinderCenterStyle, QRFrameStyle,
	RasterModuleGeometry, RenderOptions, RenderStyle, RenderTelemetry, Renderer,
	SvgModuleGeometry,
};
pub(crate) use renderer::{
	expressive_transform, fill_circle, fill_polygon, fill_rect, modulation_seed, svg_polygon,
};
pub(crate) use design::apply_design_layers;
pub use styles::renderer_for;
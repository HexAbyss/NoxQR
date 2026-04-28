pub mod blobs;
pub mod dots;
pub mod fractal;
pub mod glyphs;
pub mod hexagons;
pub mod lines;
pub mod square;
pub mod triangles;

use crate::render::renderer::{RenderStyle, Renderer};

pub fn renderer_for(style: RenderStyle) -> Box<dyn Renderer> {
    match style {
        RenderStyle::Square => Box::new(square::SquareRenderer),
        RenderStyle::Dots => Box::new(dots::DotRenderer),
        RenderStyle::Lines => Box::new(lines::LineRenderer),
        RenderStyle::Triangles => Box::new(triangles::TriangleRenderer),
        RenderStyle::Hexagons => Box::new(hexagons::HexagonRenderer),
        RenderStyle::Blobs => Box::new(blobs::BlobRenderer),
        RenderStyle::Glyphs => Box::new(glyphs::GlyphRenderer),
        RenderStyle::Fractal => Box::new(fractal::FractalRenderer),
    }
}
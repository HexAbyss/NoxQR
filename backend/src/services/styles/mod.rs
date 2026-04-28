pub mod dots;
pub mod lines;
pub mod square;

use super::renderer::{RenderStyle, Renderer};

pub fn renderer_for(style: RenderStyle) -> Box<dyn Renderer> {
    match style {
        RenderStyle::Square => Box::new(square::SquareRenderer),
        RenderStyle::Dots => Box::new(dots::DotRenderer),
        RenderStyle::Lines => Box::new(lines::LineRenderer),
    }
}

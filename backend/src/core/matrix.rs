#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ModuleKind {
    Data,
    Structural,
}

pub struct QrMatrix {
    width: usize,
    version: usize,
    modules: Vec<bool>,
}

impl QrMatrix {
    pub fn new(width: usize, version: usize, modules: Vec<bool>) -> Self {
        Self {
            width,
            version,
            modules,
        }
    }

    pub fn width(&self) -> usize {
        self.width
    }

    pub fn is_dark(&self, x: usize, y: usize) -> bool {
        self.modules[(y * self.width) + x]
    }

    pub fn module_kind(&self, x: usize, y: usize) -> ModuleKind {
        if self.is_structural(x, y) {
            ModuleKind::Structural
        } else {
            ModuleKind::Data
        }
    }

    fn is_structural(&self, x: usize, y: usize) -> bool {
        is_finder_module(x, y, self.width)
            || is_alignment_module(x, y, self.width, self.version)
            || is_timing_module(x, y, self.width)
            || is_format_module(x, y, self.width)
            || is_version_module(x, y, self.width, self.version)
            || is_fixed_dark_module(x, y, self.width)
    }
}

fn is_finder_module(x: usize, y: usize, width: usize) -> bool {
    in_square(x, y, 0, 0, 7)
        || in_square(x, y, width - 7, 0, 7)
        || in_square(x, y, 0, width - 7, 7)
}

fn is_timing_module(x: usize, y: usize, width: usize) -> bool {
    ((x == 6) && (8..(width - 8)).contains(&y)) || ((y == 6) && (8..(width - 8)).contains(&x))
}

fn is_format_module(x: usize, y: usize, width: usize) -> bool {
    let top_left = ((x == 8) && (y <= 8) && (y != 6)) || ((y == 8) && (x <= 8) && (x != 6));
    let top_right = y == 8 && x >= width - 8;
    let bottom_left = x == 8 && y >= width - 7;

    top_left || top_right || bottom_left
}

fn is_version_module(x: usize, y: usize, width: usize, version: usize) -> bool {
    if version < 7 {
        return false;
    }

    let top_right = y < 6 && ((width - 11)..(width - 8)).contains(&x);
    let bottom_left = x < 6 && ((width - 11)..(width - 8)).contains(&y);

    top_right || bottom_left
}

fn is_fixed_dark_module(x: usize, y: usize, width: usize) -> bool {
    x == 8 && y == width - 8
}

fn is_alignment_module(x: usize, y: usize, width: usize, version: usize) -> bool {
    let centers = alignment_pattern_centers(version);

    if centers.is_empty() {
        return false;
    }

    for &center_y in centers {
        for &center_x in centers {
            if overlaps_reserved_alignment_center(center_x, center_y, width) {
                continue;
            }

            if x.abs_diff(center_x) <= 2 && y.abs_diff(center_y) <= 2 {
                return true;
            }
        }
    }

    false
}

fn overlaps_reserved_alignment_center(center_x: usize, center_y: usize, width: usize) -> bool {
    (center_x <= 8 && center_y <= 8)
        || (center_x >= width - 9 && center_y <= 8)
        || (center_x <= 8 && center_y >= width - 9)
}

fn in_square(x: usize, y: usize, left: usize, top: usize, size: usize) -> bool {
    (left..(left + size)).contains(&x) && (top..(top + size)).contains(&y)
}

fn alignment_pattern_centers(version: usize) -> &'static [usize] {
    const TABLE: [&[usize]; 40] = [
        &[],
        &[6, 18],
        &[6, 22],
        &[6, 26],
        &[6, 30],
        &[6, 34],
        &[6, 22, 38],
        &[6, 24, 42],
        &[6, 26, 46],
        &[6, 28, 50],
        &[6, 30, 54],
        &[6, 32, 58],
        &[6, 34, 62],
        &[6, 26, 46, 66],
        &[6, 26, 48, 70],
        &[6, 26, 50, 74],
        &[6, 30, 54, 78],
        &[6, 30, 56, 82],
        &[6, 30, 58, 86],
        &[6, 34, 62, 90],
        &[6, 28, 50, 72, 94],
        &[6, 26, 50, 74, 98],
        &[6, 30, 54, 78, 102],
        &[6, 28, 54, 80, 106],
        &[6, 32, 58, 84, 110],
        &[6, 30, 58, 86, 114],
        &[6, 34, 62, 90, 118],
        &[6, 26, 50, 74, 98, 122],
        &[6, 30, 54, 78, 102, 126],
        &[6, 26, 52, 78, 104, 130],
        &[6, 30, 56, 82, 108, 134],
        &[6, 34, 60, 86, 112, 138],
        &[6, 30, 58, 86, 114, 142],
        &[6, 34, 62, 90, 118, 146],
        &[6, 30, 54, 78, 102, 126, 150],
        &[6, 24, 50, 76, 102, 128, 154],
        &[6, 28, 54, 80, 106, 132, 158],
        &[6, 32, 58, 84, 110, 136, 162],
        &[6, 26, 54, 82, 110, 138, 166],
        &[6, 30, 58, 86, 114, 142, 170],
    ];

    TABLE[version.saturating_sub(1).min(TABLE.len() - 1)]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finder_patterns_remain_structural() {
        assert!(is_finder_module(0, 0, 21));
        assert!(is_finder_module(20, 0, 21));
        assert!(is_finder_module(0, 20, 21));
        assert!(!is_finder_module(10, 10, 21));
    }

    #[test]
    fn alignment_patterns_skip_reserved_corners() {
        assert!(is_alignment_module(22, 22, 45, 7));
        assert!(!is_alignment_module(6, 6, 45, 7));
    }
}
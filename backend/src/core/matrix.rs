#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ModuleRole {
    Data,
    Finder,
    Alignment,
    Timing,
    Format,
    Version,
    FixedDark,
    QuietZone,
}

impl ModuleRole {
    pub fn requires_strict_rendering(self) -> bool {
        matches!(self, Self::Finder | Self::Alignment)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Module {
    pub value: bool,
    pub role: ModuleRole,
}

impl Module {
    pub const fn quiet_zone() -> Self {
        Self {
            value: false,
            role: ModuleRole::QuietZone,
        }
    }
}

pub fn compute_importance(module: &Module) -> f32 {
    match module.role {
        ModuleRole::Finder => 1.0,
        ModuleRole::Alignment => 0.9,
        ModuleRole::Timing => 0.85,
        ModuleRole::Format => 0.8,
        ModuleRole::Version => 0.75,
        ModuleRole::FixedDark => 0.7,
        ModuleRole::Data => 0.6,
        ModuleRole::QuietZone => 1.0,
    }
}

pub fn role_for_position(x: usize, y: usize, width: usize, version: usize) -> ModuleRole {
    if is_finder_module(x, y, width) {
        ModuleRole::Finder
    } else if is_alignment_module(x, y, width, version) {
        ModuleRole::Alignment
    } else if is_timing_module(x, y, width) {
        ModuleRole::Timing
    } else if is_format_module(x, y, width) {
        ModuleRole::Format
    } else if is_version_module(x, y, width, version) {
        ModuleRole::Version
    } else if is_fixed_dark_module(x, y, width) {
        ModuleRole::FixedDark
    } else {
        ModuleRole::Data
    }
}

pub struct QrMatrix {
    width: usize,
    version: usize,
    modules: Vec<Module>,
}

impl QrMatrix {
    pub fn new(width: usize, version: usize, modules: Vec<Module>) -> Self {
        Self {
            width,
            version,
            modules,
        }
    }

    pub fn width(&self) -> usize {
        self.width
    }

    pub fn version(&self) -> usize {
        self.version
    }

    pub fn module(&self, x: usize, y: usize) -> Module {
        self.modules[(y * self.width) + x]
    }

    pub fn is_dark(&self, x: usize, y: usize) -> bool {
        self.module(x, y).value
    }

    pub fn module_role(&self, x: usize, y: usize) -> ModuleRole {
        self.module(x, y).role
    }

    pub fn module_importance(&self, x: usize, y: usize) -> f32 {
        compute_importance(&self.module(x, y))
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
    fn finder_patterns_remain_finders() {
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

    #[test]
    fn position_roles_match_reserved_qr_regions() {
        assert_eq!(role_for_position(0, 0, 21, 1), ModuleRole::Finder);
        assert_eq!(role_for_position(8, 0, 21, 1), ModuleRole::Format);
        assert_eq!(role_for_position(6, 10, 21, 1), ModuleRole::Timing);
        assert_eq!(role_for_position(8, 13, 21, 1), ModuleRole::FixedDark);
        assert_eq!(role_for_position(10, 10, 21, 1), ModuleRole::Data);
    }

    #[test]
    fn importance_prioritizes_finders_over_data() {
        let finder = Module {
            value: true,
            role: ModuleRole::Finder,
        };
        let data = Module {
            value: true,
            role: ModuleRole::Data,
        };

        assert!(compute_importance(&finder) > compute_importance(&data));
    }

    #[test]
    fn strict_rendering_is_limited_to_reading_patterns() {
        assert!(ModuleRole::Finder.requires_strict_rendering());
        assert!(ModuleRole::Alignment.requires_strict_rendering());
        assert!(!ModuleRole::Timing.requires_strict_rendering());
        assert!(!ModuleRole::Format.requires_strict_rendering());
        assert!(!ModuleRole::Version.requires_strict_rendering());
        assert!(!ModuleRole::FixedDark.requires_strict_rendering());
        assert!(!ModuleRole::Data.requires_strict_rendering());
    }
}
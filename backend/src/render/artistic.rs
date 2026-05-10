use std::io::Cursor;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use image::{imageops, DynamicImage, ImageFormat, Rgba, RgbaImage};
use serde::{Deserialize, Serialize};

use crate::{
    core::{matrix::ModuleRole, matrix::QrMatrix},
    error::AppError,
};

use super::{ModuleTransform, SvgModuleGeometry};

const MAX_IMAGE_BYTES: usize = 2_000_000;
const MAX_IMAGE_DIMENSION: u32 = 2048;

#[derive(Debug, Clone, Copy, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ArtisticPreset {
    #[default]
    Manual,
    Neon,
    Ink,
    Wireframe,
    Cyberpunk,
    Minimal,
    Organic,
}

#[derive(Debug, Clone, Copy, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PerceptionMode {
    #[default]
    Off,
    NearInvisible,
    Frequency,
    Negative,
    Encrypted,
    MultiLayer,
}

#[derive(Debug, Clone, Default)]
pub struct ArtisticRenderConfig {
    pub preset: ArtisticPreset,
    pub camouflage: f32,
    pub perception_mode: PerceptionMode,
    pub perception_strength: f32,
    reference: Option<ReferenceMap>,
    logo: Option<LogoOverlay>,
}

#[derive(Debug, Clone)]
pub struct ArtisticModuleAdjustment {
    pub color: Rgba<u8>,
    pub transform: ModuleTransform,
    pub importance: f32,
    pub skip: bool,
}

#[derive(Debug, Clone)]
struct ReferenceMap {
    width: usize,
    image: RgbaImage,
    svg_data_url: String,
    sampled_colors: Vec<Rgba<u8>>,
    luminance: Vec<f32>,
    threshold: Vec<f32>,
}

#[derive(Debug, Clone)]
struct LogoOverlay {
    image: RgbaImage,
    svg_data_url: String,
    scale: f32,
}

#[derive(Debug, Clone)]
struct DecodedImageAsset {
    image: RgbaImage,
    svg_data_url: String,
}

#[derive(Debug, Clone, Copy)]
struct ArtisticPresetProfile {
    accent: Rgba<u8>,
    backdrop: Rgba<u8>,
    base_camouflage: f32,
    image_influence: f32,
    texture_strength: f32,
    module_blend: f32,
    logo_ring_boost: f32,
}

impl ArtisticPreset {
    fn profile(self) -> ArtisticPresetProfile {
        match self {
            ArtisticPreset::Manual => ArtisticPresetProfile {
                accent: Rgba([0, 255, 170, 255]),
                backdrop: Rgba([14, 18, 24, 220]),
                base_camouflage: 0.0,
                image_influence: 0.0,
                texture_strength: 0.0,
                module_blend: 0.0,
                logo_ring_boost: 0.08,
            },
            ArtisticPreset::Neon => ArtisticPresetProfile {
                accent: Rgba([0, 255, 170, 255]),
                backdrop: Rgba([6, 19, 24, 224]),
                base_camouflage: 0.10,
                image_influence: 0.35,
                texture_strength: 0.16,
                module_blend: 0.06,
                logo_ring_boost: 0.12,
            },
            ArtisticPreset::Ink => ArtisticPresetProfile {
                accent: Rgba([38, 28, 16, 255]),
                backdrop: Rgba([245, 238, 224, 228]),
                base_camouflage: 0.04,
                image_influence: 0.26,
                texture_strength: 0.08,
                module_blend: 0.03,
                logo_ring_boost: 0.10,
            },
            ArtisticPreset::Wireframe => ArtisticPresetProfile {
                accent: Rgba([118, 245, 255, 255]),
                backdrop: Rgba([8, 19, 32, 220]),
                base_camouflage: 0.18,
                image_influence: 0.28,
                texture_strength: 0.18,
                module_blend: 0.08,
                logo_ring_boost: 0.14,
            },
            ArtisticPreset::Cyberpunk => ArtisticPresetProfile {
                accent: Rgba([255, 79, 216, 255]),
                backdrop: Rgba([16, 8, 26, 224]),
                base_camouflage: 0.24,
                image_influence: 0.32,
                texture_strength: 0.22,
                module_blend: 0.10,
                logo_ring_boost: 0.14,
            },
            ArtisticPreset::Minimal => ArtisticPresetProfile {
                accent: Rgba([18, 18, 18, 255]),
                backdrop: Rgba([250, 250, 250, 224]),
                base_camouflage: 0.0,
                image_influence: 0.12,
                texture_strength: 0.02,
                module_blend: 0.0,
                logo_ring_boost: 0.10,
            },
            ArtisticPreset::Organic => ArtisticPresetProfile {
                accent: Rgba([91, 227, 139, 255]),
                backdrop: Rgba([238, 232, 220, 228]),
                base_camouflage: 0.12,
                image_influence: 0.42,
                texture_strength: 0.20,
                module_blend: 0.05,
                logo_ring_boost: 0.16,
            },
        }
    }
}

impl ArtisticRenderConfig {
    pub fn module_adjustment(
        &self,
        geometry: SvgModuleGeometry,
        base_transform: ModuleTransform,
        importance: f32,
        foreground: Rgba<u8>,
        background: Rgba<u8>,
        safety_bias: f32,
        matrix_width: usize,
    ) -> ArtisticModuleAdjustment {
        let mut transform = base_transform;
        let mut effective_importance = importance;
        let perception_active = self.reference.is_some() && self.perception_mode != PerceptionMode::Off;

        if geometry.role != ModuleRole::Data && !perception_active {
            return ArtisticModuleAdjustment {
                color: foreground,
                transform,
                importance: effective_importance,
                skip: false,
            };
        }

        if self.should_skip_module(geometry.role, geometry.cell_x, geometry.cell_y, matrix_width) {
            return ArtisticModuleAdjustment {
                color: foreground,
                transform,
                importance: effective_importance,
                skip: true,
            };
        }

        let profile = self.preset.profile();
        let camouflage = self.effective_camouflage();
        let transform_budget = (1.0 - safety_bias).clamp(0.0, 1.0);
        let image_signal = self
            .reference
            .as_ref()
            .map(|map| map.adaptive_signal(geometry.cell_x, geometry.cell_y))
            .unwrap_or(0.5);
        let noise_x = camouflage_signal(geometry.cell_x, geometry.cell_y, matrix_width);
        let noise_y = camouflage_signal(geometry.cell_y + 7, geometry.cell_x + 5, matrix_width);
        let logo_ring = self
            .logo
            .as_ref()
            .map(|logo| logo.ring_weight(geometry.cell_x, geometry.cell_y, matrix_width))
            .unwrap_or(0.0);
        let carrier_color = self
            .reference
            .as_ref()
            .map(|map| map.color_at(geometry.cell_x, geometry.cell_y))
            .unwrap_or_else(|| opaque_rgb(background));
        let frequency = camouflage_signal(geometry.cell_x + 13, geometry.cell_y + 9, matrix_width).abs();
        let checker = if (geometry.cell_x + geometry.cell_y) % 2 == 0 {
            0.0
        } else {
            1.0
        };

        effective_importance = (effective_importance + (logo_ring * profile.logo_ring_boost)).clamp(0.0, 1.0);

        if perception_active {
            if geometry.role == ModuleRole::Data {
                let distortion_gain = match self.perception_mode {
                    PerceptionMode::Off => 0.0,
                    PerceptionMode::NearInvisible => 0.42,
                    PerceptionMode::Frequency => 0.36,
                    PerceptionMode::Negative => 0.18,
                    PerceptionMode::Encrypted => 0.72,
                    PerceptionMode::MultiLayer => 0.78,
                } * self.perception_strength;

                transform.offset_x += noise_x * 0.010 * camouflage.max(0.16) * distortion_gain * transform_budget;
                transform.offset_y += noise_y * 0.010 * camouflage.max(0.16) * distortion_gain * transform_budget;
                transform.scale = (
                    transform.scale
                        + ((image_signal - 0.5) * 0.14 * distortion_gain)
                        + (logo_ring * 0.10)
                        - (camouflage * noise_x.abs() * 0.05)
                )
                .clamp(0.64, 1.05);
                transform.rotation_degrees += frequency * 4.5 * distortion_gain * transform_budget;
            }

            let visibility = self
                .perception_visibility(geometry.role, image_signal, frequency, logo_ring, safety_bias)
                .clamp(
                    if geometry.role.requires_strict_rendering() { 0.42 } else { 0.24 },
                    if geometry.role.requires_strict_rendering() { 0.72 } else { 0.58 },
                );
            let color = match self.perception_mode {
                PerceptionMode::Off => foreground,
                PerceptionMode::NearInvisible => {
                    let signal = (0.52 + (self.perception_strength * 0.28)).clamp(0.54, 0.76);
                    blend_rgba(carrier_color, foreground, signal)
                }
                PerceptionMode::Frequency => {
                    let pulse = (0.58 + (self.perception_strength * 0.18) + (frequency * 0.10)).clamp(0.56, 0.78);
                    blend_rgba(carrier_color, foreground, pulse)
                }
                PerceptionMode::Negative => {
                    let negative_target = if relative_luminance_rgba(carrier_color) > 0.58 {
                        foreground
                    } else {
                        blend_rgba(foreground, opaque_rgb(profile.accent), 0.18)
                    };
                    let signal = (0.60 + (self.perception_strength * 0.12)).clamp(0.60, 0.76);
                    blend_rgba(carrier_color, negative_target, signal)
                }
                PerceptionMode::Encrypted => {
                    let encrypted_target = blend_rgba(
                        scramble_rgb(foreground, geometry.cell_x ^ geometry.cell_y),
                        foreground,
                        0.28 + (checker * 0.14),
                    );
                    blend_rgba(carrier_color, encrypted_target, (visibility * 0.92).clamp(0.16, 0.62))
                }
                PerceptionMode::MultiLayer => {
                    let layer_target = if checker > 0.5 {
                        blend_rgba(foreground, opaque_rgb(profile.accent), 0.22)
                    } else {
                        blend_rgba(foreground, opaque_rgb(profile.backdrop), 0.14)
                    };
                    blend_rgba(carrier_color, layer_target, (visibility * 0.96).clamp(0.16, 0.62))
                }
            };

            return ArtisticModuleAdjustment {
                color,
                transform,
                importance: effective_importance,
                skip: false,
            };
        }

        transform.offset_x += noise_x * 0.012 * camouflage * transform_budget;
        transform.offset_y += noise_y * 0.012 * camouflage * transform_budget;
        transform.scale = (
            transform.scale
                + ((image_signal - 0.5) * 0.18 * profile.image_influence)
                + (logo_ring * 0.10)
                - (camouflage * noise_x.abs() * 0.06)
        )
        .clamp(0.58, 1.05);
        transform.rotation_degrees += noise_x * 5.0 * camouflage * transform_budget;

        let blend_amount = (
            profile.module_blend
                + ((1.0 - image_signal) * 0.12 * profile.image_influence)
                + (camouflage * 0.14 * noise_y.abs())
        )
        .clamp(0.0, 0.32);

        ArtisticModuleAdjustment {
            color: blend_rgba(foreground, opaque_rgb(background), blend_amount),
            transform,
            importance: effective_importance,
            skip: false,
        }
    }

    pub fn should_skip_module(
        &self,
        role: ModuleRole,
        cell_x: usize,
        cell_y: usize,
        matrix_width: usize,
    ) -> bool {
        role == ModuleRole::Data
            && self
                .logo
                .as_ref()
                .is_some_and(|logo| logo.contains_cell(cell_x, cell_y, matrix_width))
    }

    pub fn render_svg_background_layer(
        &self,
        matrix: &QrMatrix,
        quiet_zone: usize,
        transparent_background: bool,
    ) -> String {
        let profile = self.preset.profile();
        let camouflage = self.effective_camouflage();
        let has_texture = camouflage >= 0.05 || profile.texture_strength >= 0.05;

        if self.reference.is_none() && !has_texture {
            return String::new();
        }

        let mut markup = String::new();

        let paints_carrier_image = matches!(
            self.perception_mode,
            PerceptionMode::Encrypted | PerceptionMode::MultiLayer
        );

        if paints_carrier_image {
            if let Some(reference) = &self.reference {
                let (backdrop_opacity, image_opacity) = self.carrier_overlay_style(transparent_background);
                let x = quiet_zone as f32;
                let y = quiet_zone as f32;
                let size = matrix.width() as f32;
                markup.push_str(&format!(
                    r#"<g aria-label="Carrier image"><rect x="{x:.4}" y="{y:.4}" width="{size:.4}" height="{size:.4}" fill="{backdrop}" opacity="{backdrop_opacity:.4}" /><image href="{href}" x="{x:.4}" y="{y:.4}" width="{size:.4}" height="{size:.4}" preserveAspectRatio="none" opacity="{image_opacity:.4}" /></g>"#,
                    x = x,
                    y = y,
                    size = size,
                    backdrop = svg_color(opaque_rgb(profile.backdrop)),
                    backdrop_opacity = backdrop_opacity,
                    href = reference.svg_data_url(),
                    image_opacity = image_opacity,
                ));
            }

            for y in 0..matrix.width() {
                for x in 0..matrix.width() {
                    if matrix.module_role(x, y) == ModuleRole::Data {
                        continue;
                    }

                    markup.push_str(&format!(
                        r#"<rect x="{x:.4}" y="{y:.4}" width="1.0000" height="1.0000" fill="{color}" />"#,
                        x = (x + quiet_zone) as f32,
                        y = (y + quiet_zone) as f32,
                        color = svg_color(opaque_rgb(profile.backdrop)),
                    ));
                }
            }
        }

        if !has_texture {
            return markup;
        }

        for y in 0..matrix.width() {
            for x in 0..matrix.width() {
                if matrix.module_role(x, y) != ModuleRole::Data {
                    continue;
                }

                if self.should_skip_module(ModuleRole::Data, x, y, matrix.width()) {
                    continue;
                }

                let intensity = self.background_intensity(x, y, matrix.width());
                if intensity < 0.14 {
                    continue;
                }

                let alpha_scale = match self.perception_mode {
                    PerceptionMode::Off => 1.0,
                    PerceptionMode::NearInvisible => 0.72,
                    PerceptionMode::Frequency => 1.04,
                    PerceptionMode::Negative => 0.84,
                    PerceptionMode::Encrypted => 0.94,
                    PerceptionMode::MultiLayer => 1.08,
                };
                let alpha = if transparent_background {
                    (14.0 + (intensity * 52.0 * alpha_scale)).round() as u8
                } else {
                    (12.0 + (intensity * 38.0 * alpha_scale)).round() as u8
                };
                let tint = Rgba([profile.accent[0], profile.accent[1], profile.accent[2], alpha.min(72)]);
                let grid_x = x + quiet_zone;
                let grid_y = y + quiet_zone;
                markup.push_str(&format!(
                    r#"<rect x="{x:.4}" y="{y:.4}" width="1.0000" height="1.0000" fill="{color}" />"#,
                    x = grid_x as f32,
                    y = grid_y as f32,
                    color = svg_color(tint),
                ));
            }
        }

        markup
    }

    pub fn paint_raster_background_layer(
        &self,
        canvas: &mut RgbaImage,
        matrix: &QrMatrix,
        quiet_zone: usize,
        canvas_size: u32,
        transparent_background: bool,
    ) {
        let profile = self.preset.profile();
        let camouflage = self.effective_camouflage();
        let has_texture = camouflage >= 0.05 || profile.texture_strength >= 0.05;

        if self.reference.is_none() && !has_texture {
            return;
        }

        let total_modules = matrix.width() + (quiet_zone * 2);

        let paints_carrier_image = matches!(
            self.perception_mode,
            PerceptionMode::Encrypted | PerceptionMode::MultiLayer
        );

        if paints_carrier_image {
            if let Some(reference) = &self.reference {
                let (backdrop_opacity, _) = self.carrier_overlay_style(transparent_background);
                let x0 = ((quiet_zone as u64) * canvas_size as u64 / total_modules as u64) as u32;
                let y0 = ((quiet_zone as u64) * canvas_size as u64 / total_modules as u64) as u32;
                let x1 = (((quiet_zone + matrix.width()) as u64) * canvas_size as u64 / total_modules as u64) as u32;
                let y1 = (((quiet_zone + matrix.width()) as u64) * canvas_size as u64 / total_modules as u64) as u32;
                let backdrop_alpha = (backdrop_opacity * 255.0).round().clamp(0.0, 255.0) as u8;

                blend_fill_rect(
                    canvas,
                    x0,
                    y0,
                    x1,
                    y1,
                    Rgba([
                        profile.backdrop[0],
                        profile.backdrop[1],
                        profile.backdrop[2],
                        backdrop_alpha,
                    ]),
                );
                paint_reference_background(
                    canvas,
                    reference,
                    x0,
                    y0,
                    x1,
                    y1,
                    opaque_rgb(profile.backdrop),
                    self.carrier_wash(),
                );
            }

            for y in 0..matrix.width() {
                for x in 0..matrix.width() {
                    if matrix.module_role(x, y) == ModuleRole::Data {
                        continue;
                    }

                    let (x0, y0, x1, y1) = cell_pixel_bounds(
                        x + quiet_zone,
                        y + quiet_zone,
                        total_modules,
                        canvas_size,
                    );
                    blend_fill_rect(canvas, x0, y0, x1, y1, opaque_rgb(profile.backdrop));
                }
            }
        }

        if !has_texture {
            return;
        }

        for y in 0..matrix.width() {
            for x in 0..matrix.width() {
                if matrix.module_role(x, y) != ModuleRole::Data {
                    continue;
                }

                if self.should_skip_module(ModuleRole::Data, x, y, matrix.width()) {
                    continue;
                }

                let intensity = self.background_intensity(x, y, matrix.width());
                if intensity < 0.14 {
                    continue;
                }

                let alpha_scale = match self.perception_mode {
                    PerceptionMode::Off => 1.0,
                    PerceptionMode::NearInvisible => 0.72,
                    PerceptionMode::Frequency => 1.04,
                    PerceptionMode::Negative => 0.84,
                    PerceptionMode::Encrypted => 0.94,
                    PerceptionMode::MultiLayer => 1.08,
                };
                let alpha = (12.0 + (intensity * 42.0 * alpha_scale)).round() as u8;
                let tint = Rgba([profile.accent[0], profile.accent[1], profile.accent[2], alpha.min(72)]);
                let (x0, y0, x1, y1) = cell_pixel_bounds(
                    x + quiet_zone,
                    y + quiet_zone,
                    total_modules,
                    canvas_size,
                );
                blend_fill_rect(canvas, x0, y0, x1, y1, tint);
            }
        }
    }

    pub fn render_svg_logo(&self, matrix_width: usize, quiet_zone: usize) -> String {
        let Some(logo) = &self.logo else {
            return String::new();
        };

        let profile = self.preset.profile();
        let (x, y, size) = logo.svg_bounds(matrix_width, quiet_zone);
        let backdrop = svg_color(profile.backdrop);
        let radius = size * 0.18;

        format!(
            r#"<g aria-label="Embedded logo"><rect x="{x:.4}" y="{y:.4}" width="{size:.4}" height="{size:.4}" rx="{radius:.4}" fill="{backdrop}" /><image href="{href}" x="{x:.4}" y="{y:.4}" width="{size:.4}" height="{size:.4}" preserveAspectRatio="xMidYMid meet" /></g>"#,
            x = x,
            y = y,
            size = size,
            radius = radius,
            backdrop = backdrop,
            href = logo.svg_data_url,
        )
    }

    pub fn paint_raster_logo(
        &self,
        canvas: &mut RgbaImage,
        matrix_width: usize,
        quiet_zone: usize,
        canvas_size: u32,
    ) {
        let Some(logo) = &self.logo else {
            return;
        };

        let total_modules = matrix_width + (quiet_zone * 2);
        let profile = self.preset.profile();
        let (grid_x, grid_y, grid_size) = logo.grid_bounds(matrix_width, quiet_zone);
        let x0 = ((grid_x as f32 / total_modules as f32) * canvas_size as f32).round() as u32;
        let y0 = ((grid_y as f32 / total_modules as f32) * canvas_size as f32).round() as u32;
        let size = ((grid_size / total_modules as f32) * canvas_size as f32).round() as u32;
        if size == 0 {
            return;
        }

        let backdrop = profile.backdrop;
        blend_fill_rect(canvas, x0, y0, x0 + size, y0 + size, backdrop);

        let resized = imageops::resize(&logo.image, size, size, imageops::FilterType::CatmullRom);
        for (offset_x, offset_y, pixel) in resized.enumerate_pixels() {
            blend_pixel(canvas, x0 + offset_x, y0 + offset_y, *pixel);
        }
    }

    fn background_intensity(&self, cell_x: usize, cell_y: usize, matrix_width: usize) -> f32 {
        let profile = self.preset.profile();
        let camouflage = self.effective_camouflage();
        let image_strength = self
            .reference
            .as_ref()
            .map(|map| {
                let luma = 1.0 - map.luminance_at(cell_x, cell_y);
                let threshold = (map.adaptive_signal(cell_x, cell_y) - 0.5).abs() * 2.0;
                ((luma * 0.55) + (threshold * 0.45)) * profile.image_influence
            })
            .unwrap_or(0.0);
        let frequency = camouflage_signal(cell_x + 11, cell_y + 3, matrix_width).abs();
        let perception_bias = if self.reference.is_some() {
            self.perception_strength
                * match self.perception_mode {
                    PerceptionMode::Off => 0.0,
                    PerceptionMode::NearInvisible => 0.10,
                    PerceptionMode::Frequency => 0.18,
                    PerceptionMode::Negative => 0.12,
                    PerceptionMode::Encrypted => 0.20,
                    PerceptionMode::MultiLayer => 0.22,
                }
        } else {
            0.0
        };

        (
            image_strength
                + (frequency * (camouflage + perception_bias) * 0.48)
                + (profile.texture_strength * (0.20 + perception_bias))
        )
        .clamp(0.0, 1.0)
    }

    fn effective_camouflage(&self) -> f32 {
        self.camouflage
            .max(self.preset.profile().base_camouflage)
            .clamp(0.0, 1.0)
    }

    fn perception_visibility(
        &self,
        role: ModuleRole,
        image_signal: f32,
        frequency: f32,
        logo_ring: f32,
        safety_bias: f32,
    ) -> f32 {
        let strict_boost = if role.requires_strict_rendering() { 0.18 } else { 0.0 };
        let base = 0.18 + (self.perception_strength * 0.38) + strict_boost + (logo_ring * 0.12) - (safety_bias * 0.08);
        let mode_gain = match self.perception_mode {
            PerceptionMode::Off => 0.0,
            PerceptionMode::NearInvisible => 1.02 + (image_signal * 0.12),
            PerceptionMode::Frequency => 0.88 + (frequency * 0.18),
            PerceptionMode::Negative => 0.96,
            PerceptionMode::Encrypted => 0.90 + ((image_signal - 0.5).abs() * 0.20),
            PerceptionMode::MultiLayer => 0.94 + (frequency * 0.10),
        };

        (base * mode_gain).clamp(0.08, 0.72)
    }

    fn carrier_overlay_style(&self, transparent_background: bool) -> (f32, f32) {
        let wash = self.carrier_wash();
        let backdrop_opacity = if transparent_background {
            (0.14 + (wash * 0.42)).clamp(0.08, 0.44)
        } else {
            (0.10 + (wash * 0.30)).clamp(0.06, 0.34)
        };
        let image_opacity = (1.0 - wash * if transparent_background { 0.42 } else { 0.34 }).clamp(0.72, 1.0);

        (backdrop_opacity, image_opacity)
    }

    fn carrier_wash(&self) -> f32 {
        let base = match self.perception_mode {
            PerceptionMode::Off => 0.08,
            PerceptionMode::NearInvisible => 0.52,
            PerceptionMode::Frequency => 0.16,
            PerceptionMode::Negative => 0.32,
            PerceptionMode::Encrypted => 0.22,
            PerceptionMode::MultiLayer => 0.24,
        };

        (base * (0.7 + (self.perception_strength * 0.6))).clamp(0.05, 0.38)
    }
}

impl ReferenceMap {
    fn from_asset(asset: DecodedImageAsset, matrix_width: usize) -> Self {
        let grayscale = DynamicImage::ImageRgba8(asset.image.clone()).to_luma8();
        let resized = imageops::resize(
            &grayscale,
            matrix_width as u32,
            matrix_width as u32,
            imageops::FilterType::CatmullRom,
        );
        let sampled = imageops::resize(
            &asset.image,
            matrix_width as u32,
            matrix_width as u32,
            imageops::FilterType::CatmullRom,
        );

        let luminance = resized
            .pixels()
            .map(|pixel| pixel[0] as f32 / 255.0)
            .collect::<Vec<_>>();
        let sampled_colors = sampled.pixels().copied().collect::<Vec<_>>();
        let mut threshold = vec![0.5; matrix_width * matrix_width];

        for y in 0..matrix_width {
            for x in 0..matrix_width {
                let min_x = x.saturating_sub(1);
                let max_x = (x + 1).min(matrix_width - 1);
                let min_y = y.saturating_sub(1);
                let max_y = (y + 1).min(matrix_width - 1);
                let mut sum = 0.0;
                let mut count = 0.0;

                for sample_y in min_y..=max_y {
                    for sample_x in min_x..=max_x {
                        sum += luminance[(sample_y * matrix_width) + sample_x];
                        count += 1.0;
                    }
                }

                threshold[(y * matrix_width) + x] = if count > 0.0 { sum / count } else { 0.5 };
            }
        }

        Self {
            width: matrix_width,
            image: asset.image,
            svg_data_url: asset.svg_data_url,
            sampled_colors,
            luminance,
            threshold,
        }
    }

    fn svg_data_url(&self) -> &str {
        &self.svg_data_url
    }

    fn color_at(&self, cell_x: usize, cell_y: usize) -> Rgba<u8> {
        self.sampled_colors[(cell_y.min(self.width - 1) * self.width) + cell_x.min(self.width - 1)]
    }

    fn luminance_at(&self, cell_x: usize, cell_y: usize) -> f32 {
        self.luminance[(cell_y.min(self.width - 1) * self.width) + cell_x.min(self.width - 1)]
    }

    fn adaptive_signal(&self, cell_x: usize, cell_y: usize) -> f32 {
        let index = (cell_y.min(self.width - 1) * self.width) + cell_x.min(self.width - 1);
        ((self.threshold[index] - self.luminance[index]) * 0.85 + 0.5).clamp(0.0, 1.0)
    }
}

impl LogoOverlay {
    fn contains_cell(&self, cell_x: usize, cell_y: usize, matrix_width: usize) -> bool {
        let (left, top, right, bottom) = self.zone_bounds(matrix_width);
        let center_x = cell_x as f32 + 0.5;
        let center_y = cell_y as f32 + 0.5;

        center_x >= left && center_x <= right && center_y >= top && center_y <= bottom
    }

    fn ring_weight(&self, cell_x: usize, cell_y: usize, matrix_width: usize) -> f32 {
        let (left, top, right, bottom) = self.zone_bounds(matrix_width);
        let center_x = cell_x as f32 + 0.5;
        let center_y = cell_y as f32 + 0.5;
        let dx = if center_x < left {
            left - center_x
        } else if center_x > right {
            center_x - right
        } else {
            0.0
        };
        let dy = if center_y < top {
            top - center_y
        } else if center_y > bottom {
            center_y - bottom
        } else {
            0.0
        };
        let distance = dx.max(dy);

        if distance <= 0.0 || distance >= 2.5 {
            0.0
        } else {
            1.0 - (distance / 2.5)
        }
    }

    fn zone_bounds(&self, matrix_width: usize) -> (f32, f32, f32, f32) {
        let center = matrix_width as f32 / 2.0;
        let half = ((matrix_width as f32) * (self.scale + 0.06).clamp(0.18, 0.34)) / 2.0;

        (center - half, center - half, center + half, center + half)
    }

    fn grid_bounds(&self, matrix_width: usize, quiet_zone: usize) -> (f32, f32, f32) {
        let center = quiet_zone as f32 + matrix_width as f32 / 2.0;
        let size = ((matrix_width as f32) * self.scale).clamp(4.0, matrix_width as f32 * 0.28);
        let half = size / 2.0;

        (center - half, center - half, size)
    }

    fn svg_bounds(&self, matrix_width: usize, quiet_zone: usize) -> (f32, f32, f32) {
        self.grid_bounds(matrix_width, quiet_zone)
    }
}

pub fn build_artistic_render_config(
    preset: ArtisticPreset,
    camouflage: f32,
    perception_mode: PerceptionMode,
    perception_strength: f32,
    reference_image: Option<&str>,
    logo_image: Option<&str>,
    logo_scale: f32,
    matrix_width: usize,
) -> Result<ArtisticRenderConfig, AppError> {
    let reference = reference_image
        .map(|raw| decode_image_data_url(raw, "reference_image"))
        .transpose()?
        .map(|asset| ReferenceMap::from_asset(asset, matrix_width));
    let logo = logo_image
        .map(|raw| decode_image_data_url(raw, "logo_image"))
        .transpose()?
        .map(|asset| LogoOverlay {
            image: asset.image,
            svg_data_url: asset.svg_data_url,
            scale: logo_scale.clamp(0.14, 0.30),
        });

    Ok(ArtisticRenderConfig {
        preset,
        camouflage: camouflage.clamp(0.0, 1.0),
        perception_mode,
        perception_strength: perception_strength.clamp(0.0, 1.0),
        reference,
        logo,
    })
}

pub fn validate_image_payload(value: &str, field_name: &str) -> Result<(), AppError> {
    decode_image_data_url(value, field_name).map(|_| ())
}

pub(crate) fn svg_color(color: Rgba<u8>) -> String {
    if color[3] >= 255 {
        format!("#{:02X}{:02X}{:02X}", color[0], color[1], color[2])
    } else {
        format!(
            "rgba({}, {}, {}, {:.4})",
            color[0],
            color[1],
            color[2],
            color[3] as f32 / 255.0,
        )
    }
}

fn decode_image_data_url(value: &str, field_name: &str) -> Result<DecodedImageAsset, AppError> {
    let Some((prefix, encoded)) = value.split_once(',') else {
        return Err(AppError::bad_request(format!(
            "{field_name} must be a base64 image data URL."
        )));
    };

    let normalized_prefix = prefix.trim().to_ascii_lowercase();
    if !matches!(
        normalized_prefix.as_str(),
        "data:image/png;base64" | "data:image/jpeg;base64" | "data:image/jpg;base64" | "data:image/webp;base64"
    ) {
        return Err(AppError::bad_request(format!(
            "{field_name} must be PNG, JPEG, or WebP."
        )));
    }

    let bytes = BASE64
        .decode(encoded.trim())
        .map_err(|_| AppError::bad_request(format!("{field_name} contains invalid base64 data.")))?;

    if bytes.len() > MAX_IMAGE_BYTES {
        return Err(AppError::bad_request(format!(
            "{field_name} exceeds the {MAX_IMAGE_BYTES} byte limit."
        )));
    }

    let dynamic = image::load_from_memory(&bytes)
        .map_err(|_| AppError::bad_request(format!("{field_name} is not a decodable image.")))?;
    let rgba = dynamic.to_rgba8();

    if rgba.width() == 0 || rgba.height() == 0 {
        return Err(AppError::bad_request(format!("{field_name} is empty.")));
    }

    if rgba.width() > MAX_IMAGE_DIMENSION || rgba.height() > MAX_IMAGE_DIMENSION {
        return Err(AppError::bad_request(format!(
            "{field_name} must be at most {MAX_IMAGE_DIMENSION}px on each side."
        )));
    }

    let mut cursor = Cursor::new(Vec::new());
    DynamicImage::ImageRgba8(rgba.clone())
        .write_to(&mut cursor, ImageFormat::Png)
        .map_err(|_| AppError::bad_request(format!("{field_name} could not be normalized.")))?;

    Ok(DecodedImageAsset {
        image: rgba,
        svg_data_url: format!("data:image/png;base64,{}", BASE64.encode(cursor.into_inner())),
    })
}

fn cell_pixel_bounds(
    grid_x: usize,
    grid_y: usize,
    total_modules: usize,
    canvas_size: u32,
) -> (u32, u32, u32, u32) {
    let x0 = ((grid_x as u64) * canvas_size as u64 / total_modules as u64) as u32;
    let x1 = (((grid_x + 1) as u64) * canvas_size as u64 / total_modules as u64) as u32;
    let y0 = ((grid_y as u64) * canvas_size as u64 / total_modules as u64) as u32;
    let y1 = (((grid_y + 1) as u64) * canvas_size as u64 / total_modules as u64) as u32;

    (x0, y0, x1, y1)
}

fn blend_rgba(foreground: Rgba<u8>, background: Rgba<u8>, amount: f32) -> Rgba<u8> {
    let blend = amount.clamp(0.0, 1.0);

    Rgba([
        mix_channel(foreground[0], background[0], blend),
        mix_channel(foreground[1], background[1], blend),
        mix_channel(foreground[2], background[2], blend),
        foreground[3],
    ])
}

fn paint_reference_background(
    canvas: &mut RgbaImage,
    reference: &ReferenceMap,
    x0: u32,
    y0: u32,
    x1: u32,
    y1: u32,
    backdrop: Rgba<u8>,
    wash: f32,
) {
    let width = x1.saturating_sub(x0);
    let height = y1.saturating_sub(y0);
    if width == 0 || height == 0 {
        return;
    }

    let resized = imageops::resize(&reference.image, width, height, imageops::FilterType::CatmullRom);
    for (offset_x, offset_y, pixel) in resized.enumerate_pixels() {
        let filtered = blend_rgba(*pixel, backdrop, wash);
        blend_pixel(canvas, x0 + offset_x, y0 + offset_y, filtered);
    }
}

fn mix_channel(foreground: u8, background: u8, amount: f32) -> u8 {
    ((foreground as f32 * (1.0 - amount)) + (background as f32 * amount)).round() as u8
}

fn relative_luminance_rgba(color: Rgba<u8>) -> f32 {
    fn linear(channel: u8) -> f32 {
        let value = channel as f32 / 255.0;
        if value <= 0.03928 {
            value / 12.92
        } else {
            ((value + 0.055) / 1.055).powf(2.4)
        }
    }

    let red = linear(color[0]);
    let green = linear(color[1]);
    let blue = linear(color[2]);

    (0.2126 * red) + (0.7152 * green) + (0.0722 * blue)
}

fn scramble_rgb(color: Rgba<u8>, seed: usize) -> Rgba<u8> {
    match seed % 3 {
        0 => Rgba([color[1], color[2], color[0], color[3]]),
        1 => Rgba([color[2], color[0], color[1], color[3]]),
        _ => Rgba([color[0], color[2], color[1], color[3]]),
    }
}

fn camouflage_signal(cell_x: usize, cell_y: usize, matrix_width: usize) -> f32 {
    let width = matrix_width.max(1) as f32;
    let fx = cell_x as f32 / width;
    let fy = cell_y as f32 / width;
    let wave = ((fx * 18.0).sin() * 0.55)
        + ((fy * 16.0).cos() * 0.45)
        + ((((cell_x * 31) ^ (cell_y * 17)) % 11) as f32 / 10.0 - 0.5) * 0.5;

    (wave / 1.35).clamp(-1.0, 1.0)
}

fn opaque_rgb(color: Rgba<u8>) -> Rgba<u8> {
    Rgba([color[0], color[1], color[2], 255])
}

fn blend_fill_rect(canvas: &mut RgbaImage, x0: u32, y0: u32, x1: u32, y1: u32, color: Rgba<u8>) {
    if x0 >= x1 || y0 >= y1 {
        return;
    }

    for y in y0..y1.min(canvas.height()) {
        for x in x0..x1.min(canvas.width()) {
            blend_pixel(canvas, x, y, color);
        }
    }
}

fn blend_pixel(canvas: &mut RgbaImage, x: u32, y: u32, source: Rgba<u8>) {
    if x >= canvas.width() || y >= canvas.height() {
        return;
    }

    let destination = *canvas.get_pixel(x, y);
    let alpha = source[3] as f32 / 255.0;
    let inverse = 1.0 - alpha;
    let blended = Rgba([
        ((source[0] as f32 * alpha) + (destination[0] as f32 * inverse)).round() as u8,
        ((source[1] as f32 * alpha) + (destination[1] as f32 * inverse)).round() as u8,
        ((source[2] as f32 * alpha) + (destination[2] as f32 * inverse)).round() as u8,
        ((source[3] as f32) + (destination[3] as f32 * inverse)).round().clamp(0.0, 255.0) as u8,
    ]);

    canvas.put_pixel(x, y, blended);
}
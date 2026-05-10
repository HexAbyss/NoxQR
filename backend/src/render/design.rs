use std::f32::consts::PI;

use image::{
    imageops::{overlay, resize, FilterType},
    Rgba, RgbaImage,
};

use super::renderer::{QRFinderBorderStyle, QRFinderCenterStyle, QRFrameStyle, RenderOptions};

#[derive(Debug, Clone, Copy)]
struct FrameMetrics {
    qr_x: u32,
    qr_y: u32,
    qr_size: u32,
}

pub(crate) fn apply_design_layers(
    base_image: &RgbaImage,
    total_modules: usize,
    options: &RenderOptions,
) -> RgbaImage {
    if !design_active(options) {
        return base_image.clone();
    }

    let metrics = resolve_frame_metrics(options.frame_style, options.canvas_size);
    let mut canvas = RgbaImage::from_pixel(options.canvas_size, options.canvas_size, Rgba([0, 0, 0, 0]));

    if options.frame_style != QRFrameStyle::None {
        draw_frame(&mut canvas, metrics, options);
    }

    let mut qr_image = resize(
        base_image,
        metrics.qr_size.max(1),
        metrics.qr_size.max(1),
        FilterType::Nearest,
    );

    if options.gradient_enabled {
        let gradient_end = if same_rgb(options.center_rgba, options.foreground_rgba) {
            options.border_rgba
        } else {
            options.center_rgba
        };
        apply_gradient(
            &mut qr_image,
            options.foreground_rgba,
            gradient_end,
            options.background_rgba,
            options.transparent_background,
        );
    }

    overlay(&mut canvas, &qr_image, metrics.qr_x.into(), metrics.qr_y.into());

    if finder_design_active(options) {
        draw_finder_overlays(&mut canvas, metrics, total_modules, options);
    }

    canvas
}

fn design_active(options: &RenderOptions) -> bool {
    options.frame_style != QRFrameStyle::None
        || finder_design_active(options)
        || options.gradient_enabled
}

fn finder_design_active(options: &RenderOptions) -> bool {
    options.finder_border_style != QRFinderBorderStyle::Square
        || options.finder_center_style != QRFinderCenterStyle::Square
}

fn resolve_frame_metrics(style: QRFrameStyle, canvas_size: u32) -> FrameMetrics {
    if style == QRFrameStyle::None {
        return FrameMetrics {
            qr_x: 0,
            qr_y: 0,
            qr_size: canvas_size,
        };
    }

    let (qr_size_ratio, y_ratio) = match style {
        QRFrameStyle::Circle => (0.66, 0.17),
        QRFrameStyle::Phone => (0.62, 0.2),
        _ => (0.74, 0.12),
    };
    let qr_size = ((canvas_size as f32) * qr_size_ratio).round() as u32;
    let qr_x = (canvas_size.saturating_sub(qr_size)) / 2;
    let max_y = canvas_size.saturating_sub(qr_size);
    let qr_y = (((canvas_size as f32) * y_ratio).round() as u32).min(max_y);

    FrameMetrics {
        qr_x,
        qr_y,
        qr_size,
    }
}

fn draw_frame(canvas: &mut RgbaImage, metrics: FrameMetrics, options: &RenderOptions) {
    let border = with_alpha(options.border_rgba, 255);
    let shell = resolve_frame_surface(options);
    let shell_accent = mix_colors(shell, border, 0.18);
    let inset = ((canvas.width() as f32) * 0.04).round().max(6.0) as i32;
    let stroke = ((canvas.width() as f32) * 0.02).round().max(4.0) as i32;
    let body_x = inset;
    let body_y = inset;
    let body_w = canvas.width() as i32 - inset * 2;
    let body_h = canvas.height() as i32 - inset * 2;
    let radius = ((canvas.width() as f32) * 0.1).round().max(18.0) as i32;

    match options.frame_style {
        QRFrameStyle::None => {}
        QRFrameStyle::Rounded => {
            draw_rounded_shell(canvas, body_x, body_y, body_w, body_h, radius, stroke, border, shell);
        }
        QRFrameStyle::Card => {
            draw_rounded_shell(canvas, body_x, body_y, body_w, body_h, radius, stroke, border, shell);
            let tab_w = ((canvas.width() as f32) * 0.22).round() as i32;
            let tab_h = ((canvas.height() as f32) * 0.08).round() as i32;
            let tab_x = (canvas.width() as i32 - tab_w) / 2;
            let tab_y = inset / 3;
            draw_rounded_shell(canvas, tab_x, tab_y, tab_w, tab_h, tab_h / 2, (stroke / 2).max(2), border, shell_accent);
        }
        QRFrameStyle::Circle => {
            let radius = ((canvas.width().min(canvas.height()) as f32) * 0.42).round() as i32;
            let center_x = canvas.width() as i32 / 2;
            let center_y = canvas.height() as i32 / 2;
            fill_circle(canvas, center_x, center_y, radius, border);
            fill_circle(canvas, center_x, center_y, (radius - stroke).max(1), shell);
        }
        QRFrameStyle::Phone => {
            draw_rounded_shell(
                canvas,
                body_x,
                body_y,
                body_w,
                body_h,
                ((canvas.width() as f32) * 0.13).round() as i32,
                stroke,
                border,
                shell,
            );

            let speaker_w = ((canvas.width() as f32) * 0.18).round() as i32;
            let speaker_h = ((canvas.height() as f32) * 0.02).round().max(4.0) as i32;
            let speaker_x = (canvas.width() as i32 - speaker_w) / 2;
            let speaker_y = body_y + ((canvas.height() as f32) * 0.05).round() as i32;
            fill_rounded_rect(canvas, speaker_x, speaker_y, speaker_w, speaker_h, speaker_h / 2, mix_colors(shell, border, 0.3));
        }
        QRFrameStyle::Hanger => {
            draw_rounded_shell(canvas, body_x, body_y, body_w, body_h, radius, stroke, border, shell);
            let loop_w = ((canvas.width() as f32) * 0.16).round() as i32;
            let loop_h = ((canvas.height() as f32) * 0.06).round() as i32;
            let loop_x = (canvas.width() as i32 - loop_w) / 2;
            let loop_y = inset / 3;
            draw_rounded_shell(canvas, loop_x, loop_y, loop_w, loop_h, loop_h / 2, (stroke / 2).max(2), border, shell_accent);
        }
        QRFrameStyle::Ticket => {
            draw_rounded_shell(canvas, body_x, body_y, body_w, body_h, radius, stroke, border, shell);
            let notch_radius = ((canvas.width() as f32) * 0.045).round().max(10.0) as i32;
            let notch_y = body_y + ((body_h as f32) * 0.62).round() as i32;
            fill_circle(canvas, body_x, notch_y, notch_radius, Rgba([0, 0, 0, 0]));
            fill_circle(canvas, body_x + body_w, notch_y, notch_radius, Rgba([0, 0, 0, 0]));
        }
        QRFrameStyle::Ribbon => {
            draw_rounded_shell(canvas, body_x, body_y, body_w, body_h, radius, stroke, border, shell);
            let ribbon_w = ((canvas.width() as f32) * 0.36).round() as f32;
            let ribbon_h = ((canvas.height() as f32) * 0.1).round() as f32;
            let ribbon_x = (canvas.width() as f32 - ribbon_w) / 2.0;
            let ribbon_y = canvas.height() as f32 - inset as f32 - ribbon_h * 0.9;
            let outer = vec![
                (ribbon_x, ribbon_y),
                (ribbon_x + ribbon_w, ribbon_y),
                (ribbon_x + ribbon_w - ribbon_h * 0.18, ribbon_y + ribbon_h),
                (ribbon_x + ribbon_w * 0.5, ribbon_y + ribbon_h * 0.86),
                (ribbon_x + ribbon_h * 0.18, ribbon_y + ribbon_h),
            ];
            let inner = inset_polygon(&outer, ribbon_x + ribbon_w / 2.0, ribbon_y + ribbon_h / 2.0, 0.88);
            fill_polygon(canvas, &outer, border);
            fill_polygon(canvas, &inner, shell_accent);
        }
    }

    let qr_border = mix_colors(border, shell, 0.4);
    let qr_padding = ((metrics.qr_size as f32) * 0.05).round().max(4.0) as i32;
    draw_rounded_shell(
        canvas,
        metrics.qr_x as i32 - qr_padding,
        metrics.qr_y as i32 - qr_padding,
        metrics.qr_size as i32 + qr_padding * 2,
        metrics.qr_size as i32 + qr_padding * 2,
        ((metrics.qr_size as f32) * 0.05).round().max(8.0) as i32,
        (stroke / 2).max(2),
        qr_border,
        shell,
    );
}

fn draw_finder_overlays(
    canvas: &mut RgbaImage,
    metrics: FrameMetrics,
    total_modules: usize,
    options: &RenderOptions,
) {
    let module_size = metrics.qr_size as f32 / total_modules as f32;
    let finder_size = module_size * 7.0;
    let finder_inner_size = module_size * 3.0;
    let quiet_zone = module_size * 4.0;
    let far_edge = metrics.qr_size as f32 - quiet_zone - finder_size;
    let positions = [
        (metrics.qr_x as f32 + quiet_zone, metrics.qr_y as f32 + quiet_zone),
        (metrics.qr_x as f32 + far_edge, metrics.qr_y as f32 + quiet_zone),
        (metrics.qr_x as f32 + quiet_zone, metrics.qr_y as f32 + far_edge),
    ];
    let background = if options.transparent_background {
        Rgba([0, 0, 0, 0])
    } else {
        options.background_rgba
    };
    let border = with_alpha(options.border_rgba, 245);
    let center = with_alpha(options.center_rgba, 245);

    for (x, y) in positions {
        fill_rect(
            canvas,
            x.floor() as i32,
            y.floor() as i32,
            (x + finder_size).ceil() as i32,
            (y + finder_size).ceil() as i32,
            background,
        );

        draw_finder_border(canvas, options.finder_border_style, x, y, finder_size, module_size, border, background);
        draw_finder_center(
            canvas,
            options.finder_center_style,
            x + module_size * 2.0,
            y + module_size * 2.0,
            finder_inner_size,
            center,
        );
    }
}

fn draw_finder_border(
    canvas: &mut RgbaImage,
    style: QRFinderBorderStyle,
    x: f32,
    y: f32,
    size: f32,
    module_size: f32,
    border: Rgba<u8>,
    background: Rgba<u8>,
) {
    let hole_x = x + module_size * 2.0;
    let hole_y = y + module_size * 2.0;
    let hole_size = module_size * 3.0;

    match style {
        QRFinderBorderStyle::Square => {
            fill_rect(canvas, x.floor() as i32, y.floor() as i32, (x + size).ceil() as i32, (y + size).ceil() as i32, border);
            fill_rect(
                canvas,
                hole_x.floor() as i32,
                hole_y.floor() as i32,
                (hole_x + hole_size).ceil() as i32,
                (hole_y + hole_size).ceil() as i32,
                background,
            );
        }
        QRFinderBorderStyle::Rounded => {
            fill_rounded_rect(canvas, x as i32, y as i32, size as i32, size as i32, (size * 0.18) as i32, border);
            fill_rounded_rect(
                canvas,
                hole_x as i32,
                hole_y as i32,
                hole_size as i32,
                hole_size as i32,
                (hole_size * 0.2) as i32,
                background,
            );
        }
        QRFinderBorderStyle::Circle => {
            let center_x = (x + size / 2.0).round() as i32;
            let center_y = (y + size / 2.0).round() as i32;
            fill_circle(canvas, center_x, center_y, (size / 2.0).round() as i32, border);
            fill_circle(canvas, center_x, center_y, (hole_size / 2.0).round() as i32, background);
        }
        QRFinderBorderStyle::Leaf => {
            let outer = leaf_points(x + size / 2.0, y + size / 2.0, size);
            let inner = leaf_points(hole_x + hole_size / 2.0, hole_y + hole_size / 2.0, hole_size);
            fill_polygon(canvas, &outer, border);
            fill_polygon(canvas, &inner, background);
        }
        QRFinderBorderStyle::Bubble => {
            fill_rounded_rect(canvas, x as i32, y as i32, size as i32, size as i32, (size * 0.2) as i32, border);
            fill_polygon(
                canvas,
                &[
                    (x + size * 0.7, y + size),
                    (x + size * 0.88, y + size * 1.12),
                    (x + size * 0.78, y + size * 0.86),
                ],
                border,
            );
            fill_rounded_rect(
                canvas,
                hole_x as i32,
                hole_y as i32,
                hole_size as i32,
                hole_size as i32,
                (hole_size * 0.18) as i32,
                background,
            );
        }
        QRFinderBorderStyle::Focus => {
            let thickness = module_size.round().max(2.0) as i32;
            let segment = (size * 0.26).round() as i32;
            let x0 = x.round() as i32;
            let y0 = y.round() as i32;
            let x1 = (x + size).round() as i32;
            let y1 = (y + size).round() as i32;
            fill_rect(canvas, x0, y0, x0 + segment, y0 + thickness, border);
            fill_rect(canvas, x0, y0, x0 + thickness, y0 + segment, border);
            fill_rect(canvas, x1 - segment, y0, x1, y0 + thickness, border);
            fill_rect(canvas, x1 - thickness, y0, x1, y0 + segment, border);
            fill_rect(canvas, x0, y1 - thickness, x0 + segment, y1, border);
            fill_rect(canvas, x0, y1 - segment, x0 + thickness, y1, border);
            fill_rect(canvas, x1 - segment, y1 - thickness, x1, y1, border);
            fill_rect(canvas, x1 - thickness, y1 - segment, x1, y1, border);
        }
        QRFinderBorderStyle::Cut => {
            let outer = octagon_points(x, y, size, size * 0.18);
            let inner = octagon_points(hole_x, hole_y, hole_size, hole_size * 0.18);
            fill_polygon(canvas, &outer, border);
            fill_polygon(canvas, &inner, background);
        }
        QRFinderBorderStyle::SoftSquare => {
            fill_rounded_rect(canvas, x as i32, y as i32, size as i32, size as i32, (size * 0.28) as i32, border);
            fill_rounded_rect(
                canvas,
                hole_x as i32,
                hole_y as i32,
                hole_size as i32,
                hole_size as i32,
                (hole_size * 0.24) as i32,
                background,
            );
        }
    }
}

fn draw_finder_center(
    canvas: &mut RgbaImage,
    style: QRFinderCenterStyle,
    x: f32,
    y: f32,
    size: f32,
    color: Rgba<u8>,
) {
    match style {
        QRFinderCenterStyle::Square => {
            fill_rect(canvas, x.floor() as i32, y.floor() as i32, (x + size).ceil() as i32, (y + size).ceil() as i32, color);
        }
        QRFinderCenterStyle::Rounded => {
            fill_rounded_rect(canvas, x as i32, y as i32, size as i32, size as i32, (size * 0.24) as i32, color);
        }
        QRFinderCenterStyle::Circle => {
            fill_circle(canvas, (x + size / 2.0).round() as i32, (y + size / 2.0).round() as i32, (size / 2.0).round() as i32, color);
        }
        QRFinderCenterStyle::Leaf => {
            fill_polygon(canvas, &leaf_points(x + size / 2.0, y + size / 2.0, size), color);
        }
        QRFinderCenterStyle::Burst => {
            fill_polygon(canvas, &star_points(x + size / 2.0, y + size / 2.0, size * 0.52, size * 0.32, 10), color);
        }
        QRFinderCenterStyle::Star => {
            fill_polygon(canvas, &star_points(x + size / 2.0, y + size / 2.0, size * 0.52, size * 0.24, 5), color);
        }
        QRFinderCenterStyle::Diamond => {
            fill_polygon(
                canvas,
                &[
                    (x + size / 2.0, y),
                    (x + size, y + size / 2.0),
                    (x + size / 2.0, y + size),
                    (x, y + size / 2.0),
                ],
                color,
            );
        }
        QRFinderCenterStyle::Cross => {
            let thickness = (size * 0.32).round() as i32;
            let mid_x = (x + size / 2.0).round() as i32;
            let mid_y = (y + size / 2.0).round() as i32;
            fill_rect(
                canvas,
                mid_x - thickness / 2,
                y.round() as i32,
                mid_x + thickness / 2,
                (y + size).round() as i32,
                color,
            );
            fill_rect(
                canvas,
                x.round() as i32,
                mid_y - thickness / 2,
                (x + size).round() as i32,
                mid_y + thickness / 2,
                color,
            );
        }
    }
}

fn apply_gradient(
    image: &mut RgbaImage,
    start: Rgba<u8>,
    end: Rgba<u8>,
    background: Rgba<u8>,
    transparent_background: bool,
) {
    let width = image.width().max(1);
    let height = image.height().max(1);
    let denominator = (width.saturating_sub(1) + height.saturating_sub(1)).max(1) as f32;

    for y in 0..height {
        for x in 0..width {
            let pixel = image.get_pixel_mut(x, y);

            if transparent_background && pixel[3] == 0 {
                continue;
            }

            if !transparent_background && *pixel == background {
                continue;
            }

            let t = (x + y) as f32 / denominator;
            pixel[0] = lerp_u8(start[0], end[0], t);
            pixel[1] = lerp_u8(start[1], end[1], t);
            pixel[2] = lerp_u8(start[2], end[2], t);
        }
    }
}

fn resolve_frame_surface(options: &RenderOptions) -> Rgba<u8> {
    if !options.transparent_background {
        return options.background_rgba;
    }

    let luminance = (0.2126 * options.foreground_rgba[0] as f32
        + 0.7152 * options.foreground_rgba[1] as f32
        + 0.0722 * options.foreground_rgba[2] as f32)
        / 255.0;

    if luminance > 0.45 {
        Rgba([22, 27, 34, 255])
    } else {
        Rgba([246, 249, 252, 255])
    }
}

fn draw_rounded_shell(
    canvas: &mut RgbaImage,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
    radius: i32,
    stroke: i32,
    border: Rgba<u8>,
    fill: Rgba<u8>,
) {
    fill_rounded_rect(canvas, x, y, width, height, radius, border);
    fill_rounded_rect(
        canvas,
        x + stroke,
        y + stroke,
        width - stroke * 2,
        height - stroke * 2,
        (radius - stroke).max(1),
        fill,
    );
}

fn fill_rect(canvas: &mut RgbaImage, x0: i32, y0: i32, x1: i32, y1: i32, color: Rgba<u8>) {
    let width = canvas.width() as i32;
    let height = canvas.height() as i32;
    let x0 = x0.clamp(0, width);
    let x1 = x1.clamp(0, width);
    let y0 = y0.clamp(0, height);
    let y1 = y1.clamp(0, height);

    if x0 >= x1 || y0 >= y1 {
        return;
    }

    for y in y0..y1 {
        for x in x0..x1 {
            canvas.put_pixel(x as u32, y as u32, color);
        }
    }
}

fn fill_circle(canvas: &mut RgbaImage, center_x: i32, center_y: i32, radius: i32, color: Rgba<u8>) {
    if radius <= 0 {
        return;
    }

    let min_x = (center_x - radius).max(0);
    let max_x = (center_x + radius).min(canvas.width() as i32 - 1);
    let min_y = (center_y - radius).max(0);
    let max_y = (center_y + radius).min(canvas.height() as i32 - 1);
    let radius_squared = radius * radius;

    for y in min_y..=max_y {
        for x in min_x..=max_x {
            let dx = x - center_x;
            let dy = y - center_y;

            if dx * dx + dy * dy <= radius_squared {
                canvas.put_pixel(x as u32, y as u32, color);
            }
        }
    }
}

fn fill_rounded_rect(
    canvas: &mut RgbaImage,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
    radius: i32,
    color: Rgba<u8>,
) {
    if width <= 0 || height <= 0 {
        return;
    }

    let radius = radius.max(0).min(width / 2).min(height / 2);
    fill_rect(canvas, x + radius, y, x + width - radius, y + height, color);
    fill_rect(canvas, x, y + radius, x + width, y + height - radius, color);
    fill_circle(canvas, x + radius, y + radius, radius, color);
    fill_circle(canvas, x + width - radius - 1, y + radius, radius, color);
    fill_circle(canvas, x + radius, y + height - radius - 1, radius, color);
    fill_circle(canvas, x + width - radius - 1, y + height - radius - 1, radius, color);
}

fn fill_polygon(canvas: &mut RgbaImage, points: &[(f32, f32)], color: Rgba<u8>) {
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
            if point_in_polygon(x as f32 + 0.5, y as f32 + 0.5, points) {
                canvas.put_pixel(x as u32, y as u32, color);
            }
        }
    }
}

fn point_in_polygon(x: f32, y: f32, points: &[(f32, f32)]) -> bool {
    let mut inside = false;
    let mut previous = points.len() - 1;

    for (index, &(xi, yi)) in points.iter().enumerate() {
        let (xj, yj) = points[previous];
        let intersects = ((yi > y) != (yj > y))
            && (x < (((xj - xi) * (y - yi)) / ((yj - yi) + f32::EPSILON)) + xi);

        if intersects {
            inside = !inside;
        }

        previous = index;
    }

    inside
}

fn leaf_points(cx: f32, cy: f32, size: f32) -> Vec<(f32, f32)> {
    let half = size / 2.0;

    vec![
        (cx, cy - half),
        (cx + half * 0.52, cy - half * 0.86),
        (cx + half * 0.92, cy - half * 0.04),
        (cx + half * 0.3, cy + half * 0.92),
        (cx, cy + half),
        (cx - half * 0.42, cy + half * 0.1),
        (cx - half * 0.96, cy),
        (cx - half * 0.5, cy - half * 0.88),
    ]
}

fn star_points(cx: f32, cy: f32, outer_radius: f32, inner_radius: f32, spikes: usize) -> Vec<(f32, f32)> {
    let step = PI / spikes as f32;

    (0..spikes * 2)
        .map(|index| {
            let radius = if index % 2 == 0 { outer_radius } else { inner_radius };
            let angle = index as f32 * step - PI / 2.0;
            (cx + angle.cos() * radius, cy + angle.sin() * radius)
        })
        .collect()
}

fn octagon_points(x: f32, y: f32, width: f32, cut: f32) -> Vec<(f32, f32)> {
    vec![
        (x + cut, y),
        (x + width - cut, y),
        (x + width, y + cut),
        (x + width, y + width - cut),
        (x + width - cut, y + width),
        (x + cut, y + width),
        (x, y + width - cut),
        (x, y + cut),
    ]
}

fn inset_polygon(points: &[(f32, f32)], center_x: f32, center_y: f32, scale: f32) -> Vec<(f32, f32)> {
    points
        .iter()
        .map(|(x, y)| {
            (
                center_x + (x - center_x) * scale,
                center_y + (y - center_y) * scale,
            )
        })
        .collect()
}

fn same_rgb(left: Rgba<u8>, right: Rgba<u8>) -> bool {
    left[0] == right[0] && left[1] == right[1] && left[2] == right[2]
}

fn with_alpha(color: Rgba<u8>, alpha: u8) -> Rgba<u8> {
    Rgba([color[0], color[1], color[2], alpha])
}

fn mix_colors(left: Rgba<u8>, right: Rgba<u8>, t: f32) -> Rgba<u8> {
    let t = t.clamp(0.0, 1.0);
    Rgba([
        lerp_u8(left[0], right[0], t),
        lerp_u8(left[1], right[1], t),
        lerp_u8(left[2], right[2], t),
        lerp_u8(left[3], right[3], t),
    ])
}

fn lerp_u8(start: u8, end: u8, t: f32) -> u8 {
    ((start as f32) + ((end as f32 - start as f32) * t.clamp(0.0, 1.0))).round() as u8
}
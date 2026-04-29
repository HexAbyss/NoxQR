# NOX Engine Overview

## Scope

This document describes the implemented engine layers through Phase 3.

- Phase 0: structural foundation
- Phase 1: core encoding control
- Phase 2: rendering engine
- Phase 3: reliability engine

The current implementation preserves the existing public API while making the QR engine structurally aware and visually extensible.

## Layer Summary

### Phase 0

The backend is split into stable responsibilities:

- `api`: Axum handlers and HTTP entry points
- `engine`: orchestration of validation, encoding, and rendering
- `core`: QR structure and parser logic
- `render`: renderer abstraction plus concrete styles
- `validation`: request guardrails and safety checks

From Phase 3 onward, `validation` also owns post-render reliability analysis.

### Phase 1

The QR matrix is no longer treated as a flat boolean grid.

Each module is parsed into a semantic role:

- `Data`
- `Finder`
- `Alignment`
- `Timing`
- `Format`
- `Version`
- `FixedDark`
- `QuietZone`

Each parsed module also has an importance score. That score is used by renderers to decide how much freedom they have when applying visual expression.

Current importance model:

- `Finder` → `1.0`
- `Alignment` → `0.9`
- `Timing` → `0.85`
- `Format` → `0.8`
- `Version` → `0.75`
- `FixedDark` → `0.7`
- `Data` → `0.6`
- `QuietZone` → `1.0`

### Phase 2

Rendering is now organized around a renderer contract instead of direct style branching inside the pipeline.

Each renderer receives:

- `QrMatrix`
- render options such as canvas size, colors, and quiet zone
- per-module geometry, importance, and transform context

Each renderer produces:

- SVG output
- PNG raster output through the same engine path

This keeps SVG and PNG aligned and makes style expansion cheaper.

### Phase 3

Reliability is now measured from the actual rendered output before the API response is finalized.

Current validation result includes:

- score from `0.0` to `1.0`
- risk bucket: `low`, `medium`, or `high`
- core metrics for contrast, distortion, density, and quiet zone integrity
- decode simulation results across hostile scan conditions
- suggestions and any auto-corrections applied by the engine

Current simulation set:

- `baseline`
- `blur`
- `distance`
- `low_light`

The backend composites transparent output against the chosen background, converts the image to grayscale, and tries to decode each simulation through `rqrr`.

If the score falls below the correction threshold, the engine re-renders with a conservative safety bias that reduces transform freedom before returning the final response.

## Strict vs Expressive Rendering

The engine deliberately distinguishes between modules that must remain rigid and modules that can absorb style.

Strict rendering is currently limited to:

- `Finder`
- `Alignment`

This is important because earlier behavior forced all structural modules to render as squares, which leaked square artifacts into styles like dots and lines. That bug is now fixed: only the reading patterns that truly need strict geometry stay square.

## Supported Renderers

Current style set:

- `square`
- `dots`
- `lines`
- `triangles`
- `hexagons`
- `blobs`
- `glyphs`
- `fractal`

### Style Notes

- `square`: baseline renderer with controlled rounding and scale variation
- `dots`: circular modules with local positional modulation
- `lines`: horizontal, vertical, and diagonal strokes
- `triangles`: angular modules with controlled rotation
- `hexagons`: denser honeycomb-style packing
- `blobs`: clustered organic circles for softer silhouettes
- `glyphs`: crossed bar primitives for graphic symbol-like modules
- `fractal`: nested sub-shapes inside a single module cell

## Rendering Controls

The Phase 2 engine already supports controlled local transformations per module:

- positional offsets
- scale variation
- rotation bias

These transforms are constrained by module importance so the system can grow artistically without discarding QR structure.

## Files to Know

- `backend/src/core/matrix.rs`
- `backend/src/core/encoding.rs`
- `backend/src/engine/pipeline.rs`
- `backend/src/render/renderer.rs`
- `backend/src/render/styles/`

## Current Boundaries

Implemented now:

- structural parsing
- role-aware rendering
- multi-style rendering engine
- shared SVG and PNG generation path
- post-render reliability scoring
- hostile scan simulation and decode verification
- conservative auto-correction with suggestion output

Not implemented yet:

- smart gradients exposed as first-class renderer options

Future work can still deepen the reliability layer with more simulation types, adaptive color correction, and style-specific safety presets.

Those belong to later phases in the roadmap.
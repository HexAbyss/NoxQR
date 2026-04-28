"use client";

/*
 * NOX - a Visual Encoding Engine.
 * Copyright (C) 2026
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { motion } from "framer-motion";
import { Link2, Palette, RefreshCw, ScanLine, SlidersHorizontal, Sparkles } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { useQRStore, type QRStyle } from "@/store/useQRStore";

const STYLE_ORDER: QRStyle[] = ["square", "dots", "lines", "triangles", "hexagons", "blobs", "glyphs", "fractal"];

export interface ControlsPanelCopy {
  eyebrow: string;
  title: string;
  summary: string;
  fields: {
    dataLabel: string;
    dataPlaceholder: string;
    styleLabel: string;
    foregroundLabel: string;
    backgroundLabel: string;
    transparentBackgroundLabel: string;
    transparentBackgroundHint: string;
    transparentBackgroundValue: string;
    sizeLabel: string;
    livePreviewLabel: string;
    livePreviewHint: string;
  };
  styles: Record<QRStyle, { label: string; note: string }>;
  buttons: {
    generate: string;
    generating: string;
  };
  helpers: {
    sizeHint: string;
    autoHint: string;
    manualHint: string;
  };
}

interface ControlsPanelProps {
  copy: ControlsPanelCopy;
}

export function ControlsPanel({ copy }: Readonly<ControlsPanelProps>) {
  const {
    data,
    style,
    color,
    background,
    transparent_background,
    size,
    livePreview,
    loading,
    error,
    setData,
    setStyle,
    setColor,
    setBackground,
    setTransparentBackground,
    setSize,
    setLivePreview,
    generate,
  } = useQRStore(
    useShallow((state) => ({
      data: state.data,
      style: state.style,
      color: state.color,
      background: state.background,
      transparent_background: state.transparent_background,
      size: state.size,
      livePreview: state.livePreview,
      loading: state.loading,
      error: state.error,
      setData: state.setData,
      setStyle: state.setStyle,
      setColor: state.setColor,
      setBackground: state.setBackground,
      setTransparentBackground: state.setTransparentBackground,
      setSize: state.setSize,
      setLivePreview: state.setLivePreview,
      generate: state.generate,
    })),
  );

  return (
    <motion.form
      className="glass-panel control-panel"
      initial={{ opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      onSubmit={(event) => {
        event.preventDefault();
        void generate(true);
      }}
    >
      <div className="panel-head">
        <p className="panel-label">{copy.eyebrow}</p>
        <h2 className="panel-title">{copy.title}</h2>
        <p className="panel-copy">{copy.summary}</p>
      </div>

      <div className="panel-editor">
        <label className="field-label" htmlFor="qr-data">
          <Link2 size={15} />
          {copy.fields.dataLabel}
        </label>
        <div className="glass-field">
          <textarea
            id="qr-data"
            className="text-area"
            rows={6}
            value={data}
            onChange={(event) => setData(event.target.value)}
            placeholder={copy.fields.dataPlaceholder}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="panel-stack">
        <section className="panel-block">
          <div className="field-label">
            <Sparkles size={15} />
            {copy.fields.styleLabel}
          </div>
          <div className="style-grid">
            {STYLE_ORDER.map((option) => (
              <button
                key={option}
                type="button"
                className="style-button"
                data-active={style === option}
                aria-pressed={style === option}
                onClick={() => setStyle(option)}
              >
                <span className="style-title">{copy.styles[option].label}</span>
                <span className="style-note">{copy.styles[option].note}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel-block">
          <div className="field-label">
            <Palette size={15} />
            {copy.fields.foregroundLabel} / {copy.fields.backgroundLabel}
          </div>

          <div className="background-toggle-row">
            <div>
              <div className="field-label">{copy.fields.transparentBackgroundLabel}</div>
              <p className="field-note">{copy.fields.transparentBackgroundHint}</p>
            </div>

            <button
              type="button"
              className="toggle"
              data-active={transparent_background}
              aria-pressed={transparent_background}
              onClick={() => setTransparentBackground(!transparent_background)}
            >
              <span className="toggle__thumb" />
            </button>
          </div>

          <div className="color-grid">
            <label className="color-field" htmlFor="qr-color">
              <span className="field-label">{copy.fields.foregroundLabel}</span>
              <div className="glass-field">
                <input id="qr-color" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
                <span className="color-token">{color}</span>
              </div>
            </label>

            <label className="color-field" htmlFor="qr-background">
              <span className="field-label">{copy.fields.backgroundLabel}</span>
              <div className="glass-field">
                <input
                  id="qr-background"
                  type="color"
                  value={background}
                  onChange={(event) => setBackground(event.target.value)}
                />
                <span className="color-token">
                  {transparent_background ? copy.fields.transparentBackgroundValue : background}
                </span>
              </div>
            </label>
          </div>
        </section>

        <section className="panel-block">
          <div className="range-row">
            <label className="field-label" htmlFor="qr-size">
              <SlidersHorizontal size={15} />
              {copy.fields.sizeLabel}
            </label>
            <span className="range-value">{size}px</span>
          </div>

          <input
            id="qr-size"
            type="range"
            min={256}
            max={1024}
            step={32}
            value={size}
            onChange={(event) => setSize(Number(event.target.value))}
          />

          <p className="field-note">{copy.helpers.sizeHint}</p>
        </section>

        <section className="panel-block">
          <div className="toggle-row">
            <div>
              <div className="field-label">
                <RefreshCw size={15} />
                {copy.fields.livePreviewLabel}
              </div>
              <p className="field-note">{copy.fields.livePreviewHint}</p>
            </div>

            <button
              type="button"
              className="toggle"
              data-active={livePreview}
              aria-pressed={livePreview}
              onClick={() => setLivePreview(!livePreview)}
            >
              <span className="toggle__thumb" />
            </button>
          </div>
        </section>

        {error ? <div className="error-banner">{error}</div> : null}

        <div className="action-row">
          <button type="submit" className="action-button action-button--primary" disabled={loading || !data.trim()}>
            <ScanLine size={16} />
            {loading ? copy.buttons.generating : copy.buttons.generate}
          </button>
          <p className="keyboard-hint">{livePreview ? copy.helpers.autoHint : copy.helpers.manualHint}</p>
        </div>
      </div>
    </motion.form>
  );
}
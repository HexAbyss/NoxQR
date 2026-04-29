"use client";

/*
 * NOX - a Visual Encoding Engine.
 * Copyright (C) 2026
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Download, ScanLine, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import type { ValidationRisk, ValidationResult } from "@/lib/api/qrClient";
import { useQRStore } from "@/store/useQRStore";

function sanitizeSvg(svg: string): string {
  const trimmed = svg.trim();

  if (!trimmed.startsWith("<svg")) {
    return "";
  }

  // Strip active content so the demo can render backend SVG without trusting arbitrary embedded markup.
  return trimmed
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+=("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "");
}

export interface QRPreviewCopy {
  eyebrow: string;
  title: string;
  summary: string;
  loadingTitle: string;
  loadingBody: string;
  errorTitle: string;
  emptyTitle: string;
  emptyBody: string;
  successCaption: string;
  meta: {
    style: string;
    canvas: string;
    payload: string;
  };
  status: {
    renderer: string;
    sanitization: string;
    palette: string;
    transparent: string;
  };
  actions: {
    export: string;
  };
  reliability: {
    eyebrow: string;
    title: string;
    summary: string;
    score: string;
    risk: string;
    autoCorrection: string;
    correctionsTitle: string;
    suggestionsTitle: string;
    pass: string;
    fail: string;
    metrics: {
      contrast: string;
      distortion: string;
      density: string;
      quietZone: string;
      simulations: string;
    };
    risks: Record<ValidationRisk, string>;
    simulations: {
      baseline: string;
      blur: string;
      distance: string;
      lowLight: string;
    };
  };
}

interface QRPreviewProps {
  copy: QRPreviewCopy;
  styleLabel: string;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatRatio(value: number) {
  return `${value.toFixed(2)}:1`;
}

function simulationLabel(copy: QRPreviewCopy, name: string) {
  switch (name) {
    case "baseline":
      return copy.reliability.simulations.baseline;
    case "blur":
      return copy.reliability.simulations.blur;
    case "distance":
      return copy.reliability.simulations.distance;
    case "low_light":
      return copy.reliability.simulations.lowLight;
    default:
      return name;
  }
}

function reliabilityStatus(validation: ValidationResult, copy: QRPreviewCopy) {
  return `${copy.reliability.score}: ${formatPercent(validation.score)} · ${copy.reliability.risks[validation.risk]}`;
}

export function QRPreview({ copy, styleLabel }: Readonly<QRPreviewProps>) {
  const { svg, pngBase64, validation, loading, error, data, size, color, background, transparent_background } = useQRStore(
    useShallow((state) => ({
      svg: state.svg,
      pngBase64: state.pngBase64,
      validation: state.validation,
      loading: state.loading,
      error: state.error,
      data: state.data,
      size: state.size,
      color: state.color,
      background: state.background,
      transparent_background: state.transparent_background,
    })),
  );

  const safeSvg = sanitizeSvg(svg);
  const backgroundLabel = transparent_background ? copy.status.transparent : background;
  const downloadFileName = useMemo(() => {
    const baseName =
      data
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "nox-qr";

    return `${baseName}-${size}.png`;
  }, [data, size]);
  const downloadUrl = useMemo(() => {
    if (!pngBase64) {
      return "";
    }

    return pngBase64.startsWith("data:image/") ? pngBase64 : `data:image/png;base64,${pngBase64}`;
  }, [pngBase64]);
  const reliabilityVisible = !loading && !error && !!safeSvg && !!validation;
  const successfulSimulations = validation?.simulations.filter((simulation) => simulation.passed).length ?? 0;

  return (
    <motion.section
      className="glass-panel preview-panel"
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="panel-head">
        <p className="panel-label">{copy.eyebrow}</p>
        <h2 className="panel-title">{copy.title}</h2>
        <p className="panel-copy">{copy.summary}</p>
      </div>

      <div className="meta-strip">
        <div className="meta-item">
          <span>{copy.meta.style}</span>
          <strong>{styleLabel}</strong>
        </div>
        <div className="meta-item">
          <span>{copy.meta.canvas}</span>
          <strong>{size}px</strong>
        </div>
        <div className="meta-item">
          <span>{copy.meta.payload}</span>
          <strong>{data.trim().length}</strong>
        </div>
      </div>

      <div className="preview-shell" aria-live="polite">
        <div className="preview-backdrop" />

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              className="preview-state"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <div className="spinner-shell">
                <div className="spinner" />
              </div>
              <div>
                <h3 className="preview-title">{copy.loadingTitle}</h3>
                <p className="panel-copy">{copy.loadingBody}</p>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              className="preview-error"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <div className="preview-empty__icon">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="preview-title">{copy.errorTitle}</h3>
                <p className="panel-copy">{error}</p>
              </div>
            </motion.div>
          ) : safeSvg ? (
            <motion.div
              key={`${styleLabel}-${size}-${safeSvg.length}`}
              className="preview-canvas"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="preview-glow" style={{ background: `radial-gradient(circle, ${color}55, transparent 70%)` }} />
              {downloadUrl && !loading ? (
                <div className="preview-canvas__action">
                  <a className="action-button" href={downloadUrl} download={downloadFileName}>
                    <Download size={16} />
                    {copy.actions.export}
                  </a>
                </div>
              ) : null}
              <div className="preview-canvas__svg" dangerouslySetInnerHTML={{ __html: safeSvg }} />
              <p className="success-caption">{copy.successCaption}</p>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              className="preview-empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <div className="preview-empty__icon">
                <ScanLine size={22} />
              </div>
              <div>
                <h3 className="preview-title">{copy.emptyTitle}</h3>
                <p className="panel-copy">{copy.emptyBody}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {reliabilityVisible && validation ? (
        <motion.section
          className="reliability-panel"
          data-risk={validation.risk}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="reliability-panel__head">
            <div className="reliability-panel__copy">
              <p className="reliability-panel__eyebrow">{copy.reliability.eyebrow}</p>
              <h3 className="reliability-panel__title">{copy.reliability.title}</h3>
              <p className="panel-copy">{copy.reliability.summary}</p>
            </div>

            <div className="reliability-score" data-risk={validation.risk}>
              <span className="reliability-score__label">{copy.reliability.score}</span>
              <strong className="reliability-score__value">{formatPercent(validation.score)}</strong>
              <span className="reliability-score__risk">
                {copy.reliability.risk}: {copy.reliability.risks[validation.risk]}
              </span>
            </div>
          </div>

          <div className="reliability-meter" aria-hidden="true">
            <span style={{ width: formatPercent(validation.score) }} />
          </div>

          <div className="reliability-metrics">
            <div className="reliability-metric">
              <span className="reliability-metric__label">{copy.reliability.metrics.contrast}</span>
              <strong className="reliability-metric__value">{formatRatio(validation.metrics.contrastRatio)}</strong>
            </div>
            <div className="reliability-metric">
              <span className="reliability-metric__label">{copy.reliability.metrics.distortion}</span>
              <strong className="reliability-metric__value">{formatPercent(1 - validation.metrics.distortion)}</strong>
            </div>
            <div className="reliability-metric">
              <span className="reliability-metric__label">{copy.reliability.metrics.density}</span>
              <strong className="reliability-metric__value">{formatPercent(validation.metrics.density)}</strong>
            </div>
            <div className="reliability-metric">
              <span className="reliability-metric__label">{copy.reliability.metrics.quietZone}</span>
              <strong className="reliability-metric__value">{formatPercent(validation.metrics.quietZoneIntegrity)}</strong>
            </div>
            <div className="reliability-metric">
              <span className="reliability-metric__label">{copy.reliability.metrics.simulations}</span>
              <strong className="reliability-metric__value">
                {successfulSimulations}/{validation.simulations.length}
              </strong>
            </div>
          </div>

          <div className="reliability-simulations">
            {validation.simulations.map((simulation) => (
              <span key={simulation.name} className="reliability-simulation" data-passed={simulation.passed}>
                {simulationLabel(copy, simulation.name)}: {simulation.passed ? copy.reliability.pass : copy.reliability.fail}
              </span>
            ))}
          </div>

          {validation.correctionsApplied.length > 0 ? (
            <div className="reliability-notes">
              <p className="reliability-notes__title">{copy.reliability.correctionsTitle}</p>
              {validation.correctionsApplied.map((item) => (
                <p key={item} className="reliability-notes__item">
                  {item}
                </p>
              ))}
            </div>
          ) : null}

          {validation.suggestions.length > 0 ? (
            <div className="reliability-notes">
              <p className="reliability-notes__title">{copy.reliability.suggestionsTitle}</p>
              {validation.suggestions.map((item) => (
                <p key={item} className="reliability-notes__item">
                  {item}
                </p>
              ))}
            </div>
          ) : null}
        </motion.section>
      ) : null}

      <div className="status-row">
        <span className="status-chip">{copy.status.renderer}</span>
        <span className="status-chip">{copy.status.sanitization}</span>
        {validation ? <span className="status-chip">{reliabilityStatus(validation, copy)}</span> : null}
        <span className="status-chip">
          <Sparkles size={14} />
          {copy.status.palette}: {color} / {backgroundLabel}
        </span>
      </div>
    </motion.section>
  );
}
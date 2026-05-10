"use client";

/*
 * NOX - a Visual Encoding Engine.
 * Copyright (C) 2026
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { motion } from "framer-motion";
import {
  ChevronDown,
  ImageIcon,
  Link2,
  Palette,
  RefreshCw,
  ScanLine,
  Shield,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";

import { localizeRuntimeMessage } from "@/lib/runtimeMessages";
import { useQRStore, type QRArtisticPreset, type QRPerceptionMode, type QRStyle } from "@/store/useQRStore";

const STYLE_ORDER: QRStyle[] = ["square", "dots", "lines", "triangles", "hexagons", "blobs", "glyphs", "fractal"];
const PRESET_ORDER: QRArtisticPreset[] = ["manual", "neon", "ink", "wireframe", "cyberpunk", "minimal", "organic"];
const PERCEPTION_MODE_ORDER: QRPerceptionMode[] = [
  "off",
  "near_invisible",
  "frequency",
  "negative",
  "encrypted",
  "multi_layer",
];
const MAX_IMAGE_BYTES = 2_000_000;
const SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const DEFAULT_SECTION_STATE = {
  preset: false,
  style: false,
  palette: false,
  perception: false,
  camouflage: false,
  reference: false,
  logo: false,
  size: false,
  livePreview: false,
};

type PanelSectionId = keyof typeof DEFAULT_SECTION_STATE;

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("The selected file could not be read."));
    };

    reader.onerror = () => {
      reject(new Error("The selected file could not be read."));
    };

    reader.readAsDataURL(file);
  });
}

export interface ControlsPanelCopy {
  eyebrow: string;
  title: string;
  summary: string;
  fields: {
    dataLabel: string;
    dataPlaceholder: string;
    presetLabel: string;
    presetHint: string;
    styleLabel: string;
    foregroundLabel: string;
    backgroundLabel: string;
    transparentBackgroundLabel: string;
    transparentBackgroundHint: string;
    transparentBackgroundValue: string;
    perceptionModeLabel: string;
    perceptionModeHint: string;
    perceptionStrengthLabel: string;
    perceptionStrengthHint: string;
    camouflageLabel: string;
    camouflageHint: string;
    referenceImageLabel: string;
    referenceImageHint: string;
    logoImageLabel: string;
    logoImageHint: string;
    logoScaleLabel: string;
    logoScaleHint: string;
    sizeLabel: string;
    livePreviewLabel: string;
    livePreviewHint: string;
  };
  styles: Record<QRStyle, { label: string; note: string }>;
  presets: Record<QRArtisticPreset, { label: string; note: string }>;
  perceptionModes: Record<QRPerceptionMode, { label: string; note: string }>;
  buttons: {
    generate: string;
    generating: string;
    upload: string;
    replace: string;
    clear: string;
  };
  helpers: {
    sizeHint: string;
    autoHint: string;
    manualHint: string;
    referenceReady: string;
    logoReady: string;
  };
}

interface ControlsPanelProps {
  copy: ControlsPanelCopy;
}

interface PanelSectionProps {
  title: string;
  icon: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  summary?: string;
  children: ReactNode;
}

function PanelSection({ title, icon, expanded, onToggle, summary, children }: Readonly<PanelSectionProps>) {
  return (
    <section className="panel-block" data-collapsed={!expanded}>
      <button type="button" className="panel-block__toggle" aria-expanded={expanded} onClick={onToggle}>
        <span className="panel-block__toggle-main">
          <span className="field-label">
            {icon}
            {title}
          </span>
        </span>
        <span className="panel-block__toggle-side">
          {summary ? <span className="panel-block__summary">{summary}</span> : null}
          <ChevronDown size={16} className="panel-block__chevron" />
        </span>
      </button>

      {expanded ? <div className="panel-block__content">{children}</div> : null}
    </section>
  );
}

export function ControlsPanel({ copy }: Readonly<ControlsPanelProps>) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<PanelSectionId, boolean>>(DEFAULT_SECTION_STATE);
  const referenceInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const {
    data,
    preset,
    style,
    color,
    background,
    transparent_background,
    camouflage,
    perception_mode,
    perception_strength,
    reference_image,
    logo_image,
    logo_scale,
    size,
    livePreview,
    locale,
    loading,
    error,
    setData,
    setPreset,
    setStyle,
    setColor,
    setBackground,
    setTransparentBackground,
    setCamouflage,
    setPerceptionMode,
    setPerceptionStrength,
    setReferenceImage,
    setLogoImage,
    setLogoScale,
    setSize,
    setLivePreview,
    generate,
  } = useQRStore(
    useShallow((state) => ({
      data: state.data,
      preset: state.preset,
      style: state.style,
      color: state.color,
      background: state.background,
      transparent_background: state.transparent_background,
      camouflage: state.camouflage,
      perception_mode: state.perception_mode,
      perception_strength: state.perception_strength,
      reference_image: state.reference_image,
      logo_image: state.logo_image,
      logo_scale: state.logo_scale,
      size: state.size,
      livePreview: state.livePreview,
      locale: state.locale,
      loading: state.loading,
      error: state.error,
      setData: state.setData,
      setPreset: state.setPreset,
      setStyle: state.setStyle,
      setColor: state.setColor,
      setBackground: state.setBackground,
      setTransparentBackground: state.setTransparentBackground,
      setCamouflage: state.setCamouflage,
      setPerceptionMode: state.setPerceptionMode,
      setPerceptionStrength: state.setPerceptionStrength,
      setReferenceImage: state.setReferenceImage,
      setLogoImage: state.setLogoImage,
      setLogoScale: state.setLogoScale,
      setSize: state.setSize,
      setLivePreview: state.setLivePreview,
      generate: state.generate,
    })),
  );
  const effectivePerceptionMode = reference_image ? perception_mode : "off";

  function toggleSection(section: PanelSectionId) {
    setExpandedSections((state) => ({
      ...state,
      [section]: !state[section],
    }));
  }

  async function handleImageSelection(file: File | undefined, kind: "reference" | "logo") {
    if (!file) {
      return;
    }

    if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
      setUploadError(kind === "reference" ? copy.fields.referenceImageHint : copy.fields.logoImageHint);
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError(kind === "reference" ? copy.fields.referenceImageHint : copy.fields.logoImageHint);
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setUploadError(null);

      if (kind === "reference") {
        setReferenceImage(dataUrl);
        return;
      }

      setLogoImage(dataUrl);
    } catch (selectionError) {
      setUploadError(
        localizeRuntimeMessage(
          selectionError instanceof Error ? selectionError.message : "The selected file could not be read.",
          locale,
        ),
      );
    }
  }

  const combinedError = uploadError ?? error;

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
        <PanelSection
          title={copy.fields.presetLabel}
          icon={<Sparkles size={15} />}
          expanded={expandedSections.preset}
          onToggle={() => toggleSection("preset")}
          summary={copy.presets[preset].label}
        >
          <p className="field-note">{copy.fields.presetHint}</p>
          <div className="style-grid preset-grid">
            {PRESET_ORDER.map((option) => (
              <button
                key={option}
                type="button"
                className="style-button"
                data-active={preset === option}
                aria-pressed={preset === option}
                onClick={() => setPreset(option)}
              >
                <span className="style-title">{copy.presets[option].label}</span>
                <span className="style-note">{copy.presets[option].note}</span>
              </button>
            ))}
          </div>
        </PanelSection>

        <PanelSection
          title={copy.fields.styleLabel}
          icon={<Sparkles size={15} />}
          expanded={expandedSections.style}
          onToggle={() => toggleSection("style")}
          summary={copy.styles[style].label}
        >
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
        </PanelSection>

        <PanelSection
          title={`${copy.fields.foregroundLabel} / ${copy.fields.backgroundLabel}`}
          icon={<Palette size={15} />}
          expanded={expandedSections.palette}
          onToggle={() => toggleSection("palette")}
          summary={transparent_background ? copy.fields.transparentBackgroundValue : `${color} / ${background}`}
        >
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
        </PanelSection>

        <PanelSection
          title={copy.fields.perceptionModeLabel}
          icon={<ScanLine size={15} />}
          expanded={expandedSections.perception}
          onToggle={() => toggleSection("perception")}
          summary={reference_image ? copy.perceptionModes[effectivePerceptionMode].label : copy.perceptionModes.off.label}
        >
          <p className="field-note">{copy.fields.perceptionModeHint}</p>

          <div className="style-grid preset-grid">
            {PERCEPTION_MODE_ORDER.map((option) => {
              const disabled = !reference_image && option !== "off";

              return (
                <button
                  key={option}
                  type="button"
                  className="style-button"
                  data-active={effectivePerceptionMode === option}
                  aria-pressed={effectivePerceptionMode === option}
                  disabled={disabled}
                  onClick={() => setPerceptionMode(option)}
                >
                  <span className="style-title">{copy.perceptionModes[option].label}</span>
                  <span className="style-note">{copy.perceptionModes[option].note}</span>
                </button>
              );
            })}
          </div>

          <div className="range-row">
            <label className="field-label" htmlFor="qr-perception-strength">
              <Sparkles size={15} />
              {copy.fields.perceptionStrengthLabel}
            </label>
            <span className="range-value">{Math.round(perception_strength * 100)}%</span>
          </div>

          <input
            id="qr-perception-strength"
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={perception_strength}
            disabled={!reference_image || effectivePerceptionMode === "off"}
            onChange={(event) => setPerceptionStrength(Number(event.target.value))}
          />

          <p className="field-note">{copy.fields.perceptionStrengthHint}</p>
        </PanelSection>

        <PanelSection
          title={copy.fields.camouflageLabel}
          icon={<Sparkles size={15} />}
          expanded={expandedSections.camouflage}
          onToggle={() => toggleSection("camouflage")}
          summary={`${Math.round(camouflage * 100)}%`}
        >
          <div className="range-row">
            <label className="field-label" htmlFor="qr-camouflage">{copy.fields.camouflageLabel}</label>
            <span className="range-value">{Math.round(camouflage * 100)}%</span>
          </div>

          <input
            id="qr-camouflage"
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={camouflage}
            onChange={(event) => setCamouflage(Number(event.target.value))}
          />

          <p className="field-note">{copy.fields.camouflageHint}</p>
        </PanelSection>

        <PanelSection
          title={copy.fields.referenceImageLabel}
          icon={<ImageIcon size={15} />}
          expanded={expandedSections.reference}
          onToggle={() => toggleSection("reference")}
          summary={reference_image ? copy.buttons.replace : copy.buttons.upload}
        >
          <div className="upload-card">
            <div className="upload-meta">
              <strong>{reference_image ? copy.helpers.referenceReady : copy.buttons.upload}</strong>
              <span>{copy.fields.referenceImageHint}</span>
            </div>
            <div className="upload-actions">
              <input
                ref={referenceInputRef}
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  void handleImageSelection(event.currentTarget.files?.[0], "reference");
                  event.currentTarget.value = "";
                }}
              />
              <button
                type="button"
                className="action-button action-button--secondary"
                onClick={() => {
                  if (referenceInputRef.current) {
                    referenceInputRef.current.value = "";
                    referenceInputRef.current.click();
                  }
                }}
              >
                <ImageIcon size={16} />
                {reference_image ? copy.buttons.replace : copy.buttons.upload}
              </button>
              {reference_image ? (
                <button
                  type="button"
                  className="action-button"
                  onClick={() => {
                    setReferenceImage(null);
                    if (referenceInputRef.current) {
                      referenceInputRef.current.value = "";
                    }
                  }}
                >
                  {copy.buttons.clear}
                </button>
              ) : null}
            </div>
          </div>
        </PanelSection>

        <PanelSection
          title={copy.fields.logoImageLabel}
          icon={<Shield size={15} />}
          expanded={expandedSections.logo}
          onToggle={() => toggleSection("logo")}
          summary={logo_image ? `${Math.round(logo_scale * 100)}%` : copy.buttons.upload}
        >
          <div className="upload-card">
            <div className="upload-meta">
              <strong>{logo_image ? copy.helpers.logoReady : copy.buttons.upload}</strong>
              <span>{copy.fields.logoImageHint}</span>
            </div>
            <div className="upload-actions">
              <input
                ref={logoInputRef}
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  void handleImageSelection(event.currentTarget.files?.[0], "logo");
                  event.currentTarget.value = "";
                }}
              />
              <button
                type="button"
                className="action-button action-button--secondary"
                onClick={() => {
                  if (logoInputRef.current) {
                    logoInputRef.current.value = "";
                    logoInputRef.current.click();
                  }
                }}
              >
                <Shield size={16} />
                {logo_image ? copy.buttons.replace : copy.buttons.upload}
              </button>
              {logo_image ? (
                <button
                  type="button"
                  className="action-button"
                  onClick={() => {
                    setLogoImage(null);
                    if (logoInputRef.current) {
                      logoInputRef.current.value = "";
                    }
                  }}
                >
                  {copy.buttons.clear}
                </button>
              ) : null}
            </div>
          </div>

          <div className="range-row">
            <label className="field-label" htmlFor="qr-logo-scale">
              <SlidersHorizontal size={15} />
              {copy.fields.logoScaleLabel}
            </label>
            <span className="range-value">{Math.round(logo_scale * 100)}%</span>
          </div>

          <input
            id="qr-logo-scale"
            type="range"
            min={0.14}
            max={0.3}
            step={0.01}
            value={logo_scale}
            disabled={!logo_image}
            onChange={(event) => setLogoScale(Number(event.target.value))}
          />

          <p className="field-note">{copy.fields.logoScaleHint}</p>
        </PanelSection>

        <PanelSection
          title={copy.fields.sizeLabel}
          icon={<SlidersHorizontal size={15} />}
          expanded={expandedSections.size}
          onToggle={() => toggleSection("size")}
          summary={`${size}px`}
        >
          <div className="range-row">
            <label className="field-label" htmlFor="qr-size">{copy.fields.sizeLabel}</label>
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
        </PanelSection>

        <PanelSection
          title={copy.fields.livePreviewLabel}
          icon={<RefreshCw size={15} />}
          expanded={expandedSections.livePreview}
          onToggle={() => toggleSection("livePreview")}
        >
          <div className="toggle-row">
            <div>
              <div className="field-label">{copy.fields.livePreviewLabel}</div>
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
        </PanelSection>

        {combinedError ? <div className="error-banner">{combinedError}</div> : null}

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
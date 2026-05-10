/*
 * NOX - a Visual Encoding Engine.
 * Copyright (C) 2026
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  generateQR,
  type GenerateQRPayload,
  type QRArtisticPreset,
  type QRPerceptionMode,
  type QRStyle,
  type ValidationResult,
} from "@/lib/api/qrClient";
import {
  DEFAULT_FINDER_BORDER_STYLE,
  DEFAULT_FINDER_CENTER_STYLE,
  DEFAULT_FRAME_STYLE,
  type QRFinderBorderStyle,
  type QRFinderCenterStyle,
  type QRFrameStyle,
} from "@/lib/studio/designModel";
import {
  buildDraftFromQrData,
  buildQrContentData,
  DEFAULT_QR_CONTENT_DRAFT,
  DEFAULT_QR_CONTENT_TYPE,
  type QRContentDraft,
  type QRContentType,
} from "@/lib/studio/contentModel";
import { localizeRuntimeMessage, localizeValidationResult } from "@/lib/runtimeMessages";

export type Theme = "dark" | "light";
export type Locale = "pt-BR" | "en";

interface QRState extends GenerateQRPayload {
  contentType: QRContentType;
  contentDraft: QRContentDraft;
  frameStyle: QRFrameStyle;
  finderBorderStyle: QRFinderBorderStyle;
  finderCenterStyle: QRFinderCenterStyle;
  borderColor: string;
  centerColor: string;
  gradientEnabled: boolean;
  svg: string;
  pngBase64: string;
  validation: ValidationResult | null;
  loading: boolean;
  error: string | null;
  livePreview: boolean;
  theme: Theme;
  locale: Locale;
  lastGeneratedKey: string | null;
  activeRequestId: number;
  setData: (value: string) => void;
  setContentType: (value: QRContentType) => void;
  setContentField: <Field extends keyof QRContentDraft>(field: Field, value: QRContentDraft[Field]) => void;
  setFrameStyle: (value: QRFrameStyle) => void;
  setFinderBorderStyle: (value: QRFinderBorderStyle) => void;
  setFinderCenterStyle: (value: QRFinderCenterStyle) => void;
  setBorderColor: (value: string) => void;
  setCenterColor: (value: string) => void;
  setGradientEnabled: (value: boolean) => void;
  setStyle: (value: QRStyle) => void;
  setPreset: (value: QRArtisticPreset) => void;
  setColor: (value: string) => void;
  setBackground: (value: string) => void;
  setTransparentBackground: (value: boolean) => void;
  setCamouflage: (value: number) => void;
  setPerceptionMode: (value: QRPerceptionMode) => void;
  setPerceptionStrength: (value: number) => void;
  setReferenceImage: (value: string | null) => void;
  setLogoImage: (value: string | null) => void;
  setLogoScale: (value: number) => void;
  setSize: (value: number) => void;
  setLivePreview: (value: boolean) => void;
  setTheme: (value: Theme) => void;
  setLocale: (value: Locale) => void;
  generate: (force?: boolean) => Promise<void>;
}

const DEFAULTS: GenerateQRPayload = {
  data: "https://nox.engine/demo",
  style: "dots",
  color: "#00FFAA",
  background: "#09131C",
  transparent_background: true,
  size: 512,
  preset: "neon",
  camouflage: 0.12,
  perception_mode: "off",
  perception_strength: 0.58,
  reference_image: null,
  logo_image: null,
  logo_scale: 0.22,
  frame_style: "none",
  finder_border_style: "square",
  finder_center_style: "square",
  border_color: "#1F2F48",
  center_color: "#00FFAA",
  gradient_enabled: false,
};

type PresetDefaults = Pick<GenerateQRPayload, "style" | "color" | "background" | "transparent_background" | "camouflage">;

const PRESET_DEFAULTS: Record<Exclude<QRArtisticPreset, "manual">, PresetDefaults> = {
  neon: {
    style: "dots",
    color: "#00FFAA",
    background: "#09131C",
    transparent_background: false,
    camouflage: 0.12,
  },
  ink: {
    style: "square",
    color: "#1C140F",
    background: "#F4EBDD",
    transparent_background: false,
    camouflage: 0.08,
  },
  wireframe: {
    style: "lines",
    color: "#76F5FF",
    background: "#081320",
    transparent_background: false,
    camouflage: 0.16,
  },
  cyberpunk: {
    style: "triangles",
    color: "#FF4FD8",
    background: "#160A20",
    transparent_background: false,
    camouflage: 0.22,
  },
  minimal: {
    style: "square",
    color: "#121212",
    background: "#FAFAFA",
    transparent_background: false,
    camouflage: 0,
  },
  organic: {
    style: "blobs",
    color: "#58DB88",
    background: "#ECE3D5",
    transparent_background: false,
    camouflage: 0.14,
  },
};

let requestSequence = 0;

export function buildRequestKey(payload: GenerateQRPayload) {
  return JSON.stringify(payload);
}

export function buildGeneratePayload(
  state: Pick<
    QRState,
    | "data"
    | "style"
    | "color"
    | "background"
    | "transparent_background"
    | "size"
    | "frameStyle"
    | "finderBorderStyle"
    | "finderCenterStyle"
    | "borderColor"
    | "centerColor"
    | "gradientEnabled"
    | "preset"
    | "camouflage"
    | "perception_mode"
    | "perception_strength"
    | "reference_image"
    | "logo_image"
    | "logo_scale"
  >,
): GenerateQRPayload {
  const perceptionMode = state.reference_image ? state.perception_mode : "off";

  return {
    data: state.data.trim(),
    style: state.style,
    color: state.color,
    background: state.background,
    transparent_background: state.transparent_background,
    size: state.size,
    frame_style: state.frameStyle,
    finder_border_style: state.finderBorderStyle,
    finder_center_style: state.finderCenterStyle,
    border_color: state.borderColor,
    center_color: state.centerColor,
    gradient_enabled: state.gradientEnabled,
    preset: state.preset,
    camouflage: state.camouflage,
    perception_mode: perceptionMode,
    perception_strength: state.perception_strength,
    reference_image: state.reference_image,
    logo_image: state.logo_image,
    logo_scale: state.logo_scale,
  };
}

function normalizeHex(value: string, fallback: string) {
  const candidate = value.trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(candidate) ? candidate : fallback;
}

export type { QRStyle };
export type { QRArtisticPreset };
export type { QRPerceptionMode };

export const useQRStore = create<QRState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      contentType: DEFAULT_QR_CONTENT_TYPE,
      contentDraft: {
        ...DEFAULT_QR_CONTENT_DRAFT,
      },
      frameStyle: DEFAULT_FRAME_STYLE,
      finderBorderStyle: DEFAULT_FINDER_BORDER_STYLE,
      finderCenterStyle: DEFAULT_FINDER_CENTER_STYLE,
      borderColor: "#1F2F48",
      centerColor: "#00FFAA",
      gradientEnabled: false,
      svg: "",
      pngBase64: "",
      validation: null,
      loading: false,
      error: null,
      livePreview: true,
      theme: "dark",
      locale: "pt-BR",
      lastGeneratedKey: null,
      activeRequestId: 0,
      setData: (value) => set({ data: value }),
      setContentType: (value) =>
        set((state) => ({
          contentType: value,
          data: buildQrContentData(value, state.contentDraft),
        })),
      setContentField: (field, value) =>
        set((state) => {
          const contentDraft = {
            ...state.contentDraft,
            [field]: value,
          };

          return {
            contentDraft,
            data: buildQrContentData(state.contentType, contentDraft),
          };
        }),
      setFrameStyle: (value) => set({ frameStyle: value }),
      setFinderBorderStyle: (value) => set({ finderBorderStyle: value }),
      setFinderCenterStyle: (value) => set({ finderCenterStyle: value }),
      setBorderColor: (value) => set({ borderColor: normalizeHex(value, "#1F2F48") }),
      setCenterColor: (value) => set({ centerColor: normalizeHex(value, DEFAULTS.color) }),
      setGradientEnabled: (value) => set({ gradientEnabled: value }),
      setStyle: (value) => set({ style: value }),
      setPreset: (value) =>
        set(() => {
          if (value === "manual") {
            return { preset: value };
          }

          const presetDefaults = PRESET_DEFAULTS[value];

          return {
            ...presetDefaults,
            preset: value,
            background: normalizeHex(presetDefaults.background, DEFAULTS.background),
            color: normalizeHex(presetDefaults.color, DEFAULTS.color),
          };
        }),
      setColor: (value) => set({ color: normalizeHex(value, DEFAULTS.color) }),
      setBackground: (value) =>
        set({
          background: normalizeHex(value, DEFAULTS.background),
          transparent_background: false,
        }),
      setTransparentBackground: (value) => set({ transparent_background: value }),
      setCamouflage: (value) => set({ camouflage: Math.min(1, Math.max(0, value)) }),
      setPerceptionMode: (value) =>
        set((state) => ({
          perception_mode: state.reference_image ? value : "off",
        })),
      setPerceptionStrength: (value) => set({ perception_strength: Math.min(1, Math.max(0, value)) }),
      setReferenceImage: (value) =>
        set((state) => {
          if (!value) {
            return {
              reference_image: null,
              perception_mode: "off",
            };
          }

          return {
            reference_image: value,
            perception_mode: state.perception_mode === "off" ? "near_invisible" : state.perception_mode,
            perception_strength: Math.max(state.perception_strength, DEFAULTS.perception_strength),
            camouflage: Math.min(state.camouflage, DEFAULTS.camouflage),
          };
        }),
      setLogoImage: (value) => set({ logo_image: value }),
      setLogoScale: (value) => set({ logo_scale: Math.min(0.3, Math.max(0.14, value)) }),
      setSize: (value) => set({ size: Math.min(1024, Math.max(256, value)) }),
      setLivePreview: (value) => set({ livePreview: value }),
      setTheme: (value) => set({ theme: value }),
      setLocale: (value) =>
        set((state) => ({
          locale: value,
          error: state.error ? localizeRuntimeMessage(state.error, value) : null,
          validation: state.validation ? localizeValidationResult(state.validation, value) : null,
        })),
      generate: async (force = false) => {
        const state = get();
        const payload = buildGeneratePayload(state);

        if (!payload.data) {
          set({
            svg: "",
            pngBase64: "",
            validation: null,
            loading: false,
            error: localizeRuntimeMessage("Add content before generating a QR code.", state.locale),
          });
          return;
        }

        const nextRequestKey = buildRequestKey(payload);

        if (!force && nextRequestKey === state.lastGeneratedKey) {
          return;
        }

        // Track request order so slower responses never overwrite the latest preview.
        const requestId = ++requestSequence;
        set({ loading: true, error: null, activeRequestId: requestId });

        try {
          const result = await generateQR(payload);

          if (get().activeRequestId !== requestId) {
            return;
          }

          set({
            svg: result.svg,
            pngBase64: result.pngBase64,
            validation: localizeValidationResult(result.validation, state.locale),
            loading: false,
            error: null,
            lastGeneratedKey: nextRequestKey,
          });
        } catch (error) {
          if (get().activeRequestId !== requestId) {
            return;
          }

          set({
            loading: false,
            validation: null,
            error: localizeRuntimeMessage(
              error instanceof Error ? error.message : "Unable to generate the QR code.",
              state.locale,
            ),
          });
        }
      },
    }),
    {
      name: "nox-demo-store",
      storage: createJSONStorage(() => localStorage),
      // Persist only authoring preferences so rendered output never becomes stale across deployments.
      partialize: (state) => ({
        data: state.data,
        contentType: state.contentType,
        contentDraft: state.contentDraft,
        frameStyle: state.frameStyle,
        finderBorderStyle: state.finderBorderStyle,
        finderCenterStyle: state.finderCenterStyle,
        borderColor: state.borderColor,
        centerColor: state.centerColor,
        gradientEnabled: state.gradientEnabled,
        style: state.style,
        color: state.color,
        background: state.background,
        transparent_background: state.transparent_background,
        size: state.size,
        preset: state.preset,
        camouflage: state.camouflage,
        perception_mode: state.perception_mode,
        perception_strength: state.perception_strength,
        logo_scale: state.logo_scale,
        livePreview: state.livePreview,
        theme: state.theme,
        locale: state.locale,
      }),
      merge: (persistedState, currentState) => {
        if (!persistedState || typeof persistedState !== "object") {
          return currentState;
        }

        return {
          ...(() => {
            const inferred = buildDraftFromQrData(
              typeof (persistedState as Partial<QRState>).data === "string"
                ? (persistedState as Partial<QRState>).data as string
                : currentState.data,
            );

            return {
              contentType: inferred.contentType,
              contentDraft: inferred.contentDraft,
            };
          })(),
          ...currentState,
          ...(persistedState as Partial<QRState>),
          transparent_background: true,
          perception_mode: (persistedState as Partial<QRState>).perception_mode ?? "off",
          perception_strength: (persistedState as Partial<QRState>).perception_strength ?? DEFAULTS.perception_strength,
        };
      },
    },
  ),
);
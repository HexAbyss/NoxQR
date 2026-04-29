/*
 * NOX - a Visual Encoding Engine.
 * Copyright (C) 2026
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { generateQR, type GenerateQRPayload, type QRStyle, type ValidationResult } from "@/lib/api/qrClient";

export type Theme = "dark" | "light";
export type Locale = "pt-BR" | "en";

interface QRState extends GenerateQRPayload {
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
  setStyle: (value: QRStyle) => void;
  setColor: (value: string) => void;
  setBackground: (value: string) => void;
  setTransparentBackground: (value: boolean) => void;
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
  background: "#0D0D0D",
  transparent_background: true,
  size: 512,
};

let requestSequence = 0;

function requestKey(payload: GenerateQRPayload) {
  return JSON.stringify(payload);
}

function normalizeHex(value: string, fallback: string) {
  const candidate = value.trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(candidate) ? candidate : fallback;
}

export type { QRStyle };

export const useQRStore = create<QRState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
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
      setStyle: (value) => set({ style: value }),
      setColor: (value) => set({ color: normalizeHex(value, DEFAULTS.color) }),
      setBackground: (value) =>
        set({
          background: normalizeHex(value, DEFAULTS.background),
          transparent_background: false,
        }),
      setTransparentBackground: (value) => set({ transparent_background: value }),
      setSize: (value) => set({ size: Math.min(1024, Math.max(256, value)) }),
      setLivePreview: (value) => set({ livePreview: value }),
      setTheme: (value) => set({ theme: value }),
      setLocale: (value) => set({ locale: value }),
      generate: async (force = false) => {
        const state = get();
        const payload: GenerateQRPayload = {
          data: state.data.trim(),
          style: state.style,
          color: state.color,
          background: state.background,
          transparent_background: state.transparent_background,
          size: state.size,
        };

        if (!payload.data) {
          set({
            svg: "",
            pngBase64: "",
            validation: null,
            loading: false,
            error: "Add content before generating a QR code.",
          });
          return;
        }

        const nextRequestKey = requestKey(payload);

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
            validation: result.validation,
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
            error: error instanceof Error ? error.message : "Unable to generate the QR code.",
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
        style: state.style,
        color: state.color,
        background: state.background,
        transparent_background: state.transparent_background,
        size: state.size,
        livePreview: state.livePreview,
        theme: state.theme,
        locale: state.locale,
      }),
    },
  ),
);
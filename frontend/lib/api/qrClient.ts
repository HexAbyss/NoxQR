/*
 * NOX - a Visual Encoding Engine.
 * Copyright (C) 2026
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export type QRStyle = "square" | "dots" | "lines" | "triangles" | "hexagons" | "blobs" | "glyphs" | "fractal";

export interface GenerateQRPayload {
  data: string;
  style: QRStyle;
  color: string;
  background: string;
  transparent_background: boolean;
  size: number;
}

export type ValidationRisk = "low" | "medium" | "high";

interface GenerateQRValidationBody {
  score: number;
  risk: ValidationRisk;
  metrics: {
    contrast_ratio: number;
    distortion: number;
    density: number;
    quiet_zone_integrity: number;
    simulation_pass_rate: number;
  };
  simulations: Array<{
    name: string;
    passed: boolean;
  }>;
  corrections_applied: string[];
  suggestions: string[];
  auto_corrected: boolean;
}

interface GenerateQRResponseBody {
  svg: string;
  png_base64: string;
  validation: GenerateQRValidationBody;
}

export interface ValidationMetrics {
  contrastRatio: number;
  distortion: number;
  density: number;
  quietZoneIntegrity: number;
  simulationPassRate: number;
}

export interface ValidationSimulation {
  name: string;
  passed: boolean;
}

export interface ValidationResult {
  score: number;
  risk: ValidationRisk;
  metrics: ValidationMetrics;
  simulations: ValidationSimulation[];
  correctionsApplied: string[];
  suggestions: string[];
  autoCorrected: boolean;
}

export interface GenerateQRResponse {
  svg: string;
  pngBase64: string;
  validation: ValidationResult;
}

const DEFAULT_API_BASE_URL = "http://localhost:3001";
declare const process: {
  env: {
    NEXT_PUBLIC_QR_API_URL?: string;
  };
};

function resolveApiBaseUrl() {
  // Read the public env var directly so Next can inline the browser-facing backend URL during build.
  return (process.env.NEXT_PUBLIC_QR_API_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
}

function isValidationResponseBody(value: unknown): value is GenerateQRValidationBody {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<GenerateQRValidationBody>;

  return (
    typeof candidate.score === "number" &&
    (candidate.risk === "low" || candidate.risk === "medium" || candidate.risk === "high") &&
    !!candidate.metrics &&
    typeof candidate.metrics.contrast_ratio === "number" &&
    typeof candidate.metrics.distortion === "number" &&
    typeof candidate.metrics.density === "number" &&
    typeof candidate.metrics.quiet_zone_integrity === "number" &&
    typeof candidate.metrics.simulation_pass_rate === "number" &&
    Array.isArray(candidate.simulations) &&
    candidate.simulations.every(
      (simulation) =>
        !!simulation &&
        typeof simulation === "object" &&
        typeof simulation.name === "string" &&
        typeof simulation.passed === "boolean",
    ) &&
    Array.isArray(candidate.corrections_applied) &&
    candidate.corrections_applied.every((item) => typeof item === "string") &&
    Array.isArray(candidate.suggestions) &&
    candidate.suggestions.every((item) => typeof item === "string") &&
    typeof candidate.auto_corrected === "boolean"
  );
}

function mapValidation(body: GenerateQRValidationBody): ValidationResult {
  return {
    score: body.score,
    risk: body.risk,
    metrics: {
      contrastRatio: body.metrics.contrast_ratio,
      distortion: body.metrics.distortion,
      density: body.metrics.density,
      quietZoneIntegrity: body.metrics.quiet_zone_integrity,
      simulationPassRate: body.metrics.simulation_pass_rate,
    },
    simulations: body.simulations,
    correctionsApplied: body.corrections_applied,
    suggestions: body.suggestions,
    autoCorrected: body.auto_corrected,
  };
}

export async function generateQR(payload: GenerateQRPayload): Promise<GenerateQRResponse> {
  const response = await fetch(`${resolveApiBaseUrl()}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as (Partial<GenerateQRResponseBody> & { error?: string }) | null;

  if (!response.ok) {
    throw new Error(body?.error ?? "The backend could not generate a QR code.");
  }

  if (!body || typeof body.svg !== "string" || typeof body.png_base64 !== "string" || !isValidationResponseBody(body.validation)) {
    throw new Error("The backend returned an invalid response payload.");
  }

  return {
    svg: body.svg,
    pngBase64: body.png_base64,
    validation: mapValidation(body.validation),
  };
}
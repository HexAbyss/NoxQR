/*
 * NOX - a Visual Encoding Engine.
 * Copyright (C) 2026
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export type QRStyle = "square" | "dots" | "lines";

export interface GenerateQRPayload {
  data: string;
  style: QRStyle;
  color: string;
  background: string;
  transparent_background: boolean;
  size: number;
}

interface GenerateQRResponseBody {
  svg: string;
  png_base64: string;
}

export interface GenerateQRResponse {
  svg: string;
  pngBase64: string;
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

  if (!body || typeof body.svg !== "string" || typeof body.png_base64 !== "string") {
    throw new Error("The backend returned an invalid response payload.");
  }

  return {
    svg: body.svg,
    pngBase64: body.png_base64,
  };
}
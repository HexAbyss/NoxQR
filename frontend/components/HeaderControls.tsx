"use client";

/*
 * NOX - a Visual Encoding Engine.
 * Copyright (C) 2026
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Languages, MoonStar, SunMedium } from "lucide-react";

import type { Locale, Theme } from "@/store/useQRStore";

export interface HeaderControlsCopy {
  localeLabel: string;
  themeLabel: string;
  locales: Record<Locale, string>;
  themes: Record<Theme, string>;
}

interface HeaderControlsProps {
  copy: HeaderControlsCopy;
  locale: Locale;
  theme: Theme;
  compact?: boolean;
  disabled?: boolean;
  onLocaleChange: (value: Locale) => void;
  onThemeChange: (value: Theme) => void;
}

export function HeaderControls({
  copy,
  locale,
  theme,
  compact = false,
  disabled = false,
  onLocaleChange,
  onThemeChange,
}: Readonly<HeaderControlsProps>) {
  const iconSize = compact ? 14 : 15;

  return (
    <div className="header-controls" data-compact={compact}>
      <div className="header-controls__group">
        {!compact ? (
          <span className="header-controls__label">
            <Languages size={iconSize} />
            {copy.localeLabel}
          </span>
        ) : null}

        <div className="segment" role="group" aria-label={copy.localeLabel}>
          {(["pt-BR", "en"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className="segment__button"
              data-active={locale === option}
              disabled={disabled}
              onClick={() => onLocaleChange(option)}
            >
              {copy.locales[option]}
            </button>
          ))}
        </div>
      </div>

      <div className="header-controls__group">
        {!compact ? (
          <span className="header-controls__label">
            {theme === "dark" ? <MoonStar size={iconSize} /> : <SunMedium size={iconSize} />}
            {copy.themeLabel}
          </span>
        ) : null}

        <div className="segment" role="group" aria-label={copy.themeLabel}>
          {(["dark", "light"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className="segment__button"
              data-tone="theme"
              data-active={theme === option}
              disabled={disabled}
              onClick={() => onThemeChange(option)}
            >
              {copy.themes[option]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
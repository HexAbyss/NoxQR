"use client";

/*
 * NOX - a Visual Encoding Engine.
 * Copyright (C) 2026
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { motion, useTransform, type MotionValue } from "framer-motion";

import { HeaderControls, type HeaderControlsCopy } from "@/components/HeaderControls";
import type { Locale, Theme } from "@/store/useQRStore";

interface FloatingHeaderRightProps {
  copy: HeaderControlsCopy;
  locale: Locale;
  theme: Theme;
  progress: MotionValue<number>;
  isInteractive: boolean;
  onLocaleChange: (value: Locale) => void;
  onThemeChange: (value: Theme) => void;
}

export function FloatingHeaderRight({
  copy,
  locale,
  theme,
  progress,
  isInteractive,
  onLocaleChange,
  onThemeChange,
}: Readonly<FloatingHeaderRightProps>) {
  const opacity = useTransform(progress, [0.2, 0.7, 1], [0, 0.5, 1]);
  const x = useTransform(progress, [0, 1], [14, 0]);
  const y = useTransform(progress, [0, 1], [-10, 0]);
  const scale = useTransform(progress, [0, 1], [0.96, 1]);

  return (
    <motion.div
      className="floating-header floating-header--right"
      style={{ opacity, x, y, scale, pointerEvents: isInteractive ? "auto" : "none" }}
    >
      <div className="floating-header__surface floating-header__surface--controls">
        <HeaderControls
          copy={copy}
          locale={locale}
          theme={theme}
          compact
          disabled={!isInteractive}
          onLocaleChange={onLocaleChange}
          onThemeChange={onThemeChange}
        />
      </div>
    </motion.div>
  );
}
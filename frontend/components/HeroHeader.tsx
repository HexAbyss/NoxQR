"use client";

/*
 * NOX - a Visual Encoding Engine.
 * Copyright (C) 2026
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import Image from "next/image";
import { motion, type MotionStyle } from "framer-motion";
import { forwardRef } from "react";

import { HeaderControls, type HeaderControlsCopy } from "@/components/HeaderControls";
import type { Locale, Theme } from "@/store/useQRStore";

export interface HeaderCopy extends HeaderControlsCopy {
  badge: string;
  title: string;
  subtitle: string;
  summary: string;
}

interface HeroHeaderProps {
  copy: HeaderCopy;
  locale: Locale;
  theme: Theme;
  onLocaleChange: (value: Locale) => void;
  onThemeChange: (value: Theme) => void;
  style?: MotionStyle;
}

export const HeroHeader = forwardRef<HTMLElement, HeroHeaderProps>(function HeroHeader(
  { copy, locale, theme, onLocaleChange, onThemeChange, style }: Readonly<HeroHeaderProps>,
  ref,
) {
  return (
    <motion.section ref={ref} style={style} className="glass-panel hero-header">
      <div className="hero-header__inner">
        <div className="hero-header__brand">
          <div className="hero-header__mark-shell" aria-hidden="true">
            <Image src="/nox-mark.svg" alt="" width={256} height={256} className="hero-header__mark-image" sizes="88px" priority />
          </div>

          <div className="hero-header__copy">
            <div className="hero-header__eyebrow-row">
              <span className="hero-header__badge">{copy.badge}</span>
              <p className="hero-header__subtitle">{copy.subtitle}</p>
            </div>

            <h1 className="hero-header__title">{copy.title}</h1>
            <p className="hero-header__summary">{copy.summary}</p>
          </div>
        </div>

        <div className="hero-header__controls-shell">
          <HeaderControls copy={copy} locale={locale} theme={theme} onLocaleChange={onLocaleChange} onThemeChange={onThemeChange} />
        </div>
      </div>
    </motion.section>
  );
});

HeroHeader.displayName = "HeroHeader";
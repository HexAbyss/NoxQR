"use client";

/*
 * NOX - a Visual Encoding Engine.
 * Copyright (C) 2026
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import Image from "next/image";
import { motion, useTransform, type MotionValue } from "framer-motion";

interface FloatingHeaderLeftProps {
  progress: MotionValue<number>;
  isInteractive: boolean;
}

export function FloatingHeaderLeft({ progress, isInteractive }: Readonly<FloatingHeaderLeftProps>) {
  const opacity = useTransform(progress, [0.2, 0.7, 1], [0, 0.5, 1]);
  const x = useTransform(progress, [0, 1], [-14, 0]);
  const y = useTransform(progress, [0, 1], [-10, 0]);
  const scale = useTransform(progress, [0, 1], [0.96, 1]);

  return (
    <motion.div
      className="floating-header floating-header--left"
      style={{ opacity, x, y, scale, pointerEvents: isInteractive ? "auto" : "none" }}
    >
      <span className="floating-header__mark-shell" aria-hidden="true">
        <Image src="/nox-mark.svg" alt="" width={256} height={256} className="floating-header__mark-image" sizes="48px" />
      </span>
      <a href="#page-top" className="floating-header__link" aria-label="Return to top" tabIndex={isInteractive ? 0 : -1} />
    </motion.div>
  );
}
/*
 * NOX - a Visual Encoding Engine.
 * Copyright (C) 2026
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import Image from "next/image";

export interface FooterCopy {
  label: string;
  description: string;
  linksAriaLabel: string;
  links: Array<{
    href: string;
    label: string;
  }>;
  note: string;
}

interface SiteFooterProps {
  copy: FooterCopy;
}

export function SiteFooter({ copy }: Readonly<SiteFooterProps>) {
  return (
    <footer className="app-footer">
      <div className="app-footer__wrap">
        <div className="app-footer__symbol" aria-hidden="true">
          <Image src="/nox-mark.svg" alt="" width={256} height={256} className="app-footer__symbol-image" sizes="40px" />
        </div>

        <div className="app-footer__content">
          <div className="app-footer__brand">
            <span className="app-footer__label">{copy.label}</span>
            <p className="app-footer__copy">{copy.description}</p>
          </div>

          <nav className="app-footer__legal" aria-label={copy.linksAriaLabel}>
            {copy.links.map((link) => (
              <a key={link.href} href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel={link.href.startsWith("http") ? "noreferrer" : undefined}>
                {link.label}
              </a>
            ))}
          </nav>

          <p className="app-footer__note">{copy.note}</p>
        </div>
      </div>
    </footer>
  );
}

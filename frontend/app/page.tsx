"use client";

/*
 * NOX - a Visual Encoding Engine.
 * Copyright (C) 2026
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { ControlsPanel, type ControlsPanelCopy } from "@/components/ControlsPanel";
import { FloatingHeaderLeft } from "@/components/FloatingHeaderLeft";
import { FloatingHeaderRight } from "@/components/FloatingHeaderRight";
import { HeroHeader, type HeaderCopy } from "@/components/HeroHeader";
import { SiteFooter, type FooterCopy } from "@/components/SiteFooter";
import { QRPreview, type QRPreviewCopy } from "@/components/QRPreview";
import { useQRStore, type Locale } from "@/store/useQRStore";

const DEBOUNCE_MS = 320;

interface DemoCopy {
  header: HeaderCopy;
  controls: ControlsPanelCopy;
  preview: QRPreviewCopy;
  footer: FooterCopy;
}

const COPY: Record<Locale, DemoCopy> = {
  "pt-BR": {
    header: {
      badge: "AGPL-3.0",
      title: "NOX",
      subtitle: "Visual Encoding Engine",
      summary:
        "Engine visual open source para QR artistico com controle de estilo e renderizacao confiavel em Rust.",
      localeLabel: "Idioma",
      themeLabel: "Tema",
      locales: {
        "pt-BR": "PT-BR",
        en: "EN",
      },
      themes: {
        dark: "Escuro",
        light: "Claro",
      },
    },
    controls: {
      eyebrow: "Controles",
      title: "Modele o sinal.",
      summary:
        "O frontend orquestra a experiencia. O render continua no backend em Rust para manter consistencia, extensibilidade e leitura confiavel.",
      fields: {
        dataLabel: "Dados do QR",
        dataPlaceholder: "https://example.com, payload de campanha ou qualquer texto legivel por scanner",
        styleLabel: "Estilo visual",
        foregroundLabel: "Cor principal",
        backgroundLabel: "Cor de fundo",
        transparentBackgroundLabel: "Background transparente",
        transparentBackgroundHint: "Mantem o QR sem preenchimento. Ao escolher uma cor, o fundo volta a ser solido.",
        transparentBackgroundValue: "Transparente",
        sizeLabel: "Tamanho do canvas",
        livePreviewLabel: "Live Preview",
        livePreviewHint:
          "Quando ativo, a pagina aplica debounce para manter a interacao fluida sem enfileirar renders desnecessarios.",
      },
      styles: {
        square: {
          label: "Square",
          note: "Geometria direta para interfaces com contraste forte.",
        },
        dots: {
          label: "Dots",
          note: "Textura suave para identidade mais editorial.",
        },
        lines: {
          label: "Lines",
          note: "Direcao modular com leitura preservada em cada celula.",
        },
      },
      buttons: {
        generate: "Gerar",
        generating: "Gerando...",
      },
      helpers: {
        sizeHint: "Faixa entre 256px e 1024px para testes de tela, material grafico e prototipos.",
        autoHint: "Live Preview ligado. Alteracoes validas disparam render com atraso curto.",
        manualHint: "Live Preview desligado. Use o botao para registrar checkpoints visuais.",
      },
    },
    preview: {
      eyebrow: "Preview",
      title: "Saida em SVG com leitura preservada.",
      summary:
        "O painel recebe o SVG do backend e aplica apenas uma sanitizacao basica antes de injetar o markup, mantendo a demo segura sem esconder o contrato do engine.",
      loadingTitle: "Renderizando no engine em Rust",
      loadingBody: "Processando payload, estilo e paleta para devolver um SVG pronto para demonstracao.",
      errorTitle: "Falha ao gerar o QR",
      emptyTitle: "Pronto para o primeiro render.",
      emptyBody: "Defina o payload e ajuste o visual para materializar a codificacao perceptual.",
      successCaption: "SVG injetado com animacao suave para enfatizar a atualizacao do sistema visual.",
      meta: {
        style: "Estilo",
        canvas: "Canvas",
        payload: "Payload",
      },
      status: {
        renderer: "Render ownership: Rust backend",
        sanitization: "SVG sanitizado antes do dangerouslySetInnerHTML",
        palette: "Paleta ativa",
        transparent: "Transparente",
      },
      actions: {
        export: "Exportar PNG",
      },
    },
    footer: {
      label: "NOX",
      description:
        "Engine visual open source para codificacao QR artistica com interface Next.js e renderizacao confiavel em Rust.",
      linksAriaLabel: "Links do projeto",
      links: [
        { href: "#studio", label: "Studio" },
        { href: "https://www.gnu.org/licenses/agpl-3.0.html", label: "AGPL-3.0" },
        { href: "https://www.rust-lang.org/", label: "Rust" },
      ],
      note: "© 2026 NOX. Codigo aberto sob AGPL-3.0-only.",
    },
  },
  en: {
    header: {
      badge: "AGPL-3.0",
      title: "NOX",
      subtitle: "Visual Encoding Engine",
      summary:
        "Open-source visual QR engine with precise art direction and dependable Rust rendering.",
      localeLabel: "Language",
      themeLabel: "Theme",
      locales: {
        "pt-BR": "PT-BR",
        en: "EN",
      },
      themes: {
        dark: "Dark",
        light: "Light",
      },
    },
    controls: {
      eyebrow: "Controls",
      title: "Shape the signal.",
      summary:
        "The frontend only orchestrates the demo surface. Rendering stays in Rust so the visual contract can scale without leaking engine rules into the UI layer.",
      fields: {
        dataLabel: "QR data",
        dataPlaceholder: "https://example.com, campaign payload, or any scanner-readable text",
        styleLabel: "Visual style",
        foregroundLabel: "Foreground",
        backgroundLabel: "Background",
        transparentBackgroundLabel: "Transparent background",
        transparentBackgroundHint: "Keeps the QR without a fill. Picking a color switches the background back to solid.",
        transparentBackgroundValue: "Transparent",
        sizeLabel: "Canvas size",
        livePreviewLabel: "Live Preview",
        livePreviewHint:
          "When enabled, the page debounces requests so creative iteration stays fluid without flooding the renderer.",
      },
      styles: {
        square: {
          label: "Square",
          note: "Direct geometry for high-contrast interfaces.",
        },
        dots: {
          label: "Dots",
          note: "Softer texture for more editorial branding.",
        },
        lines: {
          label: "Lines",
          note: "Modular direction with readability preserved per cell.",
        },
      },
      buttons: {
        generate: "Generate",
        generating: "Generating...",
      },
      helpers: {
        sizeHint: "Range from 256px to 1024px for screen tests, print experiments, and product prototypes.",
        autoHint: "Live Preview is enabled. Valid changes trigger a short delayed render.",
        manualHint: "Live Preview is disabled. Use the button when you want explicit visual checkpoints.",
      },
    },
    preview: {
      eyebrow: "Preview",
      title: "SVG output with machine readability intact.",
      summary:
        "The panel receives SVG from the backend and applies only light sanitization before injecting the markup so the demo stays safe without obscuring the engine contract.",
      loadingTitle: "Rendering in the Rust engine",
      loadingBody: "Processing payload, style, and palette to return an SVG ready for demonstration.",
      errorTitle: "QR generation failed",
      emptyTitle: "Ready for the first render.",
      emptyBody: "Define the payload and tune the visual language to materialize the perceptual encoding.",
      successCaption: "SVG is injected with a soft transition to emphasize each update of the visual system.",
      meta: {
        style: "Style",
        canvas: "Canvas",
        payload: "Payload",
      },
      status: {
        renderer: "Render ownership: Rust backend",
        sanitization: "SVG sanitized before dangerouslySetInnerHTML",
        palette: "Active palette",
        transparent: "Transparent",
      },
      actions: {
        export: "Export PNG",
      },
    },
    footer: {
      label: "NOX",
      description:
        "Open-source visual encoding engine for artistic QR direction with a Next.js interface and a dependable Rust renderer.",
      linksAriaLabel: "Project links",
      links: [
        { href: "#studio", label: "Studio" },
        { href: "https://www.gnu.org/licenses/agpl-3.0.html", label: "AGPL-3.0" },
        { href: "https://www.rust-lang.org/", label: "Rust" },
      ],
      note: "© 2026 NOX. Open source under AGPL-3.0-only.",
    },
  },
};

export default function HomePage() {
  const heroMeasureRef = useRef<HTMLElement | null>(null);
  const [heroHeight, setHeroHeight] = useState(0);
  const [floatingInteractive, setFloatingInteractive] = useState(false);
  const data = useQRStore((state) => state.data);
  const style = useQRStore((state) => state.style);
  const color = useQRStore((state) => state.color);
  const background = useQRStore((state) => state.background);
  const transparentBackground = useQRStore((state) => state.transparent_background);
  const size = useQRStore((state) => state.size);
  const svg = useQRStore((state) => state.svg);
  const livePreview = useQRStore((state) => state.livePreview);
  const locale = useQRStore((state) => state.locale);
  const theme = useQRStore((state) => state.theme);
  const generate = useQRStore((state) => state.generate);
  const setLocale = useQRStore((state) => state.setLocale);
  const setTheme = useQRStore((state) => state.setTheme);

  const deferredData = useDeferredValue(data);
  const copy = useMemo(() => COPY[locale], [locale]);
  const styleLabel = copy.controls.styles[style].label;
  const { scrollY } = useScroll();
  const measuredHeroHeight = heroHeight || 192;
  const collapseDistance = useMemo(
    () => Math.max(52, Math.min(measuredHeroHeight * 0.34, 96)),
    [measuredHeroHeight],
  );
  const headerProgress = useTransform(scrollY, [0, collapseDistance], [0, 1]);
  const heroShellHeight = useTransform(headerProgress, [0, 1], [measuredHeroHeight, 0]);
  const heroShellMarginTop = useTransform(headerProgress, [0, 1], [100, 0]);
  const heroShellMarginBottom = useTransform(headerProgress, [0, 1], [100, 0]);
  const heroOpacity = useTransform(headerProgress, [0, 0.24, 0.46], [1, 0.16, 0]);
  const heroY = useTransform(headerProgress, [0, 1], [0, -22]);
  const heroScale = useTransform(headerProgress, [0, 1], [1, 0.955]);
  const mainPaddingTop = useTransform(headerProgress, [0, 1], [0, 104]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [locale, theme]);

  useEffect(() => {
    const node = heroMeasureRef.current;

    if (!node) {
      return;
    }

    const updateHeight = () => {
      setHeroHeight(node.offsetHeight);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    setFloatingInteractive(headerProgress.get() > 0.44);
  }, [headerProgress]);

  useMotionValueEvent(headerProgress, "change", (value) => {
    const nextInteractive = value > 0.44;

    setFloatingInteractive((current) => (current === nextInteractive ? current : nextInteractive));
  });

  useEffect(() => {
    if (!livePreview || !deferredData.trim()) {
      return;
    }

    const timer = window.setTimeout(() => {
      void generate();
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [background, color, deferredData, generate, livePreview, size, style, transparentBackground]);

  useEffect(() => {
    if (svg || !data.trim()) {
      return;
    }

    void generate(true);
  }, [data, generate, svg]);

  return (
    <>
      <FloatingHeaderLeft progress={headerProgress} isInteractive={floatingInteractive} />

      <FloatingHeaderRight
        copy={copy.header}
        locale={locale}
        theme={theme}
        progress={headerProgress}
        isInteractive={floatingInteractive}
        onLocaleChange={(nextLocale) => {
          startTransition(() => {
            setLocale(nextLocale);
          });
        }}
        onThemeChange={(nextTheme) => {
          startTransition(() => {
            setTheme(nextTheme);
          });
        }}
      />

      <div className="page-shell">
        <div id="page-top" className="hero-scroll-sentinel" aria-hidden="true" />

        <motion.div className="hero-header-shell" style={{ height: heroShellHeight, marginTop: heroShellMarginTop, marginBottom: heroShellMarginBottom }}>
          <HeroHeader
            ref={heroMeasureRef}
            style={{ opacity: heroOpacity, y: heroY, scale: heroScale }}
            copy={copy.header}
            locale={locale}
            theme={theme}
            onLocaleChange={(nextLocale) => {
              startTransition(() => {
                setLocale(nextLocale);
              });
            }}
            onThemeChange={(nextTheme) => {
              startTransition(() => {
                setTheme(nextTheme);
              });
            }}
          />
        </motion.div>

        <motion.main className="demo-main" style={{ paddingTop: mainPaddingTop }}>
          <section id="studio" className="demo-grid" aria-label="NOX demonstration studio">
            <ControlsPanel copy={copy.controls} />
            <QRPreview copy={copy.preview} styleLabel={styleLabel} />
          </section>
        </motion.main>
      </div>

      <SiteFooter copy={copy.footer} />
    </>
  );
}
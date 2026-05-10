"use client";

/*
 * NOX - a Visual Encoding Engine.
 * Copyright (C) 2026
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { StudioControlsPanel, type ControlsPanelCopy } from "@/components/StudioControlsPanel";
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
  studioAriaLabel: string;
}

const COPY: Record<Locale, DemoCopy> = {
  "pt-BR": {
    header: {
      badge: "AGPL-3.0",
      title: "NOX",
      subtitle: "Estudio de QR Code",
      summary:
        "Crie QR Codes personalizados com visual marcante e leitura confiavel.",
      returnToTopLabel: "Voltar ao topo",
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
      title: "Personalize seu QR.",
      summary:
        "Escolha o conteudo, ajuste as cores e monte o visual do seu QR Code.",
      fields: {
        dataLabel: "Dados do QR",
        dataPlaceholder: "https://example.com, payload de campanha ou qualquer texto legivel por scanner",
        presetLabel: "Preset artistico",
        presetHint: "Ativa direcoes visuais prontas com paleta, estilo e textura base sem romper a leitura.",
        styleLabel: "Estilo visual",
        foregroundLabel: "Cor principal",
        backgroundLabel: "Cor de fundo",
        transparentBackgroundLabel: "Background transparente",
        transparentBackgroundHint: "Mantem o QR sem preenchimento. Ao escolher uma cor, o fundo volta a ser solido.",
        transparentBackgroundValue: "Transparente",
        perceptionModeLabel: "Camada perceptual",
        perceptionModeHint: "Define como a imagem base influencia a percepcao do QR sem mexer no contrato estrutural do backend.",
        perceptionStrengthLabel: "Presenca do sinal",
        perceptionStrengthHint: "Valores altos priorizam leitura. Valores baixos deixam o QR mais disfarçado.",
        camouflageLabel: "Camuflagem",
        camouflageHint: "Ajusta o ruido residual aplicado aos modulos de dados apos a camada perceptual.",
        referenceImageLabel: "Imagem base",
        referenceImageHint: "PNG, JPEG ou WebP ate 2MB. A imagem serve como carrier ou guia tonal nos modos Phase 5.",
        logoImageLabel: "Logo central",
        logoImageHint: "PNG, JPEG ou WebP ate 2MB. O backend reserva uma zona segura antes de embutir o logo.",
        logoScaleLabel: "Escala do logo",
        logoScaleHint: "Refina a area protegida no centro para equilibrar marca e leitura.",
        sizeLabel: "Tamanho do canvas",
        livePreviewLabel: "Previa ao vivo",
        livePreviewHint:
          "Quando ativo, a pagina aplica debounce para manter a interacao fluida sem enfileirar renders desnecessarios.",
      },
      styles: {
        square: {
          label: "Quadrado",
          note: "Geometria direta para interfaces com contraste forte.",
        },
        dots: {
          label: "Pontos",
          note: "Textura suave para identidade mais editorial.",
        },
        lines: {
          label: "Linhas",
          note: "Linhas continuas, sem tracos soltos, para um visual mais limpo.",
        },
        triangles: {
          label: "Triangulos",
          note: "Arestas angulares com rotacao controlada por modulo.",
        },
        hexagons: {
          label: "Hexagonos",
          note: "Ritmo colmeia para composicoes mais compactas.",
        },
        blobs: {
          label: "Blobs",
          note: "Massa organica com contorno mais fluido e suave.",
        },
        glyphs: {
          label: "Glifos",
          note: "Cruzamentos simbolicos para uma leitura mais grafica.",
        },
        fractal: {
          label: "Fractal",
          note: "Subdivisoes internas que ecoam a propria matriz.",
        },
      },
      presets: {
        manual: {
          label: "Manual",
          note: "Mantem o controle livre para montar a direcao visual do zero.",
        },
        neon: {
          label: "Neon",
          note: "Glow acido com ruido leve para interfaces noturnas e motion pieces.",
        },
        ink: {
          label: "Ink",
          note: "Contraste editorial com acabamento mais grafico e contido.",
        },
        wireframe: {
          label: "Wireframe",
          note: "Geometria fria com leitura tecnica e frequencia visivel.",
        },
        cyberpunk: {
          label: "Cyberpunk",
          note: "Magenta eletrico com camuflagem mais agressiva e atmosfera sintetica.",
        },
        minimal: {
          label: "Minimal",
          note: "Reducao maxima do ruido com fundo claro e estrutura limpa.",
        },
        organic: {
          label: "Organico",
          note: "Blocos mais vivos guiados por textura e composicao natural.",
        },
      },
      perceptionModes: {
        off: {
          label: "Classico",
          note: "Mantem apenas a direcao artistica tradicional do QR, sem camada perceptual.",
        },
        near_invisible: {
          label: "Quase invisivel",
          note: "Usa a imagem base como guia tonal para esconder o sinal com o menor ruido possivel.",
        },
        frequency: {
          label: "Por frequencia",
          note: "Distribui variacoes periodicas nos modulos sem depender de um carrier total.",
        },
        negative: {
          label: "Negativo",
          note: "Desloca a tonalidade dos modulos para criar uma leitura invertida mais grafica.",
        },
        encrypted: {
          label: "Encriptado",
          note: "Mistura a imagem base com modulos embaralhados para um visual mais cifrado.",
        },
        multi_layer: {
          label: "Multi-camada",
          note: "Empilha contrastes e acentos para um QR com profundidade visual extra.",
        },
      },
      buttons: {
        generate: "Gerar",
        generating: "Gerando...",
        upload: "Enviar imagem",
        replace: "Trocar imagem",
        clear: "Limpar",
      },
      helpers: {
        sizeHint: "Faixa entre 256px e 1024px para testes de tela, material grafico e prototipos.",
        autoHint: "Previa ao vivo ligada. Alteracoes validas disparam render com atraso curto.",
        manualHint: "Previa ao vivo desligada. Use o botao para registrar checkpoints visuais.",
        referenceReady: "Imagem base conectada ao QR.",
        logoReady: "Logo pronto para embutir no centro.",
      },
    },
    preview: {
      eyebrow: "Prévia",
      title: "Previa do QR Code.",
      summary:
        "Veja o resultado final antes de exportar.",
      loadingTitle: "Gerando sua previa",
      loadingBody: "Aplicando conteudo, cores e estilo ao seu QR Code.",
      errorTitle: "Falha ao gerar o QR",
      emptyTitle: "Pronto para o primeiro render.",
      emptyBody: "Escolha o conteudo e personalize o visual para ver a previa.",
      successCaption: "",
      meta: {
        style: "Estilo",
        preset: "Preset",
        canvas: "Canvas",
        payload: "Conteudo",
      },
      status: {
        renderer: "Render do backend em Rust",
        sanitization: "SVG sanitizado antes do dangerouslySetInnerHTML",
        preset: "Preset ativo",
        perception: "Camada perceptual",
        camouflage: "Camuflagem",
        reference: "Imagem base conectada",
        logo: "Logo embutido",
        palette: "Cores ativas",
        transparent: "Transparente",
      },
      perceptionModes: {
        off: "Classico",
        near_invisible: "Quase invisivel",
        frequency: "Por frequencia",
        negative: "Negativo",
        encrypted: "Encriptado",
        multi_layer: "Multi-camada",
      },
      actions: {
        export: "Exportar PNG",
      },
      reliability: {
        eyebrow: "Leitura",
        title: "Qualidade do QR Code.",
        summary:
          "Confira o nivel de leitura do QR em diferentes situacoes antes de exportar.",
        score: "Score",
        risk: "Risco",
        autoCorrection: "Auto-correcao",
        correctionsTitle: "Correcoes aplicadas",
        suggestionsTitle: "Sugestoes",
        pass: "OK",
        fail: "Falhou",
        metrics: {
          contrast: "Contraste",
          distortion: "Estabilidade",
          density: "Densidade",
          quietZone: "Zona de silencio",
          simulations: "Simulacoes",
        },
        risks: {
          low: "Baixo",
          medium: "Medio",
          high: "Alto",
        },
        simulations: {
          baseline: "Base",
          blur: "Blur",
          distance: "Distancia",
          lowLight: "Baixa luz",
        },
      },
    },
    footer: {
      label: "NOX",
      description:
        "Crie QR Codes personalizados com estilo, logo e exportacao rapida.",
      linksAriaLabel: "Links do projeto",
      links: [
        { href: "#studio", label: "Studio" },
        { href: "https://www.gnu.org/licenses/agpl-3.0.html", label: "AGPL-3.0" },
        { href: "https://www.rust-lang.org/", label: "Rust" },
      ],
      note: "© 2026 NOX. Codigo aberto sob AGPL-3.0-only.",
    },
    studioAriaLabel: "Estudio de demonstracao do NOX",
  },
  en: {
    header: {
      badge: "AGPL-3.0",
      title: "NOX",
      subtitle: "QR Code Studio",
      summary:
        "Create custom QR Codes with bold styling and dependable readability.",
      returnToTopLabel: "Return to top",
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
      title: "Customize your QR.",
      summary:
        "Choose the content, adjust the colors, and build the look of your QR Code.",
      fields: {
        dataLabel: "QR data",
        dataPlaceholder: "https://example.com, campaign payload, or any scanner-readable text",
        presetLabel: "Art preset",
        presetHint: "Applies a ready-made direction for palette, style, and base texture without breaking scanability.",
        styleLabel: "Visual style",
        foregroundLabel: "Foreground",
        backgroundLabel: "Background",
        transparentBackgroundLabel: "Transparent background",
        transparentBackgroundHint: "Keeps the QR without a fill. Picking a color switches the background back to solid.",
        transparentBackgroundValue: "Transparent",
        perceptionModeLabel: "Perception layer",
        perceptionModeHint: "Chooses how the carrier image influences the QR without changing the backend structural rules.",
        perceptionStrengthLabel: "Signal presence",
        perceptionStrengthHint: "Higher values favor readability. Lower values push the QR further into disguise.",
        camouflageLabel: "Camouflage",
        camouflageHint: "Controls the residual noise added after the perception layer settles the signal.",
        referenceImageLabel: "Carrier image",
        referenceImageHint: "PNG, JPEG, or WebP up to 2MB. The image becomes a carrier or tonal guide for Phase 5 modes.",
        logoImageLabel: "Center logo",
        logoImageHint: "PNG, JPEG, or WebP up to 2MB. The backend clears a safe zone before embedding the logo.",
        logoScaleLabel: "Logo scale",
        logoScaleHint: "Fine-tunes the protected center area reserved for the brand mark.",
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
          note: "Continuous line strokes without loose dashes for a cleaner finish.",
        },
        triangles: {
          label: "Triangles",
          note: "Angular modules with controlled local rotation.",
        },
        hexagons: {
          label: "Hexagons",
          note: "Honeycomb rhythm for denser visual packing.",
        },
        blobs: {
          label: "Blobs",
          note: "Organic clusters with a softer silhouette.",
        },
        glyphs: {
          label: "Glyphs",
          note: "Symbolic cross-strokes for sharper graphic language.",
        },
        fractal: {
          label: "Fractal",
          note: "Nested subdivisions that echo the matrix itself.",
        },
      },
      presets: {
        manual: {
          label: "Manual",
          note: "Keeps the controls open so you can build the visual direction from scratch.",
        },
        neon: {
          label: "Neon",
          note: "Acid glow and light texture for night-mode interfaces and motion drops.",
        },
        ink: {
          label: "Ink",
          note: "Editorial contrast with a sharper and more restrained finish.",
        },
        wireframe: {
          label: "Wireframe",
          note: "Cold geometry with technical rhythm and visible structural frequency.",
        },
        cyberpunk: {
          label: "Cyberpunk",
          note: "Electric magenta with stronger camouflage and synthetic atmosphere.",
        },
        minimal: {
          label: "Minimal",
          note: "Reduces noise to the floor with a light field and strict structure.",
        },
        organic: {
          label: "Organic",
          note: "Living shapes guided by image texture and softer composition.",
        },
      },
      perceptionModes: {
        off: {
          label: "Classic",
          note: "Keeps the legacy artistic QR treatment without an added perception layer.",
        },
        near_invisible: {
          label: "Near invisible",
          note: "Uses the carrier image as a tonal guide to hide the signal with minimal extra noise.",
        },
        frequency: {
          label: "Frequency",
          note: "Distributes periodic variation through the modules without relying on a full carrier backdrop.",
        },
        negative: {
          label: "Negative",
          note: "Shifts module tonality toward a more inverted graphic reading.",
        },
        encrypted: {
          label: "Encrypted",
          note: "Blends carrier input with scrambled module accents for a cipher-like finish.",
        },
        multi_layer: {
          label: "Multi-layer",
          note: "Stacks contrast bands and accents for deeper visual layering.",
        },
      },
      buttons: {
        generate: "Generate",
        generating: "Generating...",
        upload: "Upload image",
        replace: "Replace image",
        clear: "Clear",
      },
      helpers: {
        sizeHint: "Range from 256px to 1024px for screen tests, print experiments, and product prototypes.",
        autoHint: "Live Preview is enabled. Valid changes trigger a short delayed render.",
        manualHint: "Live Preview is disabled. Use the button when you want explicit visual checkpoints.",
        referenceReady: "Carrier image linked to the render.",
        logoReady: "Logo ready for the protected center zone.",
      },
    },
    preview: {
      eyebrow: "Preview",
      title: "QR Code preview.",
      summary:
        "Check the final result before exporting.",
      loadingTitle: "Generating your preview",
      loadingBody: "Applying content, colors, and style to your QR Code.",
      errorTitle: "QR generation failed",
      emptyTitle: "Ready for the first render.",
      emptyBody: "Choose the content and personalize the look to see your preview.",
      successCaption: "",
      meta: {
        style: "Style",
        preset: "Preset",
        canvas: "Canvas",
        payload: "Payload",
      },
      status: {
        renderer: "Render ownership: Rust backend",
        sanitization: "SVG sanitized before dangerouslySetInnerHTML",
        preset: "Active preset",
        perception: "Perception",
        camouflage: "Camouflage",
        reference: "Carrier image linked",
        logo: "Logo embedded",
        palette: "Active palette",
        transparent: "Transparent",
      },
      perceptionModes: {
        off: "Classic",
        near_invisible: "Near invisible",
        frequency: "Frequency",
        negative: "Negative",
        encrypted: "Encrypted",
        multi_layer: "Multi-layer",
      },
      actions: {
        export: "Export PNG",
      },
      reliability: {
        eyebrow: "Readability",
        title: "QR Code quality.",
        summary:
          "Review how easy the QR is to scan in different situations before exporting.",
        score: "Score",
        risk: "Risk",
        autoCorrection: "Auto-correction",
        correctionsTitle: "Applied corrections",
        suggestionsTitle: "Suggestions",
        pass: "Pass",
        fail: "Fail",
        metrics: {
          contrast: "Contrast",
          distortion: "Stability",
          density: "Density",
          quietZone: "Quiet zone",
          simulations: "Simulations",
        },
        risks: {
          low: "Low",
          medium: "Medium",
          high: "High",
        },
        simulations: {
          baseline: "Baseline",
          blur: "Blur",
          distance: "Distance",
          lowLight: "Low light",
        },
      },
    },
    footer: {
      label: "NOX",
      description:
        "Create custom QR Codes with style, logo, and quick export.",
      linksAriaLabel: "Project links",
      links: [
        { href: "#studio", label: "Studio" },
        { href: "https://www.gnu.org/licenses/agpl-3.0.html", label: "AGPL-3.0" },
        { href: "https://www.rust-lang.org/", label: "Rust" },
      ],
      note: "© 2026 NOX. Open source under AGPL-3.0-only.",
    },
    studioAriaLabel: "NOX demonstration studio",
  },
};

export default function HomePage() {
  const heroMeasureRef = useRef<HTMLElement | null>(null);
  const [heroHeight, setHeroHeight] = useState(0);
  const [floatingInteractive, setFloatingInteractive] = useState(false);
  const data = useQRStore((state) => state.data);
  const preset = useQRStore((state) => state.preset);
  const style = useQRStore((state) => state.style);
  const camouflage = useQRStore((state) => state.camouflage);
  const color = useQRStore((state) => state.color);
  const background = useQRStore((state) => state.background);
  const transparentBackground = useQRStore((state) => state.transparent_background);
  const referenceImage = useQRStore((state) => state.reference_image);
  const logoImage = useQRStore((state) => state.logo_image);
  const logoScale = useQRStore((state) => state.logo_scale);
  const perceptionMode = useQRStore((state) => state.perception_mode);
  const perceptionStrength = useQRStore((state) => state.perception_strength);
  const frameStyle = useQRStore((state) => state.frameStyle);
  const finderBorderStyle = useQRStore((state) => state.finderBorderStyle);
  const finderCenterStyle = useQRStore((state) => state.finderCenterStyle);
  const borderColor = useQRStore((state) => state.borderColor);
  const centerColor = useQRStore((state) => state.centerColor);
  const gradientEnabled = useQRStore((state) => state.gradientEnabled);
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
  const presetLabel = copy.controls.presets[preset].label;
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
  }, [
    background,
    borderColor,
    camouflage,
    centerColor,
    color,
    deferredData,
    finderBorderStyle,
    finderCenterStyle,
    frameStyle,
    generate,
    gradientEnabled,
    livePreview,
    logoImage,
    logoScale,
    perceptionMode,
    perceptionStrength,
    preset,
    referenceImage,
    size,
    style,
    transparentBackground,
  ]);

  useEffect(() => {
    if (svg || !data.trim()) {
      return;
    }

    void generate(true);
  }, [data, generate, svg]);

  return (
    <>
      <FloatingHeaderLeft progress={headerProgress} isInteractive={floatingInteractive} label={copy.header.returnToTopLabel} />

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
          <section id="studio" className="demo-grid" aria-label={copy.studioAriaLabel}>
            <StudioControlsPanel copy={copy.controls} />
            <QRPreview copy={copy.preview} styleLabel={styleLabel} presetLabel={presetLabel} />
          </section>
        </motion.main>
      </div>

      <SiteFooter copy={copy.footer} />
    </>
  );
}
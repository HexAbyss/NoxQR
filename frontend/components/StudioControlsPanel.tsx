"use client";

/*
 * NOX - a Visual Encoding Engine.
 * Copyright (C) 2026
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { motion } from "framer-motion";
import {
  CalendarDays,
  ImageIcon,
  Link2,
  Mail,
  MessageCircle,
  MessageSquare,
  PhoneCall,
  RefreshCw,
  ScanLine,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Type,
  Upload,
  User,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";

import {
  FINDER_BORDER_STYLE_ORDER,
  FINDER_CENTER_STYLE_ORDER,
  FRAME_STYLE_ORDER,
  type QRFinderBorderStyle,
  type QRFinderCenterStyle,
  type QRFrameStyle,
} from "@/lib/studio/designModel";
import { type QRContentDraft, type QRContentType, type QRWifiSecurity } from "@/lib/studio/contentModel";
import { buildLogoPresetDataUrl, buildLogoPresetPngDataUrl, LOGO_PRESET_ORDER, type QRLogoPreset } from "@/lib/studio/logoPresets";
import { localizeRuntimeMessage } from "@/lib/runtimeMessages";
import { useQRStore, type QRArtisticPreset, type QRPerceptionMode, type QRStyle } from "@/store/useQRStore";

const STYLE_ORDER: QRStyle[] = ["square", "dots", "lines", "triangles", "hexagons", "blobs", "glyphs", "fractal"];
const PRESET_ORDER: QRArtisticPreset[] = ["manual", "neon", "ink", "wireframe", "cyberpunk", "minimal", "organic"];
const PERCEPTION_MODE_ORDER: QRPerceptionMode[] = ["off", "near_invisible", "frequency", "negative", "encrypted", "multi_layer"];
const MAX_IMAGE_BYTES = 2_000_000;
const SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const DESIGN_TABS = ["frame", "shape", "border", "logo", "camouflage", "presets"] as const;

type DesignTab = (typeof DESIGN_TABS)[number];
type LocaleKey = "pt-BR" | "en";

export interface ControlsPanelCopy {
  eyebrow: string;
  title: string;
  summary: string;
  fields: {
    dataLabel: string;
    dataPlaceholder: string;
    presetLabel: string;
    presetHint: string;
    styleLabel: string;
    foregroundLabel: string;
    backgroundLabel: string;
    transparentBackgroundLabel: string;
    transparentBackgroundHint: string;
    transparentBackgroundValue: string;
    perceptionModeLabel: string;
    perceptionModeHint: string;
    perceptionStrengthLabel: string;
    perceptionStrengthHint: string;
    camouflageLabel: string;
    camouflageHint: string;
    referenceImageLabel: string;
    referenceImageHint: string;
    logoImageLabel: string;
    logoImageHint: string;
    logoScaleLabel: string;
    logoScaleHint: string;
    sizeLabel: string;
    livePreviewLabel: string;
    livePreviewHint: string;
  };
  styles: Record<QRStyle, { label: string; note: string }>;
  presets: Record<QRArtisticPreset, { label: string; note: string }>;
  perceptionModes: Record<QRPerceptionMode, { label: string; note: string }>;
  buttons: {
    generate: string;
    generating: string;
    upload: string;
    replace: string;
    clear: string;
  };
  helpers: {
    sizeHint: string;
    autoHint: string;
    manualHint: string;
    referenceReady: string;
    logoReady: string;
  };
}

interface StudioControlsPanelProps {
  copy: ControlsPanelCopy;
}

const CONTENT_TYPE_ORDER: Array<{ id: QRContentType; icon: LucideIcon }> = [
  { id: "link", icon: Link2 },
  { id: "text", icon: Type },
  { id: "email", icon: Mail },
  { id: "call", icon: PhoneCall },
  { id: "sms", icon: MessageSquare },
  { id: "vcard", icon: User },
  { id: "whatsapp", icon: MessageCircle },
  { id: "wifi", icon: Wifi },
  { id: "app", icon: Smartphone },
  { id: "event", icon: CalendarDays },
  { id: "barcode_2d", icon: ScanLine },
];

const COPY: Record<LocaleKey, { contentTypes: Record<QRContentType, string>; tabs: Record<DesignTab, string>; stepOne: string; stepTwo: string; stepThree: string; frame: string; border: string; center: string; gradient: string; chooseLogo: string; payload: string; payloadHint: string; frameStyles: Record<QRFrameStyle, string>; finderBorders: Record<QRFinderBorderStyle, string>; finderCenters: Record<QRFinderCenterStyle, string>; logoPresets: Record<QRLogoPreset, string>; wifiSecurity: Record<QRWifiSecurity, string>; fields: Record<string, string>; }> = {
  "pt-BR": {
    contentTypes: {
      link: "Link",
      text: "Text",
      email: "E-mail",
      call: "Call",
      sms: "SMS",
      vcard: "V-card",
      whatsapp: "WhatsApp",
      wifi: "Wi-Fi",
      app: "App",
      event: "Event",
      barcode_2d: "2D Barcode",
    },
    tabs: { frame: "Frame", shape: "Shape", border: "Border", logo: "Logo", camouflage: "Camouflage", presets: "Presets" },
    stepOne: "Complete o conteudo",
    stepTwo: "Desenhe o QR Code",
    stepThree: "Ajuste o Canvas",
    frame: "Frame style",
    border: "Border style",
    center: "Center style",
    gradient: "Gradiente",
    chooseLogo: "Ou escolha daqui",
    payload: "Conteudo gerado",
    payloadHint: "O payload final e montado automaticamente a partir do tipo escolhido.",
    frameStyles: { none: "Sem frame", rounded: "Rounded", card: "Card", circle: "Circle", phone: "Phone", hanger: "Hanger", ticket: "Ticket", ribbon: "Ribbon" },
    finderBorders: { square: "Square", rounded: "Rounded", circle: "Circle", leaf: "Leaf", bubble: "Bubble", focus: "Focus", cut: "Cut", soft_square: "Soft" },
    finderCenters: { square: "Square", rounded: "Rounded", circle: "Circle", leaf: "Leaf", burst: "Burst", star: "Star", diamond: "Diamond", cross: "Cross" },
    logoPresets: { link: "Google", location: "Google Maps", mail: "Gmail", whatsapp: "WhatsApp", wifi: "Wi-Fi", briefcase: "LinkedIn", paypal: "PayPal", bitcoin: "Bitcoin", scan: "Google Lens" },
    wifiSecurity: { WPA: "WPA/WPA2", WEP: "WEP", nopass: "Sem senha" },
    fields: { url: "Insira seu site", text: "Texto", emailAddress: "Endereco de e-mail", emailSubject: "Assunto", emailBody: "Mensagem", phoneNumber: "Numero de telefone", smsNumber: "Numero para SMS", smsMessage: "Mensagem SMS", firstName: "Nome", lastName: "Sobrenome", company: "Empresa", role: "Cargo", website: "Website", whatsappNumber: "Numero do WhatsApp", whatsappMessage: "Mensagem do WhatsApp", wifiSsid: "Nome da rede", wifiPassword: "Senha", wifiSecurity: "Seguranca", wifiHidden: "Rede oculta", pdfUrl: "URL do PDF", appName: "Nome do app", appStoreUrl: "App Store URL", playStoreUrl: "Play Store URL", appDeepLink: "Deep link", imageUrl: "URL da imagem", videoUrl: "URL do video", socialLabel: "Rede social", socialUrl: "URL do perfil", eventTitle: "Nome do evento", eventLocation: "Local", eventStart: "Inicio", eventEnd: "Fim", eventDescription: "Descricao", barcodeValue: "Valor do codigo" },
  },
  en: {
    contentTypes: {
      link: "Link",
      text: "Text",
      email: "E-mail",
      call: "Call",
      sms: "SMS",
      vcard: "V-card",
      whatsapp: "WhatsApp",
      wifi: "Wi-Fi",
      app: "App",
      event: "Event",
      barcode_2d: "2D Barcode",
    },
    tabs: { frame: "Frame", shape: "Shape", border: "Border", logo: "Logo", camouflage: "Camouflage", presets: "Presets" },
    stepOne: "Complete the content",
    stepTwo: "Design your QR Code",
    stepThree: "Tune the Canvas",
    frame: "Frame style",
    border: "Border style",
    center: "Center style",
    gradient: "Gradient",
    chooseLogo: "Or choose from here",
    payload: "Generated payload",
    payloadHint: "The final payload is assembled automatically from the selected content type.",
    frameStyles: { none: "No frame", rounded: "Rounded", card: "Card", circle: "Circle", phone: "Phone", hanger: "Hanger", ticket: "Ticket", ribbon: "Ribbon" },
    finderBorders: { square: "Square", rounded: "Rounded", circle: "Circle", leaf: "Leaf", bubble: "Bubble", focus: "Focus", cut: "Cut", soft_square: "Soft" },
    finderCenters: { square: "Square", rounded: "Rounded", circle: "Circle", leaf: "Leaf", burst: "Burst", star: "Star", diamond: "Diamond", cross: "Cross" },
    logoPresets: { link: "Google", location: "Google Maps", mail: "Gmail", whatsapp: "WhatsApp", wifi: "Wi-Fi", briefcase: "LinkedIn", paypal: "PayPal", bitcoin: "Bitcoin", scan: "Google Lens" },
    wifiSecurity: { WPA: "WPA/WPA2", WEP: "WEP", nopass: "No password" },
    fields: { url: "Enter your website", text: "Text", emailAddress: "E-mail address", emailSubject: "Subject", emailBody: "Message", phoneNumber: "Phone number", smsNumber: "SMS number", smsMessage: "SMS message", firstName: "First name", lastName: "Last name", company: "Company", role: "Role", website: "Website", whatsappNumber: "WhatsApp number", whatsappMessage: "WhatsApp message", wifiSsid: "Network name", wifiPassword: "Password", wifiSecurity: "Security", wifiHidden: "Hidden network", pdfUrl: "PDF URL", appName: "App name", appStoreUrl: "App Store URL", playStoreUrl: "Play Store URL", appDeepLink: "Deep link", imageUrl: "Image URL", videoUrl: "Video URL", socialLabel: "Platform", socialUrl: "Profile URL", eventTitle: "Event title", eventLocation: "Location", eventStart: "Start", eventEnd: "End", eventDescription: "Description", barcodeValue: "Barcode value" },
  },
};

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("The selected file could not be read."));
    reader.onerror = () => reject(new Error("The selected file could not be read."));
    reader.readAsDataURL(file);
  });
}

function StepHeader({ index, title }: Readonly<{ index: 1 | 2 | 3; title: string }>) {
  return (
    <div className="studio-step__head">
      <span className="studio-step__index">{index}</span>
      <h3 className="studio-step__title">{title}</h3>
    </div>
  );
}

function TileButton({ active, onClick, label, preview, note, disabled = false }: Readonly<{ active: boolean; onClick: () => void; label: string; preview: ReactNode; note?: string; disabled?: boolean }>) {
  return (
    <button type="button" className="visual-tile" data-active={active} aria-pressed={active} onClick={onClick} disabled={disabled}>
      <span className="visual-tile__preview">{preview}</span>
      <span className="visual-tile__label">{label}</span>
      {note ? <span className="visual-tile__note">{note}</span> : null}
    </button>
  );
}

function FrameGlyph({ frameStyle }: Readonly<{ frameStyle: QRFrameStyle }>) {
  return <svg viewBox="0 0 96 96" aria-hidden="true"><rect x="22" y="18" width="52" height="52" rx={frameStyle === "circle" ? 26 : frameStyle === "rounded" ? 16 : 8} fill="none" stroke="currentColor" strokeWidth="5" /><rect x="32" y="28" width="32" height="32" rx="6" fill="currentColor" opacity="0.84" />{frameStyle === "card" ? <rect x="38" y="10" width="20" height="8" rx="4" fill="currentColor" /> : null}{frameStyle === "hanger" ? <rect x="42" y="8" width="12" height="10" rx="5" fill="currentColor" /> : null}{frameStyle === "phone" ? <rect x="41" y="14" width="14" height="4" rx="2" fill="currentColor" /> : null}{frameStyle === "ribbon" ? <path d="M28 70H68L61 80L48 76L35 80L28 70Z" fill="currentColor" opacity="0.84" /> : null}{frameStyle === "ticket" ? <path d="M18 32C24 32 28 36 28 42C28 48 24 52 18 52M78 32C72 32 68 36 68 42C68 48 72 52 78 52" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /> : null}</svg>;
}

function StyleGlyph({ style }: Readonly<{ style: QRStyle }>) {
  const fill = "currentColor";
  switch (style) {
    case "square":
      return <svg viewBox="0 0 96 96" aria-hidden="true"><rect x="18" y="18" width="18" height="18" fill={fill} /><rect x="42" y="18" width="18" height="18" fill={fill} opacity="0.82" /><rect x="18" y="42" width="18" height="18" fill={fill} opacity="0.82" /><rect x="54" y="54" width="18" height="18" fill={fill} /></svg>;
    case "dots":
      return <svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="24" cy="24" r="8" fill={fill} /><circle cx="48" cy="24" r="8" fill={fill} opacity="0.84" /><circle cx="72" cy="24" r="8" fill={fill} /><circle cx="36" cy="56" r="8" fill={fill} opacity="0.84" /><circle cx="60" cy="56" r="8" fill={fill} /></svg>;
    case "lines":
      return <svg viewBox="0 0 96 96" aria-hidden="true"><rect x="14" y="20" width="68" height="10" rx="5" fill={fill} /><rect x="24" y="43" width="48" height="10" rx="5" fill={fill} opacity="0.84" /><rect x="14" y="66" width="68" height="10" rx="5" fill={fill} /></svg>;
    case "triangles":
      return <svg viewBox="0 0 96 96" aria-hidden="true"><path d="M18 36L30 16L42 36Z" fill={fill} /><path d="M48 36L60 16L72 36Z" fill={fill} opacity="0.82" /><path d="M30 72L42 50L54 72Z" fill={fill} /><path d="M60 72L72 50L84 72Z" fill={fill} opacity="0.82" /></svg>;
    case "hexagons":
      return <svg viewBox="0 0 96 96" aria-hidden="true"><path d="M24 20L34 14L44 20V32L34 38L24 32Z" fill={fill} /><path d="M50 20L60 14L70 20V32L60 38L50 32Z" fill={fill} opacity="0.82" /><path d="M37 46L47 40L57 46V58L47 64L37 58Z" fill={fill} /></svg>;
    case "blobs":
      return <svg viewBox="0 0 96 96" aria-hidden="true"><ellipse cx="30" cy="28" rx="12" ry="10" fill={fill} /><ellipse cx="56" cy="24" rx="12" ry="9" fill={fill} opacity="0.84" /><ellipse cx="44" cy="54" rx="18" ry="12" fill={fill} /></svg>;
    case "glyphs":
      return <svg viewBox="0 0 96 96" aria-hidden="true"><path d="M24 18H36V30H48V42H36V54H24V42H12V30H24Z" fill={fill} /><path d="M60 30H72V42H84V54H72V66H60V54H48V42H60Z" fill={fill} opacity="0.82" /></svg>;
    case "fractal":
      return <svg viewBox="0 0 96 96" aria-hidden="true"><rect x="18" y="18" width="36" height="36" fill="none" stroke={fill} strokeWidth="5" /><rect x="30" y="30" width="12" height="12" fill={fill} /><rect x="54" y="42" width="24" height="24" fill="none" stroke={fill} strokeWidth="5" /></svg>;
    default:
      return null;
  }
}

function FinderGlyph({ border, center }: Readonly<{ border?: QRFinderBorderStyle; center?: QRFinderCenterStyle }>) {
  return <svg viewBox="0 0 96 96" aria-hidden="true">{border === "square" ? <rect x="20" y="20" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="6" /> : null}{border === "rounded" ? <rect x="20" y="20" width="56" height="56" rx="16" fill="none" stroke="currentColor" strokeWidth="6" /> : null}{border === "circle" ? <circle cx="48" cy="48" r="28" fill="none" stroke="currentColor" strokeWidth="6" /> : null}{border === "leaf" ? <path d="M48 20C63 20 76 33 76 48C76 63 63 76 48 76C33 76 20 63 20 48C20 33 33 20 48 20Z" fill="none" stroke="currentColor" strokeWidth="6" /> : null}{border === "bubble" ? <path d="M20 22H76V68H58L48 78L42 68H20V22Z" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" /> : null}{border === "focus" ? <path d="M22 40V22H40M56 22H74V40M74 56V74H56M40 74H22V56" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /> : null}{border === "cut" ? <path d="M34 20H62L76 34V62L62 76H34L20 62V34L34 20Z" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" /> : null}{border === "soft_square" ? <rect x="18" y="18" width="60" height="60" rx="20" fill="none" stroke="currentColor" strokeWidth="6" /> : null}{center === "square" ? <rect x="28" y="28" width="40" height="40" fill="currentColor" /> : null}{center === "rounded" ? <rect x="28" y="28" width="40" height="40" rx="12" fill="currentColor" /> : null}{center === "circle" ? <circle cx="48" cy="48" r="20" fill="currentColor" /> : null}{center === "leaf" ? <path d="M48 24C60 24 70 34 70 48C70 62 60 72 48 72C36 72 26 62 26 48C26 34 36 24 48 24Z" fill="currentColor" /> : null}{center === "burst" ? <path d="M48 22L54 32L66 26L64 39L76 42L68 52L76 62L64 65L66 78L54 72L48 82L42 72L30 78L32 65L20 62L28 52L20 42L32 39L30 26L42 32L48 22Z" fill="currentColor" /> : null}{center === "star" ? <path d="M48 22L56 40L76 42L61 55L65 74L48 64L31 74L35 55L20 42L40 40L48 22Z" fill="currentColor" /> : null}{center === "diamond" ? <path d="M48 20L76 48L48 76L20 48L48 20Z" fill="currentColor" /> : null}{center === "cross" ? <path d="M40 20H56V40H76V56H56V76H40V56H20V40H40V20Z" fill="currentColor" /> : null}</svg>;
}

function Field({ label, children, full = false }: Readonly<{ label: string; children: ReactNode; full?: boolean }>) {
  return <label className={`studio-field${full ? " studio-field--full" : ""}`}><span className="field-label">{label}</span><div className="glass-field studio-field__shell">{children}</div></label>;
}

function TextInput({ value, onChange, type = "text" }: Readonly<{ value: string; onChange: (value: string) => void; type?: string }>) { return <input className="studio-input" type={type} value={value} onChange={(event) => onChange(event.target.value)} spellCheck={false} />; }
function TextArea({ value, onChange }: Readonly<{ value: string; onChange: (value: string) => void }>) { return <textarea className="studio-textarea" rows={4} value={value} onChange={(event) => onChange(event.target.value)} spellCheck={false} />; }

function shortPayload(payload: string) { const trimmed = payload.trim(); return trimmed.length > 90 ? `${trimmed.slice(0, 90)}...` : trimmed; }

export function StudioControlsPanel({ copy }: Readonly<StudioControlsPanelProps>) {
  const [designTab, setDesignTab] = useState<DesignTab>("frame");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeLogoPreset, setActiveLogoPreset] = useState<QRLogoPreset | null>(null);
  const referenceInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const {
    contentType,
    contentDraft,
    data,
    preset,
    style,
    color,
    background,
    transparent_background,
    camouflage,
    perception_mode,
    perception_strength,
    reference_image,
    logo_image,
    logo_scale,
    size,
    livePreview,
    locale,
    loading,
    error,
    frameStyle,
    finderBorderStyle,
    finderCenterStyle,
    borderColor,
    centerColor,
    gradientEnabled,
    setContentType,
    setContentField,
    setPreset,
    setStyle,
    setColor,
    setBackground,
    setTransparentBackground,
    setCamouflage,
    setPerceptionMode,
    setPerceptionStrength,
    setReferenceImage,
    setLogoImage,
    setLogoScale,
    setSize,
    setLivePreview,
    setFrameStyle,
    setFinderBorderStyle,
    setFinderCenterStyle,
    setBorderColor,
    setCenterColor,
    setGradientEnabled,
    generate,
  } = useQRStore(
    useShallow((state) => ({
      contentType: state.contentType,
      contentDraft: state.contentDraft,
      data: state.data,
      preset: state.preset,
      style: state.style,
      color: state.color,
      background: state.background,
      transparent_background: state.transparent_background,
      camouflage: state.camouflage,
      perception_mode: state.perception_mode,
      perception_strength: state.perception_strength,
      reference_image: state.reference_image,
      logo_image: state.logo_image,
      logo_scale: state.logo_scale,
      size: state.size,
      livePreview: state.livePreview,
      locale: state.locale,
      loading: state.loading,
      error: state.error,
      frameStyle: state.frameStyle,
      finderBorderStyle: state.finderBorderStyle,
      finderCenterStyle: state.finderCenterStyle,
      borderColor: state.borderColor,
      centerColor: state.centerColor,
      gradientEnabled: state.gradientEnabled,
      setContentType: state.setContentType,
      setContentField: state.setContentField,
      setPreset: state.setPreset,
      setStyle: state.setStyle,
      setColor: state.setColor,
      setBackground: state.setBackground,
      setTransparentBackground: state.setTransparentBackground,
      setCamouflage: state.setCamouflage,
      setPerceptionMode: state.setPerceptionMode,
      setPerceptionStrength: state.setPerceptionStrength,
      setReferenceImage: state.setReferenceImage,
      setLogoImage: state.setLogoImage,
      setLogoScale: state.setLogoScale,
      setSize: state.setSize,
      setLivePreview: state.setLivePreview,
      setFrameStyle: state.setFrameStyle,
      setFinderBorderStyle: state.setFinderBorderStyle,
      setFinderCenterStyle: state.setFinderCenterStyle,
      setBorderColor: state.setBorderColor,
      setCenterColor: state.setCenterColor,
      setGradientEnabled: state.setGradientEnabled,
      generate: state.generate,
    })),
  );
  const localeKey: LocaleKey = locale === "en" ? "en" : "pt-BR";
  const labels = COPY[localeKey];
  const combinedError = uploadError ?? error;
  const effectivePerceptionMode = reference_image ? perception_mode : "off";
  const payloadPreview = useMemo(() => shortPayload(data), [data]);

  useEffect(() => {
    let cancelled = false;

    if (!activeLogoPreset) {
      return () => {
        cancelled = true;
      };
    }

    void buildLogoPresetPngDataUrl(activeLogoPreset, borderColor, color)
      .then((dataUrl) => {
        if (!cancelled) {
          setUploadError(null);
          setLogoImage(dataUrl);
        }
      })
      .catch((presetError) => {
        if (!cancelled) {
          setUploadError(
            localizeRuntimeMessage(
              presetError instanceof Error ? presetError.message : "The selected file could not be read.",
              locale,
            ),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeLogoPreset, borderColor, color, locale, setLogoImage]);

  async function handleImageSelection(file: File | undefined, kind: "reference" | "logo") {
    if (!file) {
      return;
    }

    if (!SUPPORTED_IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_BYTES) {
      setUploadError(kind === "reference" ? copy.fields.referenceImageHint : copy.fields.logoImageHint);
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setUploadError(null);

      if (kind === "reference") {
        setReferenceImage(dataUrl);
        return;
      }

      setActiveLogoPreset(null);
      setLogoImage(dataUrl);
    } catch (selectionError) {
      setUploadError(
        localizeRuntimeMessage(
          selectionError instanceof Error ? selectionError.message : "The selected file could not be read.",
          locale,
        ),
      );
    }
  }

  function selectLogoPreset(presetId: QRLogoPreset) {
    setActiveLogoPreset(presetId);
  }

  function renderContentFields() {
    const fields = labels.fields;

    switch (contentType) {
      case "link":
        return (
          <Field label={fields.url} full>
            <TextInput value={contentDraft.url} onChange={(value) => setContentField("url", value)} />
          </Field>
        );
      case "text":
        return (
          <Field label={fields.text} full>
            <TextArea value={contentDraft.text} onChange={(value) => setContentField("text", value)} />
          </Field>
        );
      case "email":
        return (
          <>
            <Field label={fields.emailAddress}>
              <TextInput type="email" value={contentDraft.emailAddress} onChange={(value) => setContentField("emailAddress", value)} />
            </Field>
            <Field label={fields.emailSubject}>
              <TextInput value={contentDraft.emailSubject} onChange={(value) => setContentField("emailSubject", value)} />
            </Field>
            <Field label={fields.emailBody} full>
              <TextArea value={contentDraft.emailBody} onChange={(value) => setContentField("emailBody", value)} />
            </Field>
          </>
        );
      case "call":
        return (
          <Field label={fields.phoneNumber} full>
            <TextInput value={contentDraft.phoneNumber} onChange={(value) => setContentField("phoneNumber", value)} />
          </Field>
        );
      case "sms":
        return (
          <>
            <Field label={fields.smsNumber}>
              <TextInput value={contentDraft.smsNumber} onChange={(value) => setContentField("smsNumber", value)} />
            </Field>
            <Field label={fields.smsMessage} full>
              <TextArea value={contentDraft.smsMessage} onChange={(value) => setContentField("smsMessage", value)} />
            </Field>
          </>
        );
      case "vcard":
        return (
          <>
            <Field label={fields.firstName}>
              <TextInput value={contentDraft.vcardFirstName} onChange={(value) => setContentField("vcardFirstName", value)} />
            </Field>
            <Field label={fields.lastName}>
              <TextInput value={contentDraft.vcardLastName} onChange={(value) => setContentField("vcardLastName", value)} />
            </Field>
            <Field label={fields.company}>
              <TextInput value={contentDraft.vcardCompany} onChange={(value) => setContentField("vcardCompany", value)} />
            </Field>
            <Field label={fields.role}>
              <TextInput value={contentDraft.vcardRole} onChange={(value) => setContentField("vcardRole", value)} />
            </Field>
            <Field label={fields.phoneNumber}>
              <TextInput value={contentDraft.vcardPhone} onChange={(value) => setContentField("vcardPhone", value)} />
            </Field>
            <Field label={fields.emailAddress}>
              <TextInput type="email" value={contentDraft.vcardEmail} onChange={(value) => setContentField("vcardEmail", value)} />
            </Field>
            <Field label={fields.website} full>
              <TextInput value={contentDraft.vcardWebsite} onChange={(value) => setContentField("vcardWebsite", value)} />
            </Field>
          </>
        );
      case "whatsapp":
        return (
          <>
            <Field label={fields.whatsappNumber}>
              <TextInput value={contentDraft.whatsappNumber} onChange={(value) => setContentField("whatsappNumber", value)} />
            </Field>
            <Field label={fields.whatsappMessage} full>
              <TextArea value={contentDraft.whatsappMessage} onChange={(value) => setContentField("whatsappMessage", value)} />
            </Field>
          </>
        );
      case "wifi":
        return (
          <>
            <Field label={fields.wifiSsid}>
              <TextInput value={contentDraft.wifiSsid} onChange={(value) => setContentField("wifiSsid", value)} />
            </Field>
            <Field label={fields.wifiPassword}>
              <TextInput value={contentDraft.wifiPassword} onChange={(value) => setContentField("wifiPassword", value)} />
            </Field>
            <Field label={fields.wifiSecurity}>
              <select
                className="studio-select"
                value={contentDraft.wifiSecurity}
                onChange={(event) => setContentField("wifiSecurity", event.target.value as QRWifiSecurity)}
              >
                <option value="WPA">{labels.wifiSecurity.WPA}</option>
                <option value="WEP">{labels.wifiSecurity.WEP}</option>
                <option value="nopass">{labels.wifiSecurity.nopass}</option>
              </select>
            </Field>
            <div className="studio-field studio-field--toggle">
              <span className="field-label">{fields.wifiHidden}</span>
              <button
                type="button"
                className="toggle"
                data-active={contentDraft.wifiHidden}
                aria-pressed={contentDraft.wifiHidden}
                onClick={() => setContentField("wifiHidden", !contentDraft.wifiHidden)}
              >
                <span className="toggle__thumb" />
              </button>
            </div>
          </>
        );
      case "app":
        return (
          <>
            <Field label={fields.appName}>
              <TextInput value={contentDraft.appName} onChange={(value) => setContentField("appName", value)} />
            </Field>
            <Field label={fields.appDeepLink}>
              <TextInput value={contentDraft.appDeepLink} onChange={(value) => setContentField("appDeepLink", value)} />
            </Field>
            <Field label={fields.appStoreUrl} full>
              <TextInput value={contentDraft.appStoreUrl} onChange={(value) => setContentField("appStoreUrl", value)} />
            </Field>
            <Field label={fields.playStoreUrl} full>
              <TextInput value={contentDraft.playStoreUrl} onChange={(value) => setContentField("playStoreUrl", value)} />
            </Field>
          </>
        );
      case "event":
        return (
          <>
            <Field label={fields.eventTitle}>
              <TextInput value={contentDraft.eventTitle} onChange={(value) => setContentField("eventTitle", value)} />
            </Field>
            <Field label={fields.eventLocation}>
              <TextInput value={contentDraft.eventLocation} onChange={(value) => setContentField("eventLocation", value)} />
            </Field>
            <Field label={fields.eventStart}>
              <TextInput type="datetime-local" value={contentDraft.eventStart} onChange={(value) => setContentField("eventStart", value)} />
            </Field>
            <Field label={fields.eventEnd}>
              <TextInput type="datetime-local" value={contentDraft.eventEnd} onChange={(value) => setContentField("eventEnd", value)} />
            </Field>
            <Field label={fields.eventDescription} full>
              <TextArea value={contentDraft.eventDescription} onChange={(value) => setContentField("eventDescription", value)} />
            </Field>
          </>
        );
      case "barcode_2d":
        return (
          <Field label={fields.barcodeValue} full>
            <TextInput value={contentDraft.barcodeValue} onChange={(value) => setContentField("barcodeValue", value)} />
          </Field>
        );
      default:
        return null;
    }
  }

  return (
    <motion.form
      className="glass-panel control-panel control-panel--studio"
      initial={{ opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      onSubmit={(event) => {
        event.preventDefault();
        void generate(true);
      }}
    >
      <div className="panel-head">
        <p className="panel-label">{copy.eyebrow}</p>
        <h2 className="panel-title">{copy.title}</h2>
        <p className="panel-copy">{copy.summary}</p>
      </div>

      <section className="studio-type-strip">
        <div className="studio-type-grid">
          {CONTENT_TYPE_ORDER.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className="content-type-tile"
              data-active={contentType === id}
              aria-pressed={contentType === id}
              onClick={() => setContentType(id)}
            >
              <span className="content-type-tile__icon">
                <Icon size={16} />
              </span>
              <span className="content-type-tile__label">{labels.contentTypes[id]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="studio-step">
        <StepHeader index={1} title={labels.stepOne} />
        <div className="studio-content-grid">{renderContentFields()}</div>
        <div className="studio-payload-card">
          <span className="field-label">{labels.payload}</span>
          <p className="studio-payload-card__value">{payloadPreview || data}</p>
        </div>
      </section>

      <section className="studio-step">
        <StepHeader index={2} title={labels.stepTwo} />

        <div className="studio-tabbar" role="tablist">
          {DESIGN_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className="studio-tab"
              data-active={designTab === tab}
              aria-selected={designTab === tab}
              onClick={() => setDesignTab(tab)}
            >
              {labels.tabs[tab]}
            </button>
          ))}
        </div>

        {designTab === "frame" ? (
          <div className="studio-tabpanel">
            <div className="studio-section-card">
              <div className="visual-tile-grid visual-tile-grid--frames">
                {FRAME_STYLE_ORDER.map((option) => (
                  <TileButton
                    key={option}
                    active={frameStyle === option}
                    label={labels.frameStyles[option]}
                    onClick={() => setFrameStyle(option)}
                    preview={<FrameGlyph frameStyle={option} />}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {designTab === "shape" ? (
          <div className="studio-tabpanel">
            <div className="studio-section-card">
              <div className="visual-tile-grid visual-tile-grid--styles">
                {STYLE_ORDER.map((option) => (
                  <TileButton
                    key={option}
                    active={style === option}
                    label={copy.styles[option].label}
                    onClick={() => setStyle(option)}
                    preview={<StyleGlyph style={option} />}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {designTab === "border" ? (
          <div className="studio-tabpanel">
            <div className="studio-section-card">
              <div className="visual-tile-grid visual-tile-grid--finder">
                {FINDER_BORDER_STYLE_ORDER.map((option) => (
                  <TileButton
                    key={option}
                    active={finderBorderStyle === option}
                    label={labels.finderBorders[option]}
                    onClick={() => setFinderBorderStyle(option)}
                    preview={<FinderGlyph border={option} />}
                  />
                ))}
              </div>
            </div>

            <div className="studio-section-card">
              <div className="visual-tile-grid visual-tile-grid--finder">
                {FINDER_CENTER_STYLE_ORDER.map((option) => (
                  <TileButton
                    key={option}
                    active={finderCenterStyle === option}
                    label={labels.finderCenters[option]}
                    onClick={() => setFinderCenterStyle(option)}
                    preview={<FinderGlyph center={option} />}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {designTab === "logo" ? (
          <div className="studio-tabpanel">
            <div className="studio-upload-grid">
              <div className="upload-card upload-card--studio">
                <div className="upload-meta">
                  <span className="field-label">{labels.tabs.logo}</span>
                  <strong>{logo_image ? copy.helpers.logoReady : copy.fields.logoImageLabel}</strong>
                  <span>{copy.fields.logoImageHint}</span>
                </div>

                <div className="upload-actions">
                  <input
                    ref={logoInputRef}
                    className="sr-only"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      void handleImageSelection(event.currentTarget.files?.[0], "logo");
                      event.currentTarget.value = "";
                    }}
                  />
                  <button type="button" className="action-button action-button--secondary" onClick={() => logoInputRef.current?.click()}>
                    <Upload size={16} />
                    {logo_image ? copy.buttons.replace : copy.buttons.upload}
                  </button>
                  {logo_image ? (
                    <button
                      type="button"
                      className="action-button"
                      onClick={() => {
                        setActiveLogoPreset(null);
                        setLogoImage(null);
                      }}
                    >
                      {copy.buttons.clear}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="studio-panel-stack">
                <div className="studio-section-card studio-section-card--nested">
                  <div className="studio-section-card__head">
                    <span className="field-label">{labels.chooseLogo}</span>
                  </div>
                  <div className="visual-tile-grid visual-tile-grid--logos">
                    {LOGO_PRESET_ORDER.map((option) => (
                      <TileButton
                        key={option}
                        active={activeLogoPreset === option}
                        label={labels.logoPresets[option]}
                        onClick={() => selectLogoPreset(option)}
                        preview={<span className="logo-preset-swatch" style={{ backgroundImage: `url(${buildLogoPresetDataUrl(option, borderColor, color)})` }} />}
                      />
                    ))}
                  </div>
                </div>

                <div className="studio-range-card studio-range-card--nested">
                  <div className="range-row">
                    <span className="field-label">{copy.fields.logoScaleLabel}</span>
                    <span className="range-value">{Math.round(logo_scale * 100)}%</span>
                  </div>
                  <input
                    id="qr-logo-scale"
                    type="range"
                    min={0.14}
                    max={0.3}
                    step={0.01}
                    value={logo_scale}
                    disabled={!logo_image}
                    onChange={(event) => setLogoScale(Number(event.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {designTab === "camouflage" ? (
          <div className="studio-tabpanel">
            <div className="studio-upload-grid">
              <div className="upload-card upload-card--studio">
                <div className="upload-meta">
                  <span className="field-label">{labels.tabs.camouflage}</span>
                  <strong>{reference_image ? copy.helpers.referenceReady : copy.fields.referenceImageLabel}</strong>
                  <span>{copy.fields.referenceImageHint}</span>
                </div>

                <div className="upload-actions">
                  <input
                    ref={referenceInputRef}
                    className="sr-only"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      void handleImageSelection(event.currentTarget.files?.[0], "reference");
                      event.currentTarget.value = "";
                    }}
                  />
                  <button type="button" className="action-button action-button--secondary" onClick={() => referenceInputRef.current?.click()}>
                    <Upload size={16} />
                    {reference_image ? copy.buttons.replace : copy.buttons.upload}
                  </button>
                  {reference_image ? (
                    <button type="button" className="action-button" onClick={() => setReferenceImage(null)}>
                      {copy.buttons.clear}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="studio-panel-stack">
                <div className="studio-section-card studio-section-card--nested">
                  <div className="studio-section-card__head">
                    <span className="field-label">{copy.fields.perceptionModeLabel}</span>
                  </div>
                  <div className="visual-tile-grid visual-tile-grid--perception">
                    {PERCEPTION_MODE_ORDER.map((option) => (
                      <TileButton
                        key={option}
                        active={effectivePerceptionMode === option}
                        label={copy.perceptionModes[option].label}
                        onClick={() => setPerceptionMode(option)}
                        preview={<ScanLine size={18} />}
                        disabled={!reference_image && option !== "off"}
                      />
                    ))}
                  </div>
                </div>

                <div className="studio-range-grid studio-range-grid--stacked">
                  <div className="studio-range-card studio-range-card--nested">
                    <div className="range-row">
                      <span className="field-label">{copy.fields.perceptionStrengthLabel}</span>
                      <span className="range-value">{Math.round(perception_strength * 100)}%</span>
                    </div>
                    <input
                      id="qr-perception-strength"
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={perception_strength}
                      disabled={!reference_image || effectivePerceptionMode === "off"}
                      onChange={(event) => setPerceptionStrength(Number(event.target.value))}
                    />
                  </div>

                  <div className="studio-range-card studio-range-card--nested">
                    <div className="range-row">
                      <span className="field-label">{copy.fields.camouflageLabel}</span>
                      <span className="range-value">{Math.round(camouflage * 100)}%</span>
                    </div>
                    <input
                      id="qr-camouflage"
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={camouflage}
                      onChange={(event) => setCamouflage(Number(event.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {designTab === "presets" ? (
          <div className="studio-tabpanel">
            <div className="studio-section-card">
              <div className="visual-tile-grid visual-tile-grid--presets">
                {PRESET_ORDER.map((option) => (
                  <TileButton
                    key={option}
                    active={preset === option}
                    label={copy.presets[option].label}
                    onClick={() => setPreset(option)}
                    preview={
                      <StyleGlyph
                        style={
                          option === "wireframe"
                            ? "lines"
                            : option === "organic"
                              ? "blobs"
                              : option === "cyberpunk"
                                ? "triangles"
                                : option === "ink" || option === "minimal"
                                  ? "square"
                                  : "dots"
                        }
                      />
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}

      </section>

      <section className="studio-step">
        <StepHeader index={3} title={labels.stepThree} />

        <div className="studio-canvas-grid">
          <div className="studio-section-card">
            <div className="studio-section-card__head">
              <span className="field-label">{labels.tabs.shape}</span>
            </div>

            <div className="studio-surface-grid">
              <div className="studio-section-card studio-section-card--nested">
                <Field label={copy.fields.foregroundLabel}>
                  <input id="qr-color" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
                  <span className="color-token">{color}</span>
                </Field>
              </div>

              <div className="studio-section-card studio-section-card--nested">
                <Field label={copy.fields.backgroundLabel}>
                  <input id="qr-background" type="color" value={background} onChange={(event) => setBackground(event.target.value)} />
                  <span className="color-token">{transparent_background ? copy.fields.transparentBackgroundValue : background}</span>
                </Field>
              </div>

              <div className="studio-section-card studio-section-card--nested">
                <div className="toggle-row">
                  <div className="field-label">{copy.fields.transparentBackgroundLabel}</div>
                  <button
                    type="button"
                    className="toggle"
                    data-active={transparent_background}
                    aria-pressed={transparent_background}
                    onClick={() => setTransparentBackground(!transparent_background)}
                  >
                    <span className="toggle__thumb" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="studio-section-card">
            <div className="studio-section-card__head">
              <span className="field-label">{labels.tabs.border}</span>
            </div>

            <div className="studio-surface-grid">
              <div className="studio-section-card studio-section-card--nested">
                <Field label={labels.border}>
                  <input id="qr-border-color" type="color" value={borderColor} onChange={(event) => setBorderColor(event.target.value)} />
                  <span className="color-token">{borderColor}</span>
                </Field>
              </div>

              <div className="studio-section-card studio-section-card--nested">
                <Field label={labels.center}>
                  <input id="qr-center-color" type="color" value={centerColor} onChange={(event) => setCenterColor(event.target.value)} />
                  <span className="color-token">{centerColor}</span>
                </Field>
              </div>

              <div className="studio-section-card studio-section-card--nested">
                <div className="toggle-row">
                  <div className="field-label">{labels.gradient}</div>
                  <button
                    type="button"
                    className="toggle"
                    data-active={gradientEnabled}
                    aria-pressed={gradientEnabled}
                    onClick={() => setGradientEnabled(!gradientEnabled)}
                  >
                    <span className="toggle__thumb" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="studio-footer-grid">
          <div className="studio-range-card">
            <div className="range-row">
              <span className="field-label">
                <SlidersHorizontal size={15} />
                {copy.fields.sizeLabel}
              </span>
              <span className="range-value">{size}px</span>
            </div>
            <input id="qr-size" type="range" min={256} max={1024} step={32} value={size} onChange={(event) => setSize(Number(event.target.value))} />
          </div>

          <div className="studio-range-card">
            <div className="toggle-row">
              <div className="field-label">
                <RefreshCw size={15} />
                {copy.fields.livePreviewLabel}
              </div>
              <button
                type="button"
                className="toggle"
                data-active={livePreview}
                aria-pressed={livePreview}
                onClick={() => setLivePreview(!livePreview)}
              >
                <span className="toggle__thumb" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {combinedError ? <div className="error-banner">{combinedError}</div> : null}

      <div className="action-row studio-action-row">
        <button type="submit" className="action-button action-button--primary" disabled={loading || !data.trim()}>
          <Sparkles size={16} />
          {loading ? copy.buttons.generating : copy.buttons.generate}
        </button>
      </div>
    </motion.form>
  );
}

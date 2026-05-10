export type QRLogoPreset =
  | "link"
  | "location"
  | "mail"
  | "whatsapp"
  | "wifi"
  | "briefcase"
  | "paypal"
  | "bitcoin"
  | "scan";

export const LOGO_PRESET_ORDER: QRLogoPreset[] = [
  "link",
  "location",
  "mail",
  "whatsapp",
  "wifi",
  "briefcase",
  "paypal",
  "bitcoin",
  "scan",
];

const OFFICIAL_ICON_URLS: Partial<Record<QRLogoPreset, string>> = {
  link: "https://cdn.simpleicons.org/google",
  location: "https://cdn.simpleicons.org/googlemaps",
  mail: "https://cdn.simpleicons.org/gmail",
  whatsapp: "https://cdn.simpleicons.org/whatsapp",
  briefcase: "https://cdn.simpleicons.org/linkedin",
  paypal: "https://cdn.simpleicons.org/paypal",
  bitcoin: "https://cdn.simpleicons.org/bitcoin",
  scan: "https://cdn.simpleicons.org/googlelens",
};

function svgDataUrl(markup: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

function loadImageSource(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";

    if (/^https?:/i.test(source)) {
      image.crossOrigin = "anonymous";
    }

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The selected file could not be read."));
    image.src = source;
  });
}

function genericIconMarkup(preset: QRLogoPreset, foreground: string) {
  switch (preset) {
    case "wifi":
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
          <path d="M24 40C38 28 58 28 72 40" stroke="${foreground}" stroke-width="7" stroke-linecap="round"/>
          <path d="M32 50C42 42 54 42 64 50" stroke="${foreground}" stroke-width="7" stroke-linecap="round"/>
          <path d="M40 61C45 57 51 57 56 61" stroke="${foreground}" stroke-width="7" stroke-linecap="round"/>
          <circle cx="48" cy="71" r="5.5" fill="${foreground}"/>
        </svg>
      `;
    default:
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
          <circle cx="48" cy="48" r="24" fill="${foreground}"/>
        </svg>
      `;
  }
}

function resolveSwatchSource(preset: QRLogoPreset, foreground: string) {
  return OFFICIAL_ICON_URLS[preset] ?? svgDataUrl(genericIconMarkup(preset, foreground));
}

function resolveRasterSource(preset: QRLogoPreset, foreground: string) {
  return OFFICIAL_ICON_URLS[preset] ?? svgDataUrl(genericIconMarkup(preset, foreground));
}

export function buildLogoPresetDataUrl(preset: QRLogoPreset, _accent = "#0F172A", foreground = "#FFFFFF") {
  return resolveSwatchSource(preset, foreground);
}

export async function buildLogoPresetPngDataUrl(preset: QRLogoPreset, _accent = "#0F172A", foreground = "#FFFFFF") {
  const source = resolveRasterSource(preset, foreground);

  if (typeof document === "undefined") {
    return source;
  }

  const image = await loadImageSource(source);
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("The selected file could not be read.");
  }

  const inset = 10;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, inset, inset, canvas.width - inset * 2, canvas.height - inset * 2);

  return canvas.toDataURL("image/png");
}

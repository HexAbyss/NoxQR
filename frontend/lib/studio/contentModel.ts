export type QRContentType =
  | "link"
  | "text"
  | "email"
  | "call"
  | "sms"
  | "vcard"
  | "whatsapp"
  | "wifi"
  | "app"
  | "event"
  | "barcode_2d";

export type QRWifiSecurity = "WPA" | "WEP" | "nopass";

export interface QRContentDraft {
  url: string;
  text: string;
  emailAddress: string;
  emailSubject: string;
  emailBody: string;
  phoneNumber: string;
  smsNumber: string;
  smsMessage: string;
  vcardFirstName: string;
  vcardLastName: string;
  vcardCompany: string;
  vcardRole: string;
  vcardPhone: string;
  vcardEmail: string;
  vcardWebsite: string;
  whatsappNumber: string;
  whatsappMessage: string;
  wifiSsid: string;
  wifiPassword: string;
  wifiSecurity: QRWifiSecurity;
  wifiHidden: boolean;
  pdfUrl: string;
  appName: string;
  appStoreUrl: string;
  playStoreUrl: string;
  appDeepLink: string;
  imageUrl: string;
  videoUrl: string;
  socialLabel: string;
  socialUrl: string;
  eventTitle: string;
  eventLocation: string;
  eventStart: string;
  eventEnd: string;
  eventDescription: string;
  barcodeValue: string;
}

export const DEFAULT_QR_CONTENT_TYPE: QRContentType = "link";

export const DEFAULT_QR_CONTENT_DRAFT: QRContentDraft = {
  url: "https://nox.engine/demo",
  text: "NOX visual encoding engine",
  emailAddress: "hello@nox.engine",
  emailSubject: "NOX demo",
  emailBody: "Hello from the NOX studio.",
  phoneNumber: "+5511999999999",
  smsNumber: "+5511999999999",
  smsMessage: "Hello from the NOX studio.",
  vcardFirstName: "NOX",
  vcardLastName: "Studio",
  vcardCompany: "NOX",
  vcardRole: "Visual Encoding Engine",
  vcardPhone: "+5511999999999",
  vcardEmail: "hello@nox.engine",
  vcardWebsite: "https://nox.engine/demo",
  whatsappNumber: "5511999999999",
  whatsappMessage: "Hello from the NOX studio.",
  wifiSsid: "NOX Studio",
  wifiPassword: "nox-demo-2026",
  wifiSecurity: "WPA",
  wifiHidden: false,
  pdfUrl: "https://nox.engine/demo.pdf",
  appName: "NOX",
  appStoreUrl: "https://apps.apple.com/",
  playStoreUrl: "https://play.google.com/store/apps",
  appDeepLink: "nox://demo",
  imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475",
  videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  socialLabel: "Instagram",
  socialUrl: "https://instagram.com/nox.engine",
  eventTitle: "NOX Launch",
  eventLocation: "Sao Paulo",
  eventStart: "2026-05-04T19:00",
  eventEnd: "2026-05-04T22:00",
  eventDescription: "Open-source QR launch session.",
  barcodeValue: "NOX-2D-2026-001",
};

function trimValue(value: string) {
  return value.trim();
}

function encodeQueryPart(value: string) {
  return encodeURIComponent(value.trim());
}

function digitsOnly(value: string) {
  return value.replace(/[^\d+]/g, "").trim();
}

function stripWhatsappPrefix(value: string) {
  return value.replace(/[^\d]/g, "");
}

function formatDateForICS(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return trimmed;
  }

  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function joinNonEmpty(lines: string[]) {
  return lines.filter(Boolean).join("\n");
}

export function buildQrContentData(contentType: QRContentType, draft: QRContentDraft) {
  switch (contentType) {
    case "link":
      return trimValue(draft.url);
    case "text":
      return draft.text.trim();
    case "email": {
      const address = trimValue(draft.emailAddress);
      const params = new URLSearchParams();
      if (trimValue(draft.emailSubject)) {
        params.set("subject", draft.emailSubject.trim());
      }
      if (trimValue(draft.emailBody)) {
        params.set("body", draft.emailBody.trim());
      }
      const suffix = params.toString();
      return `mailto:${address}${suffix ? `?${suffix}` : ""}`;
    }
    case "call":
      return `tel:${digitsOnly(draft.phoneNumber)}`;
    case "sms":
      return `SMSTO:${digitsOnly(draft.smsNumber)}:${draft.smsMessage.trim()}`;
    case "vcard":
      return joinNonEmpty([
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${`${draft.vcardFirstName} ${draft.vcardLastName}`.trim()}`,
        trimValue(draft.vcardCompany) ? `ORG:${draft.vcardCompany.trim()}` : "",
        trimValue(draft.vcardRole) ? `TITLE:${draft.vcardRole.trim()}` : "",
        trimValue(draft.vcardPhone) ? `TEL:${digitsOnly(draft.vcardPhone)}` : "",
        trimValue(draft.vcardEmail) ? `EMAIL:${draft.vcardEmail.trim()}` : "",
        trimValue(draft.vcardWebsite) ? `URL:${draft.vcardWebsite.trim()}` : "",
        "END:VCARD",
      ]);
    case "whatsapp": {
      const number = stripWhatsappPrefix(draft.whatsappNumber);
      const message = trimValue(draft.whatsappMessage);
      return `https://wa.me/${number}${message ? `?text=${encodeQueryPart(message)}` : ""}`;
    }
    case "wifi": {
      const hidden = draft.wifiHidden ? "true" : "false";
      const passwordSegment = draft.wifiSecurity === "nopass" ? "" : `P:${draft.wifiPassword.trim()};`;
      return `WIFI:T:${draft.wifiSecurity};S:${draft.wifiSsid.trim()};${passwordSegment}H:${hidden};;`;
    }
    case "app":
      return joinNonEmpty([
        `APP:${draft.appName.trim() || "NOX"}`,
        trimValue(draft.appStoreUrl) ? `APP_STORE:${draft.appStoreUrl.trim()}` : "",
        trimValue(draft.playStoreUrl) ? `PLAY_STORE:${draft.playStoreUrl.trim()}` : "",
        trimValue(draft.appDeepLink) ? `DEEPLINK:${draft.appDeepLink.trim()}` : "",
      ]);
    case "event":
      return joinNonEmpty([
        "BEGIN:VEVENT",
        trimValue(draft.eventTitle) ? `SUMMARY:${draft.eventTitle.trim()}` : "",
        trimValue(draft.eventLocation) ? `LOCATION:${draft.eventLocation.trim()}` : "",
        trimValue(draft.eventStart) ? `DTSTART:${formatDateForICS(draft.eventStart)}` : "",
        trimValue(draft.eventEnd) ? `DTEND:${formatDateForICS(draft.eventEnd)}` : "",
        trimValue(draft.eventDescription) ? `DESCRIPTION:${draft.eventDescription.trim()}` : "",
        "END:VEVENT",
      ]);
    case "barcode_2d":
      return trimValue(draft.barcodeValue);
    default:
      return trimValue(draft.url);
  }
}

export function inferQrContentType(data: string): QRContentType {
  const normalized = data.trim();

  if (!normalized) {
    return DEFAULT_QR_CONTENT_TYPE;
  }

  if (normalized.startsWith("mailto:")) {
    return "email";
  }
  if (normalized.startsWith("tel:")) {
    return "call";
  }
  if (normalized.startsWith("SMSTO:")) {
    return "sms";
  }
  if (normalized.startsWith("BEGIN:VCARD")) {
    return "vcard";
  }
  if (normalized.startsWith("WIFI:")) {
    return "wifi";
  }
  if (normalized.startsWith("BEGIN:VEVENT")) {
    return "event";
  }
  if (normalized.startsWith("APP:")) {
    return "app";
  }
  if (/^https?:\/\/wa\.me\//i.test(normalized)) {
    return "whatsapp";
  }
  if (/^https?:\/\//i.test(normalized)) {
    return "link";
  }

  return "text";
}

export function buildDraftFromQrData(data: string) {
  const contentType = inferQrContentType(data);
  const contentDraft: QRContentDraft = {
    ...DEFAULT_QR_CONTENT_DRAFT,
  };
  const normalized = data.trim();

  switch (contentType) {
    case "link":
      contentDraft.url = normalized;
      break;
    case "text":
      contentDraft.text = normalized;
      break;
    case "barcode_2d":
      contentDraft.barcodeValue = normalized;
      break;
    default:
      break;
  }

  return {
    contentType,
    contentDraft,
  };
}

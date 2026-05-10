import type { ValidationResult } from "@/lib/api/qrClient";

export type RuntimeLocale = "pt-BR" | "en";

type StaticMessage = {
  en: string;
  pt: string;
};

type DynamicMessageRule = {
  en: RegExp;
  pt: RegExp;
  toEnglish: (...captures: string[]) => string;
  toPortuguese: (...captures: string[]) => string;
};

const STATIC_MESSAGES: StaticMessage[] = [
  {
    en: "Add content before generating a QR code.",
    pt: "Adicione um conteúdo antes de gerar o QR code.",
  },
  {
    en: "Unable to generate the QR code.",
    pt: "Não foi possível gerar o QR code.",
  },
  {
    en: "The backend could not generate a QR code.",
    pt: "O backend não conseguiu gerar o QR code.",
  },
  {
    en: "The backend returned an invalid response payload.",
    pt: "O backend retornou uma resposta inválida.",
  },
  {
    en: "The selected file could not be read.",
    pt: "Não foi possível ler o arquivo selecionado.",
  },
  {
    en: "QR data cannot be empty",
    pt: "Os dados do QR code não podem estar vazios.",
  },
  {
    en: "Camouflage strength must stay between 0.0 and 1.0.",
    pt: "A intensidade da camuflagem deve ficar entre 0.0 e 1.0.",
  },
  {
    en: "Perception strength must stay between 0.0 and 1.0.",
    pt: "A intensidade perceptual deve ficar entre 0.0 e 1.0.",
  },
  {
    en: "Perception modes require a carrier image upload.",
    pt: "Os modos perceptuais exigem o envio de uma imagem base.",
  },
  {
    en: "Logo scale must stay between 0.14 and 0.30 when a logo is embedded.",
    pt: "A escala do logo deve ficar entre 0.14 e 0.30 quando houver um logo embutido.",
  },
  {
    en: "Failed to encode PNG output",
    pt: "Não foi possível codificar a saída PNG.",
  },
  {
    en: "Transparent exports inherit the contrast of the host surface.",
    pt: "Exportações transparentes herdam o contraste da superfície onde serão exibidas.",
  },
  {
    en: "Reduce visual distortion for hostile scan conditions or small canvas sizes.",
    pt: "Reduza a distorção visual para cenários de leitura difíceis ou canvases pequenos.",
  },
  {
    en: "Increase module occupancy or use a less fragmented style profile.",
    pt: "Aumente a ocupação dos módulos ou use um estilo menos fragmentado.",
  },
  {
    en: "Prefer larger canvases when blur, distance, or poor lighting are expected.",
    pt: "Prefira canvases maiores quando houver blur, distância ou baixa iluminação.",
  },
  {
    en: "Protect the quiet zone from visual spill to preserve scanner acquisition.",
    pt: "Proteja a zona de silêncio contra interferência visual para preservar a leitura do scanner.",
  },
];

const DYNAMIC_MESSAGE_RULES: DynamicMessageRule[] = [
  {
    en: /^Foreground and background contrast is too low \(([\d.]+):1\)\. Use stronger contrast to preserve scan reliability\.$/,
    pt: /^O contraste entre primeiro plano e fundo está muito baixo \(([\d.]+):1\)\. Use um contraste maior para preservar a confiabilidade da leitura\.$/,
    toEnglish: (ratio) =>
      `Foreground and background contrast is too low (${ratio}:1). Use stronger contrast to preserve scan reliability.`,
    toPortuguese: (ratio) =>
      `O contraste entre primeiro plano e fundo está muito baixo (${ratio}:1). Use um contraste maior para preservar a confiabilidade da leitura.`,
  },
  {
    en: /^Applied a conservative render bias \(([\d.]+)%\) to improve scan reliability\.$/,
    pt: /^Foi aplicado um ajuste conservador de renderização \(([\d.]+)%\) para melhorar a confiabilidade da leitura\.$/,
    toEnglish: (amount) => `Applied a conservative render bias (${amount}%) to improve scan reliability.`,
    toPortuguese: (amount) =>
      `Foi aplicado um ajuste conservador de renderização (${amount}%) para melhorar a confiabilidade da leitura.`,
  },
  {
    en: /^Size must be between (\d+) and (\d+) pixels$/,
    pt: /^O tamanho deve ficar entre (\d+) e (\d+) pixels\.$/,
    toEnglish: (min, max) => `Size must be between ${min} and ${max} pixels`,
    toPortuguese: (min, max) => `O tamanho deve ficar entre ${min} e ${max} pixels.`,
  },
  {
    en: /^Invalid color '([^']+)'\. Use the #RRGGBB format\.$/,
    pt: /^Cor inválida '([^']+)'\. Use o formato #RRGGBB\.$/,
    toEnglish: (value) => `Invalid color '${value}'. Use the #RRGGBB format.`,
    toPortuguese: (value) => `Cor inválida '${value}'. Use o formato #RRGGBB.`,
  },
  {
    en: /^Invalid color '([^']+)'$/,
    pt: /^Cor inválida '([^']+)'\.$/,
    toEnglish: (value) => `Invalid color '${value}'`,
    toPortuguese: (value) => `Cor inválida '${value}'.`,
  },
  {
    en: /^Unable to encode QR data: (.+)$/,
    pt: /^Não foi possível codificar os dados do QR: (.+)$/,
    toEnglish: (detail) => `Unable to encode QR data: ${detail}`,
    toPortuguese: (detail) => `Não foi possível codificar os dados do QR: ${detail}`,
  },
  {
    en: /^([a-z_]+) must be a base64 image data URL\.$/,
    pt: /^(Imagem base|Imagem de referência|Logo central) deve ser um data URL de imagem em base64\.$/,
    toEnglish: (field) => `${fieldLabel(field, "en")} must be a base64 image data URL.`,
    toPortuguese: (field) => `${fieldLabel(field, "pt-BR")} deve ser um data URL de imagem em base64.`,
  },
  {
    en: /^([a-z_]+) must be PNG, JPEG, or WebP\.$/,
    pt: /^(Imagem base|Imagem de referência|Logo central) deve ser PNG, JPEG ou WebP\.$/,
    toEnglish: (field) => `${fieldLabel(field, "en")} must be PNG, JPEG, or WebP.`,
    toPortuguese: (field) => `${fieldLabel(field, "pt-BR")} deve ser PNG, JPEG ou WebP.`,
  },
  {
    en: /^([a-z_]+) contains invalid base64 data\.$/,
    pt: /^(Imagem base|Imagem de referência|Logo central) contém dados base64 inválidos\.$/,
    toEnglish: (field) => `${fieldLabel(field, "en")} contains invalid base64 data.`,
    toPortuguese: (field) => `${fieldLabel(field, "pt-BR")} contém dados base64 inválidos.`,
  },
  {
    en: /^([a-z_]+) exceeds the (\d+) byte limit\.$/,
    pt: /^(Imagem base|Imagem de referência|Logo central) excede o limite de (\d+) bytes\.$/,
    toEnglish: (field, bytes) => `${fieldLabel(field, "en")} exceeds the ${bytes} byte limit.`,
    toPortuguese: (field, bytes) => `${fieldLabel(field, "pt-BR")} excede o limite de ${bytes} bytes.`,
  },
  {
    en: /^([a-z_]+) is not a decodable image\.$/,
    pt: /^(Imagem base|Imagem de referência|Logo central) não é uma imagem decodificável\.$/,
    toEnglish: (field) => `${fieldLabel(field, "en")} is not a decodable image.`,
    toPortuguese: (field) => `${fieldLabel(field, "pt-BR")} não é uma imagem decodificável.`,
  },
  {
    en: /^([a-z_]+) is empty\.$/,
    pt: /^(Imagem base|Imagem de referência|Logo central) está vazia\.$/,
    toEnglish: (field) => `${fieldLabel(field, "en")} is empty.`,
    toPortuguese: (field) => `${fieldLabel(field, "pt-BR")} está vazia.`,
  },
  {
    en: /^([a-z_]+) must be at most (\d+)px on each side\.$/,
    pt: /^(Imagem base|Imagem de referência|Logo central) deve ter no máximo (\d+)px em cada lado\.$/,
    toEnglish: (field, size) => `${fieldLabel(field, "en")} must be at most ${size}px on each side.`,
    toPortuguese: (field, size) => `${fieldLabel(field, "pt-BR")} deve ter no máximo ${size}px em cada lado.`,
  },
  {
    en: /^([a-z_]+) could not be normalized\.$/,
    pt: /^(Imagem base|Imagem de referência|Logo central) não pôde ser normalizada\.$/,
    toEnglish: (field) => `${fieldLabel(field, "en")} could not be normalized.`,
    toPortuguese: (field) => `${fieldLabel(field, "pt-BR")} não pôde ser normalizada.`,
  },
];

function fieldLabel(field: string, locale: RuntimeLocale) {
  const normalized = field.toLowerCase();

  if (locale === "pt-BR") {
    if (normalized === "reference_image" || normalized === "imagem de referência" || normalized === "imagem base") {
      return "Imagem base";
    }

    if (normalized === "logo_image" || normalized === "logo central") {
      return "Logo central";
    }
  }

  if (normalized === "reference_image" || normalized === "imagem de referência" || normalized === "imagem base") {
    return "Carrier image";
  }

  if (normalized === "logo_image" || normalized === "logo central") {
    return "Center logo";
  }

  return field;
}

export function localizeRuntimeMessage(message: string, locale: RuntimeLocale) {
  const normalized = message.trim();

  if (!normalized) {
    return normalized;
  }

  const staticMessage = STATIC_MESSAGES.find((entry) => entry.en === normalized || entry.pt === normalized);
  if (staticMessage) {
    return locale === "pt-BR" ? staticMessage.pt : staticMessage.en;
  }

  for (const rule of DYNAMIC_MESSAGE_RULES) {
    const englishMatch = normalized.match(rule.en);
    if (englishMatch) {
      return locale === "pt-BR"
        ? rule.toPortuguese(...englishMatch.slice(1))
        : rule.toEnglish(...englishMatch.slice(1));
    }

    const portugueseMatch = normalized.match(rule.pt);
    if (portugueseMatch) {
      return locale === "pt-BR"
        ? rule.toPortuguese(...portugueseMatch.slice(1))
        : rule.toEnglish(...portugueseMatch.slice(1));
    }
  }

  return normalized;
}

export function localizeValidationResult(validation: ValidationResult, locale: RuntimeLocale): ValidationResult {
  return {
    ...validation,
    correctionsApplied: validation.correctionsApplied.map((message) => localizeRuntimeMessage(message, locale)),
    suggestions: validation.suggestions.map((message) => localizeRuntimeMessage(message, locale)),
  };
}
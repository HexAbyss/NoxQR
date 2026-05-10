export type QRFrameStyle =
  | "none"
  | "rounded"
  | "card"
  | "circle"
  | "phone"
  | "hanger"
  | "ticket"
  | "ribbon";

export type QRFinderBorderStyle =
  | "square"
  | "rounded"
  | "circle"
  | "leaf"
  | "bubble"
  | "focus"
  | "cut"
  | "soft_square";

export type QRFinderCenterStyle =
  | "square"
  | "rounded"
  | "circle"
  | "leaf"
  | "burst"
  | "star"
  | "diamond"
  | "cross";

export const FRAME_STYLE_ORDER: QRFrameStyle[] = [
  "none",
  "rounded",
  "card",
  "circle",
  "phone",
  "hanger",
  "ticket",
  "ribbon",
];

export const FINDER_BORDER_STYLE_ORDER: QRFinderBorderStyle[] = [
  "square",
  "rounded",
  "circle",
  "leaf",
  "bubble",
  "focus",
  "cut",
  "soft_square",
];

export const FINDER_CENTER_STYLE_ORDER: QRFinderCenterStyle[] = [
  "square",
  "rounded",
  "circle",
  "leaf",
  "burst",
  "star",
  "diamond",
  "cross",
];

export const DEFAULT_FRAME_STYLE: QRFrameStyle = "none";
export const DEFAULT_FINDER_BORDER_STYLE: QRFinderBorderStyle = "square";
export const DEFAULT_FINDER_CENTER_STYLE: QRFinderCenterStyle = "square";

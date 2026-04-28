import { expect, test } from "@playwright/test";

const FRONTEND_URL = process.env.NOX_E2E_FRONTEND_URL ?? "http://127.0.0.1:3080";
const BACKEND_URL = process.env.NOX_E2E_BACKEND_URL ?? "http://127.0.0.1:3081";
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const STYLES = ["square", "dots", "lines", "triangles", "hexagons", "blobs", "glyphs", "fractal"];

function parseRgb(value) {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);

  if (!match) {
    return null;
  }

  return match.slice(1, 4).map(Number);
}

async function setToggle(page, groupIndex, optionIndex) {
  const button = page
    .locator(".hero-header .header-controls__group")
    .nth(groupIndex)
    .locator(".segment__button")
    .nth(optionIndex);

  if ((await button.getAttribute("data-active")) !== "true") {
    await button.click();
  }
}

async function setLocale(page, locale) {
  await setToggle(page, 0, locale === "en" ? 1 : 0);
}

async function setTheme(page, theme) {
  await setToggle(page, 1, theme === "light" ? 1 : 0);
}

async function waitForPreview(page) {
  await expect(page.locator(".preview-canvas__svg svg")).toBeVisible({ timeout: 15000 });
}

async function openStudio(page, { locale = "en", theme = "dark" } = {}) {
  await page.goto(FRONTEND_URL, { waitUntil: "networkidle" });
  await setLocale(page, locale);
  await setTheme(page, theme);
  await waitForPreview(page);
}

test("backend health and phase 2 render contract stay stable", async ({ request }) => {
  const healthResponse = await request.get(`${BACKEND_URL}/health`);
  expect(healthResponse.ok()).toBeTruthy();
  await expect(healthResponse.json()).resolves.toEqual({ status: "ok" });

  for (const style of STYLES) {
    const generateResponse = await request.post(`${BACKEND_URL}/generate`, {
      data: {
        data: "https://github.com/HexAbyss/NoxQR",
        style,
        color: "#00FFAA",
        background: "#0D0D0D",
        transparent_background: true,
        size: 512,
      },
    });

    expect(generateResponse.ok()).toBeTruthy();

    const body = await generateResponse.json();
    expect(body.svg).toContain("<svg");
    expect(body.svg).toContain("Generated artistic QR code");
    expect(body.png_base64).toMatch(/^data:image\/png;base64,/);
  }
});

test("light theme export button keeps a light overlay and exposes a PNG download", async ({ page }) => {
  await openStudio(page, { locale: "en", theme: "light" });

  const exportButton = page.locator(".preview-canvas__action .action-button");
  await expect(exportButton).toBeVisible();
  await expect(exportButton).toContainText("Export PNG");

  const href = await exportButton.getAttribute("href");
  const downloadName = await exportButton.getAttribute("download");
  expect(href).toMatch(/^data:image\/png;base64,/);
  expect(downloadName).toMatch(/\.png$/i);

  const styles = await exportButton.evaluate((element) => {
    const computed = getComputedStyle(element);

    return {
      backgroundImage: computed.backgroundImage,
      backgroundColor: computed.backgroundColor,
      color: computed.color,
      borderColor: computed.borderColor,
    };
  });

  expect(styles.backgroundImage).toContain("linear-gradient");

  const textRgb = parseRgb(styles.color);
  expect(textRgb).not.toBeNull();
  expect(textRgb[0]).toBeLessThan(40);
  expect(textRgb[1]).toBeLessThan(50);
  expect(textRgb[2]).toBeLessThan(60);
});

test("dark theme export button preserves the dark overlay treatment", async ({ page }) => {
  await openStudio(page, { locale: "en", theme: "dark" });

  const exportButton = page.locator(".preview-canvas__action .action-button");
  await expect(exportButton).toBeVisible();

  const styles = await exportButton.evaluate((element) => {
    const computed = getComputedStyle(element);

    return {
      backgroundImage: computed.backgroundImage,
      backgroundColor: computed.backgroundColor,
      color: computed.color,
    };
  });

  expect(styles.backgroundImage).toBe("none");

  const backgroundRgb = parseRgb(styles.backgroundColor);
  const textRgb = parseRgb(styles.color);
  expect(backgroundRgb).not.toBeNull();
  expect(textRgb).not.toBeNull();
  expect(backgroundRgb[0]).toBeLessThan(32);
  expect(backgroundRgb[1]).toBeLessThan(36);
  expect(backgroundRgb[2]).toBeLessThan(44);
  expect(textRgb[0]).toBeGreaterThan(230);
  expect(textRgb[1]).toBeGreaterThan(235);
  expect(textRgb[2]).toBeGreaterThan(240);
});

test("mobile layout keeps the export action inside the preview canvas without horizontal overflow", async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await openStudio(page, { locale: "en", theme: "light" });

  const metrics = await page.evaluate(() => {
    const exportButton = document.querySelector(".preview-canvas__action .action-button");
    const previewCanvas = document.querySelector(".preview-canvas");

    if (!(exportButton instanceof HTMLElement) || !(previewCanvas instanceof HTMLElement)) {
      return null;
    }

    const buttonRect = exportButton.getBoundingClientRect();
    const canvasRect = previewCanvas.getBoundingClientRect();

    return {
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      buttonLeft: buttonRect.left,
      buttonRight: buttonRect.right,
      buttonTop: buttonRect.top,
      buttonBottom: buttonRect.bottom,
      canvasLeft: canvasRect.left,
      canvasRight: canvasRect.right,
      canvasTop: canvasRect.top,
      canvasBottom: canvasRect.bottom,
    };
  });

  expect(metrics).not.toBeNull();
  expect(metrics.overflowX).toBeLessThanOrEqual(1);
  expect(metrics.buttonLeft).toBeGreaterThanOrEqual(metrics.canvasLeft - 1);
  expect(metrics.buttonRight).toBeLessThanOrEqual(metrics.canvasRight + 1);
  expect(metrics.buttonTop).toBeGreaterThanOrEqual(metrics.canvasTop - 1);
  expect(metrics.buttonBottom).toBeLessThanOrEqual(metrics.canvasBottom + 1);
});
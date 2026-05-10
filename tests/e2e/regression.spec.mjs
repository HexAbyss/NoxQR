import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const FRONTEND_URL = process.env.NOX_E2E_FRONTEND_URL ?? "http://127.0.0.1:3080";
const BACKEND_URL = process.env.NOX_E2E_BACKEND_URL ?? "http://127.0.0.1:3081";
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const STYLES = ["square", "dots", "lines", "triangles", "hexagons", "blobs", "glyphs", "fractal"];
const VALID_UPLOAD_FIXTURE = fileURLToPath(
  new URL("../../docs/images/nox-desktop-collapsed-light.png", import.meta.url),
);

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
  await expect(page.locator(".preview-canvas__svg svg, .preview-canvas__image").first()).toBeVisible({ timeout: 15000 });
}

async function setColorInput(page, selector, value) {
  await page.locator(selector).evaluate((element, nextValue) => {
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");

    descriptor?.set?.call(element, nextValue);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

function panelToggle(page, label) {
  return page.locator(".panel-block__toggle").filter({ hasText: label });
}

function panelBlock(page, label) {
  return page.locator(".panel-block").filter({ has: panelToggle(page, label) }).first();
}

async function expandPanel(page, label) {
  const toggle = panelToggle(page, label).first();
  await expect(toggle).toBeVisible();

  if ((await toggle.getAttribute("aria-expanded")) !== "true") {
    await toggle.click();
  }

  return toggle;
}
async function openStudio(page, { locale = "en", theme = "dark" } = {}) {
  await page.goto(FRONTEND_URL, { waitUntil: "networkidle" });
  await setLocale(page, locale);
  await setTheme(page, theme);
  await waitForPreview(page);
}

test("backend health and phase 3 render contract stay stable", async ({ request }) => {
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
    expect(body.validation).toBeTruthy();
    expect(body.validation.score).toBeGreaterThan(0);
    expect(body.validation.score).toBeLessThanOrEqual(1);
    expect(["low", "medium", "high"]).toContain(body.validation.risk);
    expect(body.validation.metrics).toMatchObject({
      contrast_ratio: expect.any(Number),
      distortion: expect.any(Number),
      density: expect.any(Number),
      quiet_zone_integrity: expect.any(Number),
      simulation_pass_rate: expect.any(Number),
    });
    expect(body.validation.simulations).toHaveLength(4);
  }
});

test("preview exposes reliability telemetry from the backend", async ({ page }) => {
  await openStudio(page, { locale: "en", theme: "dark" });

  const reliabilityPanel = page.locator(".reliability-panel");
  await expect(reliabilityPanel).toBeVisible();
  await expect(reliabilityPanel).toContainText("QR Code quality.");
  await expect(reliabilityPanel.locator(".reliability-score__value")).toContainText(/\d+%/);
  await expect(reliabilityPanel.locator(".reliability-simulation")).toHaveCount(4);
});

test("transparent mode stays on by default and artistic inputs re-render without stale preview flicker", async ({ page }) => {
  await openStudio(page, { locale: "en", theme: "dark" });

  await page.locator(".studio-tab").filter({ hasText: /^Shape$/i }).click();

  const transparentToggle = page
    .locator(".studio-section-card")
    .filter({ hasText: /Transparent background/i })
    .locator(".toggle");
  await expect(transparentToggle).toHaveAttribute("data-active", "true");

  await page.locator(".studio-tab").filter({ hasText: /^Presets$/i }).click();
  await page.getByRole("button", { name: /Cyberpunk/i }).click();
  await expect(page.locator(".preview-canvas--loading")).toBeVisible({ timeout: 5000 });
  await waitForPreview(page);

  await page.locator(".studio-tab").filter({ hasText: /^Camouflage$/i }).click();
  const camouflageRange = page.locator("#qr-camouflage");
  await expect(camouflageRange).toBeVisible();
  await camouflageRange.focus();
  await camouflageRange.press("ArrowRight");
  await camouflageRange.press("ArrowRight");
  await waitForPreview(page);
  await expect(camouflageRange).toBeVisible();

  const referenceUpload = page.locator(".studio-tabpanel input[type='file']").first();
  await expect(referenceUpload).toBeAttached();
  await referenceUpload.setInputFiles(VALID_UPLOAD_FIXTURE);
  await page.getByRole("button", { name: /^Near invisible$/i }).click();
  await waitForPreview(page);
  await expect(page.locator(".upload-card").filter({ hasText: /Carrier image linked to the render\./i })).toBeVisible();
  await expect(page.locator(".visual-tile[data-active='true']")).toContainText(/^Near invisible$/i);

  await page.getByRole("button", { name: /^Frequency$/i }).click();
  await waitForPreview(page);
  await expect(page.locator(".visual-tile[data-active='true']")).toContainText(/^Frequency$/i);

  await page.locator(".studio-tab").filter({ hasText: /^Logo$/i }).click();
  const logoUpload = page.locator(".studio-tabpanel input[type='file']").first();
  await expect(logoUpload).toBeAttached();
  await logoUpload.setInputFiles(VALID_UPLOAD_FIXTURE);
  await waitForPreview(page);
  await expect(page.locator(".upload-card").filter({ hasText: /Logo ready for the protected center zone\./i })).toBeVisible();
  await expect(page.locator("#qr-logo-scale")).toBeEnabled();
});

test("studio boots into the new step flow with frame controls active", async ({ page }) => {
  await openStudio(page, { locale: "en", theme: "dark" });

  await expect(page.locator(".studio-step")).toHaveCount(2);
  await expect(page.locator(".content-type-tile[data-active='true']")).toContainText(/^Link$/i);
  await expect(page.locator(".studio-tab")).toHaveCount(6);
  await expect(page.locator(".studio-tab[data-active='true']")).toContainText(/^Frame$/i);
  await expect(page.locator("#qr-size")).toBeVisible();
  await expect(page.locator(".visual-tile-grid--frames .visual-tile")).toHaveCount(8);
});

test("runtime validation messages follow the selected locale", async ({ page }) => {
  await openStudio(page, { locale: "pt-BR", theme: "dark" });

  await expect(page.locator(".control-panel")).toContainText("Complete o conteudo");

  await page.locator(".studio-tab").filter({ hasText: /^Shape$/i }).click();

  await setColorInput(page, "#qr-color", "#111111");
  await setColorInput(page, "#qr-background", "#111111");
  await expect(page.locator(".error-banner")).toContainText(/O contraste entre primeiro plano e fundo está muito baixo/i, { timeout: 15000 });

  await setLocale(page, "en");
  await expect(page.locator(".error-banner")).toContainText(/Foreground and background contrast is too low/i, { timeout: 15000 });
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
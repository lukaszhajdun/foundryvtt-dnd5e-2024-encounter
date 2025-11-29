// scripts/ui-style.js

/**
 * Nakładanie stylu okna (kolory, skala fontu, tryb dostępności).
 * Dzięki temu UI nie jest zależne od motywu Foundry.
 */

import {
  MODULE_ID,
  DEFAULT_BG_COLOR,
  DEFAULT_TEXT_COLOR,
  DEFAULT_FONT_SCALE,
  COLOR_PRESETS
} from "./config.js";

/**
 * Zastosuj ustawienia stylu na podanym elemencie root aplikacji.
 *
 * @param {HTMLElement} rootElement - element root (this.element z ApplicationV2)
 */
export function applyUserStyles(rootElement) {
  // Lokalne zmienne z wartościami domyślnymi.
  let presetKey = "dark";
  let bg = DEFAULT_BG_COLOR;
  let fg = DEFAULT_TEXT_COLOR;
  let scale = DEFAULT_FONT_SCALE;
  let accessibilityMode = false;

  try {
    // 1) Preset kolorów: dark / light / highContrast / custom
    presetKey = game.settings.get(MODULE_ID, "colorPreset") || "dark";

    // 2) Skala fontu – pilnujemy zakresu 0.8–1.4.
    const rawScale = game.settings.get(MODULE_ID, "fontScale");
    const num = Number(rawScale);
    if (Number.isFinite(num)) {
      scale = Math.max(0.8, Math.min(1.4, num));
    }

    // 3) Tryb dostępności – boolean.
    accessibilityMode =
      game.settings.get(MODULE_ID, "accessibilityMode") === true;
  } catch (e) {
    // Jeżeli coś poszło nie tak z game.settings – wracamy do bezpiecznych domyślnych.
    presetKey = "dark";
    scale = DEFAULT_FONT_SCALE;
    accessibilityMode = false;
  }

  // Dobieramy preset z mapy COLOR_PRESETS albo wracamy do "dark".
  const preset = COLOR_PRESETS[presetKey] ?? COLOR_PRESETS.dark;

  // Jeżeli wybrano "custom" – próbujemy odczytać własne kolory z ustawień.
  if (presetKey === "custom") {
    try {
      bg =
        game.settings.get(MODULE_ID, "backgroundColor") ||
        DEFAULT_BG_COLOR;
      fg =
        game.settings.get(MODULE_ID, "textColor") ||
        DEFAULT_TEXT_COLOR;
    } catch (e) {
      bg = DEFAULT_BG_COLOR;
      fg = DEFAULT_TEXT_COLOR;
    }
  } else {
    // Inaczej – stosujemy kolory z gotowego presetu.
    bg = preset.bg;
    fg = preset.text;
  }

  // Kolory + skala fontu – zapisane w CSS custom properties.
  rootElement.style.setProperty("--ec-bg-color", bg);
  rootElement.style.setProperty("--ec-fg-color", fg);
  rootElement.style.setProperty("--ec-font-scale", scale);

  // Parametry dostępności – dwie gałęzie: włączone / wyłączone.
  if (accessibilityMode) {
    rootElement.style.setProperty("--ec-line-height", "1.6");
    rootElement.style.setProperty("--ec-space-sm", "0.75rem");
    rootElement.style.setProperty("--ec-space-md", "1rem");
    rootElement.style.setProperty("--ec-space-lg", "1.5rem");
    rootElement.style.setProperty("--ec-border-width-thin", "2px");
    rootElement.style.setProperty("--ec-border-width-strong", "3px");
    rootElement.style.setProperty("--ec-control-min-size", "2.2rem");
  } else {
    rootElement.style.setProperty("--ec-line-height", "1.4");
    rootElement.style.setProperty("--ec-space-sm", "0.5rem");
    rootElement.style.setProperty("--ec-space-md", "0.75rem");
    rootElement.style.setProperty("--ec-space-lg", "1rem");
    rootElement.style.setProperty("--ec-border-width-thin", "1px");
    rootElement.style.setProperty("--ec-border-width-strong", "1.5px");
    rootElement.style.setProperty("--ec-control-min-size", "1.8rem");
  }
}

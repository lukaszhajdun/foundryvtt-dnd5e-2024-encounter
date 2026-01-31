// scripts/config/presets.js

/**
 * Presety kolorów i inne keymaps konfiguracyjne.
 */

import {
  DEFAULT_BG_COLOR,
  DEFAULT_TEXT_COLOR
} from "./constants.js";

/**
 * Presety kolorów:
 *  - dark          – nasze domyślne ciemne,
 *  - light         – jasne UI, ciemny tekst,
 *  - highContrast  – maksymalny kontrast (czarny / biały),
 *  - custom        – kolory z pól backgroundColor / textColor.
 */
export const COLOR_PRESETS = {
  dark: {
    id: "dark",
    name: "Ciemny",
    bg: "#0b0f18",
    text: "#f5f7ff"
  },
  light: {
    id: "light",
    name: "Jasny",
    bg: "#f5f7ff",
    text: "#0b0f18"
  },
  highContrast: {
    id: "highContrast",
    name: "Wysoki kontrast",
    bg: "#000000",
    text: "#ffffff"
  },
  custom: {
    id: "custom",
    name: "Własne kolory",
    bg: DEFAULT_BG_COLOR,
    text: DEFAULT_TEXT_COLOR
  }
};

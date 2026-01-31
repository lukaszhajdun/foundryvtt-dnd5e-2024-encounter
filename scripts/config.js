// scripts/config.js

/**
 * Wspólne stałe i konfiguracja modułu.
 * Dzięki temu inne pliki importują je z jednego miejsca,
 * a nie każdy definiuje swoje własne wartości.
 */

/** Identyfikator modułu – używany w game.settings, logach itp. */
export const MODULE_ID = "dnd5e-2024-encounter";

/** Domyślna waga friendly NPC (sojuszniczych jednostek z MM). */
export const DEFAULT_ALLY_NPC_WEIGHT = 0.5;

/** Domyślne kolory i skala fontu (dla presetu „ciemny”). */
export const DEFAULT_BG_COLOR = "#0b0f18";
export const DEFAULT_TEXT_COLOR = "#f5f7ff";
export const DEFAULT_FONT_SCALE = 1.0;

/** Domyślne ustawienia popupu „Utwórz Encounter”. */
export const DEFAULT_ENCOUNTER_NAME = "Encounter";
export const DEFAULT_ENCOUNTER_FOLDER_NAME = "Encounters";
export const DEFAULT_ENCOUNTER_GOLD = 0;
export const DEFAULT_ENCOUNTER_SILVER = 0;
export const DEFAULT_ENCOUNTER_COPPER = 0;
/** Maksymalna ilość przedmiotu (quantity) w liscie itemów. */
export const MAX_ITEM_QUANTITY = 99;
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

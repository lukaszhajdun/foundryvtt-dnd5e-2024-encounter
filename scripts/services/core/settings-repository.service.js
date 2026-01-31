/**
 * SettingsRepository – serwis do centralizacji dostępu do ustawień modułu.
 *
 * Odpowiada za:
 *  - czytanie ustawień z game.settings,
 *  - zapisywanie ustawień do game.settings,
 *  - dostarczanie wartości domyślnych,
 *  - unifikację dostępu do ustawień w całym module.
 *
 * Serwis opakowuje game.settings.get/set i udostępnia bezpieczne funkcje
 * z obsługą błędów i wartościami domyślnymi.
 */

import { MODULE_ID } from "../config/constants.js";

/**
 * Tworzy getter dla ustawienia.
 * Automatycznie obsługuje błędy i wartości domyślne.
 *
 * @param {string} settingKey - Klucz ustawienia (np. "allyNpcWeight")
 * @param {*} defaultValue - Wartość domyślna jeśli ustawienie nie istnieje
 * @returns {Function} Funkcja getter
 */
function createSettingGetter(settingKey, defaultValue) {
  return function getter() {
    try {
      const value = game.settings.get(MODULE_ID, settingKey);
      return value !== undefined ? value : defaultValue;
    } catch (_e) {
      return defaultValue;
    }
  };
}

/**
 * Tworzy setter dla ustawienia.
 * Automatycznie obsługuje błędy.
 *
 * @param {string} settingKey - Klucz ustawienia
 * @returns {Function} Funkcja setter
 */
function createSettingSetter(settingKey) {
  return async function setter(value) {
    try {
      await game.settings.set(MODULE_ID, settingKey, value);
    } catch (e) {
      console.error(`${MODULE_ID} | Błąd zapisywania ${settingKey}:`, e);
    }
  };
}

// ──────────────────────────────────────────────────────────────
// HAND-CRAFTED GETTERS Z LOGIKA VALIDACJI
// ──────────────────────────────────────────────────────────────
// Dla ustawień wymagających specjalnej walidacji/normalizacji

/**
 * Pobiera wybrany próg trudności (target difficulty).
 * Domyślnie: "moderate"
 * Validacja: Sprawdza czy wartość należy do ["low", "moderate", "high"]
 *
 * @returns {string} - "low", "moderate", lub "high"
 */
export function getTargetDifficulty() {
  try {
    const stored = game.settings.get(MODULE_ID, "targetDifficulty");
    if (["low", "moderate", "high"].includes(stored)) {
      return stored;
    }
  } catch (_e) {
    // ignore
  }
  return "moderate";
}

/**
 * Pobiera tryb wyświetlania trudności.
 * Domyślnie: "dmg"
 * UWAGA: To ustawienie nie jest w SETTINGS_CONFIG!
 *
 * @returns {string} - "dmg" lub "budget"
 */
export function getDifficultyDisplayMode() {
  try {
    const mode = game.settings.get(MODULE_ID, "difficultyDisplayMode");
    if (mode === "budget" || mode === "dmg") {
      return mode;
    }
  } catch (_e) {
    // ignore
  }
  return "dmg";
}

/**
 * Pobiera flagę auto-load saved allies.
 * Auto-generated getter.
 *
 * @returns {boolean}
 */
export const getAutoLoadSavedAllies = createSettingGetter("autoLoadSavedAllies", true);

/**
 * Pobiera tryb auto-loot quantity.
 * Auto-generated getter z walidacją.
 * Domyślnie: "perEnemy"
 *
 * @returns {string} - "off", "perEnemy", lub "perActorType"
 */
export function getAutoLootQuantityMode() {
  try {
    const stored = game.settings.get(MODULE_ID, "autoLootQuantityMode");
    if (stored === "off" || stored === "perEnemy" || stored === "perActorType") {
      return stored;
    }
  } catch (_e) {
    // ignore
  }
  return "perEnemy";
}

/**
 * Pobiera wagę sojuszniczych NPC.
 * Domyślnie: 0.5
 * Validacja: Liczba w zakresie 0-2
 *
 * @param {number} defaultValue - wartość domyślna (fallback)
 * @returns {number} - waga w zakresie 0-2
 */
export function getAllyNpcWeight(defaultValue = 0.5) {
  try {
    const value = game.settings.get(MODULE_ID, "allyNpcWeight");
    const num = Number(value);
    if (!Number.isFinite(num)) return defaultValue;
    return Math.max(0, Math.min(2, num));
  } catch (_e) {
    return defaultValue;
  }
}

/**
 * Pobiera zapisanych sojuszników.
 * Auto-generated getter.
 *
 * @returns {Object} - { uuids: Array }
 */
export const getSavedAllies = createSettingGetter("savedAllies", { uuids: [] });

/**
 * Pobiera zapisaną drużynę.
 * Auto-generated getter.
 *
 * @returns {Object} - { uuids: Array }
 */
export const getSavedTeam = createSettingGetter("savedTeam", { uuids: [] });

/**
 * Zapisuje sojuszników.
 *
 * @param {Object} data - { uuids: Array }
 * @returns {Promise<void>}
 */
export async function setSavedAllies(data) {
  try {
    await game.settings.set(MODULE_ID, "savedAllies", data);
  } catch (e) {
    console.error(`${MODULE_ID} | Błąd zapisywania savedAllies:`, e);
  }
}

/**
 * Zapisuje drużynę.
 *
 * @param {Object} data - { uuids: Array }
 * @returns {Promise<void>}
 */
export async function setSavedTeam(data) {
  try {
    await game.settings.set(MODULE_ID, "savedTeam", data);
  } catch (e) {
    console.error(`${MODULE_ID} | Błąd zapisywania savedTeam:`, e);
  }
}

/**
 * Pobiera domyślną nazwę encountera.
 * Auto-generated getter.
 *
 * @returns {string}
 */
export const getEncounterDefaultName = createSettingGetter("encounterDefaultName", "Encounter");

/**
 * Pobiera flagę użycia folderu domyślnie.
 * Auto-generated getter.
 *
 * @returns {boolean}
 */
export const getEncounterUseFolderByDefault = createSettingGetter("encounterUseFolderByDefault", true);

/**
 * Pobiera domyślną nazwę folderu encountera.
 * Auto-generated getter.
 *
 * @returns {string}
 */
export const getEncounterDefaultFolderName = createSettingGetter("encounterDefaultFolderName", "Encounters");

/**
 * Pobiera domyślną ilość złota.
 * Auto-generated getter z walidacją liczby.
 *
 * @returns {number}
 */
export function getEncounterDefaultGold() {
  try {
    const value = game.settings.get(MODULE_ID, "encounterDefaultGold");
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  } catch (_e) {
    return 0;
  }
}

/**
 * Pobiera domyślną ilość srebra.
 * Auto-generated getter z walidacją liczby.
 *
 * @returns {number}
 */
export function getEncounterDefaultSilver() {
  try {
    const value = game.settings.get(MODULE_ID, "encounterDefaultSilver");
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  } catch (_e) {
    return 0;
  }
}

/**
 * Pobiera domyślną ilość miedzi.
 * Auto-generated getter z walidacją liczby.
 *
 * @returns {number}
 */
export function getEncounterDefaultCopper() {
  try {
    const value = game.settings.get(MODULE_ID, "encounterDefaultCopper");
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  } catch (_e) {
    return 0;
  }
}

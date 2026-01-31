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

import { MODULE_ID } from "../config.js";

/**
 * Pobiera wybrany próg trudności (target difficulty).
 * Domyślnie: "moderate"
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
 * Domyślnie: false
 *
 * @returns {boolean}
 */
export function getAutoLoadSavedAllies() {
  try {
    return game.settings.get(MODULE_ID, "autoLoadSavedAllies") === true;
  } catch (_e) {
    return false;
  }
}

/**
 * Pobiera tryb auto-loot quantity.
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
 * Domyślnie: DEFAULT_ALLY_NPC_WEIGHT z config
 *
 * @param {number} defaultValue - wartość domyślna
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
 * Domyślnie: { uuids: [] }
 *
 * @returns {Object} - { uuids: Array }
 */
export function getSavedAllies() {
  try {
    return game.settings.get(MODULE_ID, "savedAllies") || { uuids: [] };
  } catch (_e) {
    return { uuids: [] };
  }
}

/**
 * Pobiera zapisaną drużynę.
 * Domyślnie: { uuids: [] }
 *
 * @returns {Object} - { uuids: Array }
 */
export function getSavedTeam() {
  try {
    return game.settings.get(MODULE_ID, "savedTeam") || { uuids: [] };
  } catch (_e) {
    return { uuids: [] };
  }
}

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
 * Domyślnie: "Encounter"
 *
 * @returns {string}
 */
export function getEncounterDefaultName() {
  try {
    return game.settings.get(MODULE_ID, "encounterDefaultName") ?? "Encounter";
  } catch (_e) {
    return "Encounter";
  }
}

/**
 * Pobiera flagę użycia folderu domyślnie.
 * Domyślnie: false
 *
 * @returns {boolean}
 */
export function getEncounterUseFolderByDefault() {
  try {
    return game.settings.get(MODULE_ID, "encounterUseFolderByDefault") === true;
  } catch (_e) {
    return false;
  }
}

/**
 * Pobiera domyślną nazwę folderu encountera.
 * Domyślnie: "Encounters"
 *
 * @returns {string}
 */
export function getEncounterDefaultFolderName() {
  try {
    return game.settings.get(MODULE_ID, "encounterDefaultFolderName") ?? "Encounters";
  } catch (_e) {
    return "Encounters";
  }
}

/**
 * Pobiera domyślną ilość złota.
 * Domyślnie: 0
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
 * Domyślnie: 0
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
 * Domyślnie: 0
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

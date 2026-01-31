// scripts/initialization/register-settings.js

/**
 * Rejestracja ustawień modułu (Hooks.once "init").
 */

import { MODULE_ID } from "../config/constants.js";
import { registerModuleSettings } from "../settings.js";

/**
 * Rejestruje ustawienia modułu podczas inicjalizacji Foundry.
 */
export function initializeSettings() {
  Hooks.once("init", () => {
    console.log(`${MODULE_ID} | init`);
    registerModuleSettings();
  });
}

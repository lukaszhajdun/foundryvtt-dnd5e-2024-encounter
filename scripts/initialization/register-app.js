// scripts/initialization/register-app.js

/**
 * Tworzenie instancji EncounterCalculatorApp (Hooks.once "ready").
 */

import { EncounterCalculatorApp } from "../encounter-calculator-app.js";

let encounterCalculator = null;

/**
 * Tworzy instancję aplikacji kalkulatora po załadowaniu Foundry.
 */
export function initializeApp() {
  Hooks.once("ready", () => {
    encounterCalculator = new EncounterCalculatorApp();
  });
}

/**
 * Zwraca referencję do instancji aplikacji kalkulatora.
 * @returns {EncounterCalculatorApp|null}
 */
export function getEncounterCalculator() {
  return encounterCalculator;
}

/**
 * Ustawia referencję do instancji aplikacji kalkulatora.
 * @param {EncounterCalculatorApp} instance
 */
export function setEncounterCalculator(instance) {
  encounterCalculator = instance;
}

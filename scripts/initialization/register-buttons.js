// scripts/initialization/register-buttons.js

/**
 * Dodawanie przycisku kalkulatora do Scene Controls (Hooks.on "getSceneControlButtons").
 */

import { EncounterCalculatorApp } from "../encounter-calculator-app.js";
import { getEncounterCalculator, setEncounterCalculator } from "./register-app.js";

/**
 * Rejestruje przycisk kalkulatora w Scene Controls.
 */
export function initializeSceneControls() {
  Hooks.on("getSceneControlButtons", (controls) => {
    const tokenControl = controls.tokens;
    if (!tokenControl) return;

    tokenControl.tools ??= {};
    const order = Object.keys(tokenControl.tools).length;

    tokenControl.tools["dnd5e-2024-encounter-calculator"] = {
      name: "dnd5e-2024-encounter-calculator",
      title: "D&D 5e 2024 – Encounter Calculator",
      icon: "fa-solid fa-swords",
      order,
      button: true,
      visible: game.user.isGM,
      onChange: () => {
        let encounterCalculator = getEncounterCalculator();
        
        if (!encounterCalculator) {
          encounterCalculator = new EncounterCalculatorApp();
          setEncounterCalculator(encounterCalculator);
        }

        if (encounterCalculator.rendered) {
          encounterCalculator.close();
        } else {
          encounterCalculator.render({ force: true });
        }
      }
    };
  });
}

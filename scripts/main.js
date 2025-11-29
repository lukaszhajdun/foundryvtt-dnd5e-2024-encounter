// scripts/main.js

/**
 * Punkt wejścia modułu.
 * Tutaj:
 *  - rejestrujemy ustawienia (init),
 *  - tworzymy instancję EncounterCalculatorApp (ready),
 *  - dodajemy przycisk w Scene Controls.
 */

import { MODULE_ID } from "./config.js";
import { registerModuleSettings } from "./settings.js";
import { EncounterCalculatorApp } from "./encounter-calculator-app.js";

let encounterCalculator = null;

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | init`);
  registerModuleSettings();
});

Hooks.once("ready", () => {
  encounterCalculator = new EncounterCalculatorApp();
});

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
      if (!encounterCalculator) {
        encounterCalculator = new EncounterCalculatorApp();
      }

      if (encounterCalculator.rendered) {
        encounterCalculator.close();
      } else {
        encounterCalculator.render({ force: true });
      }
    }
  };
});

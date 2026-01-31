/**
 * Currency tab handlers for EncounterCreateDialog.
 */

import {
  formatGoldEquivalent,
  getCurrencyLabel,
  setCurrencyValue
} from "../../services/index.js";
import { RollFormulaDialog } from "../roll-formula-dialog.js";

export function computeCurrencyGoldValue({
  platinum = 0,
  gold = 0,
  electrum = 0,
  silver = 0,
  copper = 0
} = {}) {
  return formatGoldEquivalent(platinum, gold, electrum, silver, copper);
}

export function onCurrencyFieldChanged(dialog) {
  dialog._readFormValues();
  dialog.render();
}

export async function onClickRollCurrencyButton(dialog, event) {
  event.preventDefault();

  const button = event.currentTarget;
  if (!button) return;

  const currencyKey = button.dataset.currency;
  if (!currencyKey) return;

  const prettyLabel = getCurrencyLabel(currencyKey);

  const result = await new Promise((resolve) => {
    const dialogWindow = new RollFormulaDialog({
      currencyLabel: prettyLabel,
      defaultFormula: "",
      resolve
    });
    dialogWindow.render(true);
  });

  if (!result || !result.formula) return;

  let total;
  let rollObj;
  try {
    // Rzuć formułę RAZ i zapamiętaj Roll obiekt
    rollObj = new Roll(result.formula);
    await rollObj.evaluate();
    total = Math.max(0, Math.floor(rollObj.total ?? 0));
  } catch (error) {
    console.error("[EncounterCreateDialog] Błąd rzutu:", error);
    ui.notifications.error("Nieprawidłowa formuła rzutu.");
    return;
  }

  // Aktualizuj zarówno this._XXX jak i DOM
  setCurrencyValue(dialog, currencyKey, total);

  // Wyślij wiadomość o rzucie do chatu - używając tego samego Roll obiektu
  await rollObj.toMessage({
    speaker: ChatMessage.getSpeaker(),
    flavor: `Losowanie waluty (${prettyLabel}) dla encountera "${
      dialog._name ?? ""
    }".`
  });

  dialog.render();
}

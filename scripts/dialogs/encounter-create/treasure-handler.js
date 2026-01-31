/**
 * Treasure generators for EncounterCreateDialog.
 */

import {
  generateIndividualTreasure,
  generateTreasureHoard
} from "../../services/index.js";
import { TreasureChoiceDialog } from "../treasure-choice-dialog.js";

export function getEnemiesForTreasure(dialog) {
  const raw = dialog.calculator?.enemies ?? [];
  return raw
    .map((e) => {
      const crNum = e.cr != null ? Number(e.cr) : NaN;
      const quantity = Number(e.quantity ?? 1) || 1;
      const safeCr = Number.isFinite(crNum) && crNum >= 0 ? crNum : null;

      return {
        name: e.name ?? "??",
        cr: safeCr,
        quantity: Math.max(1, Math.min(99, quantity))
      };
    })
    .filter((e) => e.cr !== null);
}

export async function generateIndividualTreasureForDialog(dialog) {
  const enemies = getEnemiesForTreasure(dialog);
  if (!enemies.length) {
    ui.notifications.info(
      "Brak wrogów z CR – nie można wygenerować Individual Treasure."
    );
    return;
  }

  const mode = await promptTreasureMode("individual");
  if (!mode) return;

  const rollEvaluator = async (formula) => {
    const roll = new Roll(formula);
    await roll.evaluate();
    return Math.max(0, Math.floor(roll.total ?? 0));
  };

  const result = await generateIndividualTreasure({
    enemies,
    mode,
    rollEvaluator
  });

  dialog._platinum = result.platinum;
  dialog._gold = result.gold;
  dialog._silver = result.silver;
  dialog._copper = result.copper;
  dialog._electrum = result.electrum;

  dialog.render();
}

export async function generateTreasureHoardForDialog(dialog) {
  const enemies = getEnemiesForTreasure(dialog);
  if (!enemies.length) {
    ui.notifications.info(
      "Brak wrogów z CR – nie można wygenerować Treasure Hoard."
    );
    return;
  }

  const maxCr = Math.max(...enemies.map((e) => e.cr));

  const mode = await promptTreasureMode("hoard");
  if (!mode) return;

  const rollEvaluator = async (formula) => {
    const roll = new Roll(formula);
    await roll.evaluate();
    return Math.max(0, Math.floor(roll.total ?? 0));
  };

  const result = await generateTreasureHoard({
    maxCr,
    mode,
    rollEvaluator
  });

  dialog._platinum = result.platinum;
  dialog._gold = result.gold;
  dialog._silver = result.silver;
  dialog._copper = result.copper;
  dialog._electrum = result.electrum;
  dialog._magicItemsCount = result.magicItemsCount;

  dialog.render();
}

async function promptTreasureMode(kind) {
  return new Promise((resolve) => {
    const dialog = new TreasureChoiceDialog({
      kind,
      resolve
    });
    dialog.render(true);
  });
}

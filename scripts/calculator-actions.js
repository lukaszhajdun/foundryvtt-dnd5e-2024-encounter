/**
 * Action handlers for EncounterCalculatorApp.
 *
 * Obsługuje wszystkie akcje użytkownika z kalkulatora:
 *  - dodawanie/usuwanie sojuszników i wrogów,
 *  - zapisywanie/wczytywanie zestawów,
 *  - otwieranie dialoga encountera,
 *  - zmianę trudności i ilości.
 */

import {
  MODULE_ID
} from "./config/constants.js";
import { EncounterCreateDialog } from "./dialogs/encounter-create-dialog.js";
import {
  removeEntryFromList,
  getPcUuids,
  getAllyUuids,
  getSavedAllies,
  getSavedTeam,
  setSavedAllies,
  setSavedTeam,
  getActorXp,
  addSingleActorToSide,
  updateEnemyQuantity
} from "./services/index.js";

/**
 * Czyszczenie listy sojuszników.
 */
export function onActionClearAllies(app, _event, _target) {
  app.allies = [];
  app.render();
}

/**
 * Czyszczenie listy wrogów.
 */
export function onActionClearEnemies(app, _event, _target) {
  app.enemies = [];
  app.render();
}

/**
 * Usuwanie wpisu (sojusznika lub wroga) z listy.
 */
export function onActionRemoveEntry(app, _event, target) {
  const side = target.dataset.side;
  const uuid = target.dataset.uuid;
  if (!uuid || !side) return;

  const list = side === "enemies" ? app.enemies : app.allies;
  removeEntryFromList(list, uuid);

  app.render();
}

/**
 * Otwieranie dialoga tworzenia encountera.
 */
export function onActionOpenEncounterDialog(app, _event, _target) {
  if (!game.user.isGM && !game.user.isAssistant) {
    ui.notifications.warn(
      "Tę funkcję może używać tylko MG lub asystent."
    );
    return;
  }

  const dialog = new EncounterCreateDialog({
    calculator: app
  });
  dialog.render({ force: true });
}

/**
 * Zmiana docelowej trudności.
 */
export function onActionSetTargetDifficulty(app, _event, target) {
  const diff = target?.dataset?.diff;
  if (!["low", "moderate", "high"].includes(diff)) return;

  app.targetDifficultyKey = diff;

  game.settings
    .set(MODULE_ID, "targetDifficulty", diff)
    .catch(() => {});

  app.render();
}

/**
 * Zapisanie drużyny (tylko PC).
 */
export async function onActionSaveTeam(app, _event, _target) {
  const pcUuids = getPcUuids(app.allies);
  await setSavedTeam({ uuids: pcUuids });
  ui.notifications.info("Zapisano drużynę (PC) w ustawieniach świata.");
}

/**
 * Zapisanie sojuszników (PC + NPC).
 */
export async function onActionSaveAllies(app, _event, _target) {
  const allUuids = getAllyUuids(app.allies);
  await setSavedAllies({ uuids: allUuids });
  ui.notifications.info("Zapisano sojuszników (PC + NPC) w ustawieniach świata.");
}

/**
 * Wczytywanie zapisanego zestawu sojuszników.
 */
export async function onActionLoadSaved(app, _event, _target) {
  const savedAllies = getSavedAllies();
  const savedTeam = getSavedTeam();

  const uuids = Array.isArray(savedAllies.uuids) && savedAllies.uuids.length
    ? savedAllies.uuids
    : Array.isArray(savedTeam.uuids) ? savedTeam.uuids : [];

  if (!uuids || !uuids.length) {
    ui.notifications.info("Brak zapisanego zestawu do wczytania.");
    return;
  }

  app.allies = [];

  for (const uuid of uuids) {
    try {
      const actor = await fromUuid(uuid);
      if (actor) {
        addSingleActorToSide({
          allies: app.allies,
          enemies: app.enemies,
          actor,
          side: "allies",
          getActorXpFn: getActorXp
        });
      } else {
        console.warn(`${MODULE_ID} | Nie znaleziono aktora o uuid ${uuid} podczas wczytywania zapisu.`);
      }
    } catch (e) {
      console.error(e);
    }
  }

  app.render();
  ui.notifications.info("Wczytano zapis sojuszników.");
}

/**
 * Usuwanie zapisanych zestawów (drużyna i sojusznicy).
 */
export async function onActionClearSaved(app, _event, _target) {
  await setSavedAllies({ uuids: [] });
  await setSavedTeam({ uuids: [] });
  ui.notifications.info("Usunięto zapis drużyny i sojuszników z ustawień świata.");
}

/**
 * Zwiększenie ilości wroga o 1.
 */
export function onActionIncreaseQuantity(app, _event, target) {
  const uuid = target?.dataset?.uuid;
  if (!uuid) return;

  updateEnemyQuantity(app.enemies, uuid, "delta", 1);
  app.render();
}

/**
 * Zmniejszenie ilości wroga o 1.
 */
export function onActionDecreaseQuantity(app, _event, target) {
  const uuid = target?.dataset?.uuid;
  if (!uuid) return;

  updateEnemyQuantity(app.enemies, uuid, "delta", -1);
  app.render();
}

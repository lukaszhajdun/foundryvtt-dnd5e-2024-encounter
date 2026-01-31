/**
 * Encounter Import – import aktora encounter do kalkulatora.
 */

import { addSingleActorToSide } from "../core/encounter-state.service.js";
import { getActorXp } from "../core/encounter-state.service.js";

/**
 * Importuje aktora encounter do kalkulatora (po stronie enemies).
 *
 * @param {Object} params
 * @param {Array} params.allies
 * @param {Array} params.enemies
 * @param {Actor} params.encounterActor
 * @param {string} params.side
 * @param {Function} params.actorResolverByUuid
 * @param {Function} params.notifyInfo
 * @param {Function} params.notifyWarn
 * @param {Function} params.logWarn
 * @param {string} params.moduleId
 * @param {Function} params.getActorXpFn
 */
export async function importEncounterActor({
  allies,
  enemies,
  encounterActor,
  side,
  actorResolverByUuid,
  notifyInfo,
  notifyWarn,
  logWarn,
  moduleId,
  getActorXpFn = getActorXp
}) {
  // Encounter zawsze importujemy po stronie wrogów.
  if (side !== "enemies") {
    notifyInfo?.(
      "Aktor encounter jest importowany po stronie wrogów – przeciągnij go na kolumnę wrogów."
    );
    side = "enemies";
  }

  // 1) Próba odczytu danych zapisanych przez nasz moduł.
  const flags = encounterActor.flags?.[moduleId];
  let entries = null;

  if (Array.isArray(flags?.enemies) && flags.enemies.length) {
    entries = flags.enemies
      .map((e) => ({
        uuid: e.uuid ?? null,
        quantity: Number(e.quantity ?? 1) || 1
      }))
      .filter((e) => !!e.uuid);
  }

  // 2) Fallback: system.members
  if (
    (!entries || !entries.length) &&
    Array.isArray(encounterActor.system?.members)
  ) {
    const sysMembers = encounterActor.system.members;

    entries = sysMembers
      .map((m) => {
        const uuid = m.uuid ?? m.actorUuid ?? m.actor ?? null;
        const qty = Number(m.quantity?.value ?? m.quantity ?? 1) || 1;
        return { uuid, quantity: qty };
      })
      .filter((e) => !!e.uuid);
  }

  if (!entries || !entries.length) {
    notifyWarn?.(
      "Ten aktor encounter nie zawiera danych o wrogach w formacie obsługiwanym przez kalkulator."
    );
    return;
  }

  for (const e of entries) {
    const eUuid = e.uuid;
    const qty = Number(e.quantity ?? 1) || 1;
    if (!eUuid) continue;

    const enemyActor = await actorResolverByUuid?.(eUuid);
    if (!enemyActor) {
      logWarn?.(
        `Nie udało się odnaleźć aktora wroga o uuid ${eUuid} podczas importu encountera.`
      );
      continue;
    }

    const loops = Math.max(1, Math.min(qty, 999));
    for (let i = 0; i < loops; i++) {
      addSingleActorToSide({
        allies,
        enemies,
        actor: enemyActor,
        side,
        getActorXpFn
      });
    }
  }
}

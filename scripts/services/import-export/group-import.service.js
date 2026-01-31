/**
 * Group Import – obsługa importu członków z aktora typu "group".
 */

import { addSingleActorToSide } from "../core/encounter-state.service.js";
import { getActorXp } from "../core/encounter-state.service.js";

/**
 * Dodaje członków aktora typu "group" po wskazanej stronie.
 *
 * @param {Object} params
 * @param {Array} params.allies
 * @param {Array} params.enemies
 * @param {Actor} params.groupActor
 * @param {string} params.side
 * @param {Function} params.actorResolverById
 * @param {Function} params.notifyWarn
 * @param {Function} params.logWarn
 * @param {Function} params.getActorXpFn
 */
export async function importGroupMembers({
  allies,
  enemies,
  groupActor,
  side,
  actorResolverById,
  notifyWarn,
  logWarn,
  getActorXpFn = getActorXp
}) {
  const members = groupActor.system?.members;
  if (!members) {
    notifyWarn?.(
      `Grupa "${groupActor.name}" nie ma zdefiniowanych członków (system.members).`
    );
    return;
  }

  let memberIds = [];

  // Preferowany format: members.ids jako Set
  if (members.ids instanceof Set) {
    memberIds = Array.from(members.ids);
  }

  // Fallback: członkowie jako tablica obiektów
  if (!memberIds.length && Array.isArray(members)) {
    memberIds = members
      .map((m) => m?.actor ?? m?.id ?? m?._id ?? null)
      .filter(Boolean);
  }

  memberIds = [...new Set(memberIds.filter((id) => !!id))];

  if (!memberIds.length) {
    notifyWarn?.(
      `Grupa "${groupActor.name}" nie zawiera żadnych rozpoznawalnych członków.`
    );
    return;
  }

  for (const id of memberIds) {
    const memberActor = actorResolverById?.(id);
    if (!memberActor) {
      logWarn?.(
        `Nie znaleziono aktora o id "${id}" z grupy "${groupActor.name}".`
      );
      continue;
    }

    addSingleActorToSide({
      allies,
      enemies,
      actor: memberActor,
      side,
      getActorXpFn
    });
  }
}

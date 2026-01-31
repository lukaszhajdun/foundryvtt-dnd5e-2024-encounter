/**
 * EncounterState – serwis do manipulacji stanem allies/enemies.
 */

/**
 * Odczytuje XP z aktora (system.details.xp.value, jeśli istnieje).
 *
 * @param {Actor} actor
 * @returns {number}
 */
export function getActorXp(actor) {
  const xpValue = actor?.system?.details?.xp?.value;
  if (Number.isFinite(xpValue)) return Number(xpValue) || 0;
  return 0;
}

/**
 * Usuwa wpis o wskazanym uuid z listy.
 *
 * @param {Array} list
 * @param {string} uuid
 */
export function removeEntryFromList(list, uuid) {
  const index = list.findIndex((e) => e.uuid === uuid);
  if (index !== -1) list.splice(index, 1);
}

/**
 * Dodaje pojedynczego aktora po wskazanej stronie.
 *
 * @param {Object} params
 * @param {Array} params.allies
 * @param {Array} params.enemies
 * @param {Actor} params.actor
 * @param {string} params.side
 * @param {Function} params.getActorXpFn
 */
export function addSingleActorToSide({
  allies,
  enemies,
  actor,
  side,
  getActorXpFn = getActorXp
}) {
  const isPC = actor.type === "character";
  const xpValue = getActorXpFn(actor);

  const entry = {
    id: actor.id,
    uuid: actor.uuid,
    name: actor.name,
    type: actor.type,
    level: actor.system?.details?.level ?? null,
    cr: actor.system?.details?.cr ?? null,
    xp: xpValue,
    quantity: 1,
    totalXp: xpValue
  };

  if (isPC) {
    // PC – zawsze unikalni, usuwamy z obu stron przed dodaniem.
    removeEntryFromList(allies, entry.uuid);
    removeEntryFromList(enemies, entry.uuid);

    if (side === "enemies") {
      entry.quantity = 1;
      entry.totalXp = Number(entry.xp) || 0;
      enemies.push(entry);
    } else {
      allies.push(entry);
    }
    return;
  }

  // NPC / potwory / inne – logika różna dla sojuszników i wrogów.
  if (side === "enemies") {
    const existing = enemies.find((e) => e.uuid === entry.uuid);

    if (existing) {
      let currentQ = Number(existing.quantity ?? 1) || 1;
      currentQ = Math.min(currentQ + 1, 99);
      existing.quantity = currentQ;
      existing.totalXp = (Number(existing.xp) || 0) * currentQ;
    } else {
      entry.quantity = 1;
      entry.totalXp = Number(entry.xp) || 0;
      enemies.push(entry);
    }
  } else {
    // Sojusznicy – nie grupujemy ilości, każdy wpis osobno.
    allies.push(entry);
  }
}

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

/**
 * Aktualizuje ilość (quantity) wroga o danym uuid.
 *
 * @param {Array} enemies
 * @param {string} uuid
 * @param {string} mode - "delta" | "set"
 * @param {number} value
 */
export function updateEnemyQuantity(enemies, uuid, mode, value) {
  const enemy = enemies.find((e) => e.uuid === uuid);
  if (!enemy) return;

  const baseXp = Number(enemy.xp) || 0;
  let q = Number(enemy.quantity ?? 1) || 1;

  if (mode === "delta") {
    q += value;
  } else if (mode === "set") {
    q = value;
  }

  if (q <= 0) {
    const idx = enemies.findIndex((e) => e.uuid === uuid);
    if (idx !== -1) enemies.splice(idx, 1);
    return;
  }

  if (q < 1) q = 1;
  if (q > 99) q = 99;

  enemy.quantity = q;
  enemy.totalXp = baseXp * q;
}

/**
 * ally-serializer.service.js
 *
 * Serwis do serializacji i deserializacji listy sojuszników/drużyny.
 * Wyeliminuje duplikację logiki extractu UUID z tablic allies.
 */

/**
 * Wyodrębnia UUIDy postaci (character) z tablicy allies.
 * Używane do zapisu drużyny (tylko PC).
 * 
 * @param {Array<Object>} allies - Tablica wpisów allies
 * @returns {Array<string>} Unikalne UUIDy postaci
 */
export function getPcUuids(allies) {
  const pcUuids = (allies || [])
    .filter((a) => a?.type === "character" && a?.uuid)
    .map((a) => a.uuid);

  return Array.from(new Set(pcUuids));
}

/**
 * Wyodrębnia UUIDy wszystkich sojuszników z tablicy allies.
 * Używane do zapisu sojuszników (PC + NPC).
 * 
 * @param {Array<Object>} allies - Tablica wpisów allies
 * @returns {Array<string>} Unikalne UUIDy wszystkich sojuszników
 */
export function getAllyUuids(allies) {
  const allUuids = (allies || [])
    .map((a) => a?.uuid)
    .filter(Boolean);

  return Array.from(new Set(allUuids));
}

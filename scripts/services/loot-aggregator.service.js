/**
 * LootAggregator – serwis do agregacji przedmiotów z ekwipunku wrogów.
 *
 * Odpowiada za:
 *  - filtrowanie typów przedmiotów (loot types),
 *  - pomijanie naturalnej broni,
 *  - grupowanie przedmiotów po uuid,
 *  - konwersję cen do złota (GP),
 *  - sumowanie ilości z uwzględnieniem trybu auto-loot.
 *
 * Serwis jest bezstanowy – przyjmuje dane wejściowe (enemies, mode, actorResolver)
 * i zwraca zgrupowane przedmioty bez bezpośredniego dostępu do Foundry API.
 */

/**
 * Agreguje przedmioty z ekwipunku wszystkich wrogów.
 *
 * @param {Object} params - parametry agregacji
 * @param {Array} params.enemies - tablica wrogów z polami: uuid, quantity
 * @param {string} params.mode - tryb auto-loot: "off", "perEnemy", "perActorType"
 * @param {Function} params.actorResolver - funkcja async (uuid) => Actor (np. fromUuid)
 * @returns {Promise<Array>} - tablica zgrupowanych przedmiotów
 *
 * Zwraca tablicę ZGRUPOWANYCH wpisów:
 *  {
 *    _id: lokalne ID (randomID),
 *    uuid: item.uuid,
 *    name: item.name,
 *    type: item.type,
 *    img:  item.img,
 *    price: number (wartość w GP),
 *    quantity: number (1–99)
 *  }
 *
 * Przedmioty są grupowane po uuid – lista nie zawiera duplikatów wierszy,
 * a ilość jest sumą sztuk z wszystkich wrogów (z uwzględnieniem trybu auto-loot).
 */
export async function aggregateLootFromEnemies({
  enemies = [],
  mode = "perEnemy",
  actorResolver = null
}) {
  // Tryb "off" – nie generujemy żadnych przedmiotów.
  if (mode === "off") return [];

  if (!Array.isArray(enemies) || !enemies.length) {
    return [];
  }

  if (typeof actorResolver !== "function") {
    console.error("LootAggregator: actorResolver must be a function");
    return [];
  }

  // Zamiast zwykłej tablicy używamy Map – kluczem jest uuid itemu,
  // wartością – zgrupowany wpis z ilością (quantity).
  const grouped = new Map();

  // Zbiór typów itemów, które traktujemy jako „loot".
  const lootTypes = new Set([
    "weapon",
    "equipment",
    "armor",
    "consumable",
    "loot",
    "tool",
    "container",
    "gear"
  ]);

  for (const enemy of enemies) {
    const enemyUuid = enemy.uuid;
    if (!enemyUuid) continue;

    const enemyActor = await actorResolver(enemyUuid);
    if (!enemyActor || enemyActor.documentName !== "Actor") continue;

    const items = enemyActor.items ?? [];
    if (!items.size && !items.length) continue;

    // Określamy ile razy powielić ekwipunek tego wroga.
    // perEnemy     → ilość = quantity wroga,
    // perActorType → 1 komplet ekwipunku na wpis enemy.
    let repeats = 1;
    if (mode === "perEnemy") {
      let q = Number(enemy.quantity ?? 1) || 1;
      if (q < 1) q = 1;
      if (q > 99) q = 99;
      repeats = q;
    } else {
      repeats = 1;
    }

    for (const item of items) {
      // Bierzemy tylko typy, które traktujemy jako „loot"
      if (!lootTypes.has(item.type)) continue;

      // Pomijamy naturalną broń
      if (isNaturalWeapon(item)) {
        continue;
      }

      const priceGp = getItemGoldValue(item);
      const key = item.uuid;
      if (!key) continue;

      const count = repeats;

      const existing = grouped.get(key);
      if (existing) {
        const newQty = Math.min(
          99,
          (Number(existing.quantity ?? 1) || 1) + count
        );
        existing.quantity = newQty;
        continue;
      }

      grouped.set(key, {
        _id: foundry.utils.randomID(),
        uuid: item.uuid,
        name: item.name,
        type: item.type,
        img: item.img,
        price: priceGp,
        quantity: Math.min(99, count)
      });
    }
  }

  // Zwracamy zgrupowane wpisy jako zwykłą tablicę.
  return Array.from(grouped.values());
}

/**
 * Sprawdza czy przedmiot jest bronią naturalną.
 *
 * W systemie dnd5e 2024 naturalna broń ma strukturę:
 *  item.type === "weapon"
 *  item.system.type.value === "natural"
 *
 * Dodatkowo asekuracyjnie sprawdzamy tablicę properties,
 * gdyby system dorzucał tam etykiety typu "natural" / "nat".
 *
 * @param {Object} item - dokument itemu
 * @returns {boolean} - true jeśli to naturalna broń
 */
function isNaturalWeapon(item) {
  if (item.type !== "weapon") return false;

  const sys = item.system ?? {};
  const typeData = sys.type ?? {};
  const weaponType = (typeData.value ?? "").toString().toLowerCase();

  const propsArray = Array.isArray(sys.properties) ? sys.properties : [];

  // W niektórych wersjach właściwości mogą być stringami
  // albo obiektami z polem "value" – normalizujemy do stringa.
  const hasNaturalProperty = propsArray.some((p) => {
    const raw = typeof p === "string" ? p : p?.value;
    if (!raw) return false;
    const key = raw.toString().toLowerCase();
    return key === "natural" || key === "nat";
  });

  return weaponType === "natural" || hasNaturalProperty;
}

/**
 * Wylicza wartość itemu w złocie (GP) na podstawie item.system.price.
 *
 * @param {Object} item - dokument itemu
 * @returns {number} - wartość w GP
 */
export function getItemGoldValue(item) {
  const priceData = item?.system?.price;

  if (priceData == null) return 0;

  // Przypadek 1: stary format – price jest liczbą, traktujemy jako GP.
  if (typeof priceData === "number") {
    const value = Number(priceData) || 0;
    return value;
  }

  // Przypadek 2: nowy format – obiekt z value i denomination.
  if (typeof priceData === "object") {
    const value = Number(priceData.value ?? 0) || 0;
    const denom =
      (priceData.denomination ?? priceData.currency ?? "gp").toLowerCase();

    if (!value) return 0;

    switch (denom) {
      case "pp":
        return value * 10;
      case "gp":
        return value;
      case "ep":
        return value * 0.5;
      case "sp":
        return value * 0.1;
      case "cp":
        return value * 0.01;
      default:
        // Nieznana denominacja – traktujemy jako GP.
        return value;
    }
  }

  // Gdy format jest inny / nieznany – traktujemy jako 0.
  return 0;
}

/**
 * form-components.service.js
 *
 * Serwis zawierający reusable komponenty formularzy i helpery do renderowania UI.
 *
 * Funkcje:
 *  - formatCurrencyValue()      – Formatuje wartość waluty do 2 miejsc po przecinku
 *  - formatGoldEquivalent()     – Przelicza walutę na złoto (GP) i formatuje
 *  - normalizeNumberInput()     – Normalizuje input number do liczby całkowitej >= 0
 *  - validateCurrencyField()    – Waliduje pole waluty
 *  - validateQuantity()         – Waliduje quantity w zakresie 1-99
 *  - createCurrencyFieldId()    – Generuje unique ID dla pola waluty
 *  - sanitizeTextInput()        – Oczyszcza tekst z HTML dla bezpieczeństwa
 *  - computeTotalValue()        – Oblicza całkowitą wartość waluty + itemów
 *  - buildCurrencyOptions()     – Zwraca opcje walut dla selectów
 *  - buildFolderOptions()       – Zwraca listę dostępnych folderów
 *  - validateEnemiesQuantities() – Waliduje ilości wrogów
 *  - computeItemsGoldValue()    – Oblicza sumę wartości itemów
 *  - buildCurrencyContext()     – Tworzy context dla szablonu waluty
 */

/**
 * Formatuje wartość waluty do 2 miejsc po przecinku.
 * Przykład: 123.456 → "123.46"
 *
 * @param {number} value – Wartość do sformatowania
 * @returns {string} Sformatowana wartość (zawsze 2 miejsca po przecinku)
 */
export function formatCurrencyValue(value) {
  const v = Number(value ?? 0);
  const rounded = Math.round(v * 100) / 100;
  return rounded.toFixed(2);
}

/**
 * Przelicza pojedynczą walutę na równoważnik złota (GP).
 *
 * Kursy:
 *  - Platinum (PP) = 10 GP
 *  - Gold (GP) = 1 GP
 *  - Electrum (EP) = 0.5 GP
 *  - Silver (SP) = 0.1 GP
 *  - Copper (CP) = 0.01 GP
 *
 * @param {number} platinum
 * @param {number} gold
 * @param {number} silver
 * @param {number} copper
 * @param {number} electrum
 * @returns {number} Całkowita wartość w złocie (GP)
 */
export function formatGoldEquivalent(platinum = 0, gold = 0, electrum = 0, silver = 0, copper = 0) {
  const pp = Number(platinum ?? 0) || 0;
  const gp = Number(gold ?? 0) || 0;
  const sp = Number(silver ?? 0) || 0;
  const cp = Number(copper ?? 0) || 0;
  const ep = Number(electrum ?? 0) || 0;

  const goldFromPp = pp * 10;
  const goldFromGp = gp;
  const goldFromEp = ep * 0.5;
  const goldFromSp = sp * 0.1;
  const goldFromCp = cp * 0.01;

  const total =
    goldFromPp + goldFromGp + goldFromEp + goldFromSp + goldFromCp;
  return Math.round(total * 100) / 100;
}

/**
 * Normalizuje raw value do liczby całkowitej >= 0.
 * Jeśli wartość jest < 0, zwraca 0.
 *
 * @param {any} raw – Surowa wartość (string, number, undefined)
 * @param {number} defaultValue – Wartość domyślna (default: 0)
 * @returns {number} Znormalizowana liczba całkowita
 */
export function normalizeNumberInput(raw, defaultValue = 0) {
  const num = Number(raw ?? defaultValue) || defaultValue;
  const int = Math.floor(num);
  return Math.max(0, int);
}

/**
 * Waliduje pole waluty:
 *  - musi być liczbą >= 0,
 *  - zwraca znormalizowaną wartość lub domyślną.
 *
 * @param {any} value – Wartość do walidacji
 * @param {number} defaultValue – Wartość domyślna (default: 0)
 * @returns {number} Zwalidowana wartość
 */
export function validateCurrencyField(value, defaultValue = 0) {
  return normalizeNumberInput(value, defaultValue);
}

/**
 * Waliduje ilość (quantity) w zakresie 1-99.
 * Jeśli wartość < 1, zwraca 1.
 * Jeśli wartość > 99, zwraca 99.
 *
 * @param {any} raw – Surowa wartość
 * @param {number} defaultValue – Wartość domyślna (default: 1)
 * @returns {number} Zwalidowana ilość w zakresie [1, 99]
 */
export function validateQuantity(raw, defaultValue = 1) {
  const num = Number(raw ?? defaultValue) || defaultValue;
  const int = Math.floor(num);
  if (int < 1) return 1;
  if (int > 99) return 99;
  return int;
}

/**
 * Generuje unique ID dla pola waluty na podstawie typu.
 *
 * @param {string} currencyType – Typ waluty: "platinum", "gold", "silver", "copper", "electrum"
 * @returns {string} Unique ID
 */
export function createCurrencyFieldId(currencyType) {
  if (!currencyType) return "currency-field-unknown";
  return `ec-currency-${currencyType.toLowerCase()}`;
}

/**
 * Oczyszcza tekst z HTML tags dla bezpieczeństwa.
 * Usuwamy script tags, event handlers itp.
 *
 * @param {string} text – Tekst do oczyszczenia
 * @returns {string} Oczyszczony tekst
 */
export function sanitizeTextInput(text) {
  if (typeof text !== "string") return "";
  // Usuwamy potencjalnie niebezpieczne tagi i atrybuty
  return text
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/<[^>]*>/g, "");
}

/**
 * Oblicza całkowitą wartość encountera (waluta + przedmioty).
 *
 * @param {object} params
 *  - platinum: {number}
 *  - gold: {number}
 *  - electrum: {number}
 *  - silver: {number}
 *  - copper: {number}
 *  - itemsGoldValue: {number} – Suma wartości itemów w GP
 * @returns {object}
 *  - currencyGoldValue: {number}
 *  - itemsGoldValue: {number}
 *  - total: {number}
 *  - currencyFormatted: {string}
 *  - itemsFormatted: {string}
 *  - totalFormatted: {string}
 */
export function computeTotalValue({
  platinum = 0,
  gold = 0,
  electrum = 0,
  silver = 0,
  copper = 0,
  itemsGoldValue = 0
} = {}) {
  const currencyGoldValue = formatGoldEquivalent(
    platinum,
    gold,
    electrum,
    silver,
    copper
  );
  const itemsValue = Number(itemsGoldValue ?? 0) || 0;
  const total = currencyGoldValue + itemsValue;

  return {
    currencyGoldValue,
    itemsGoldValue: itemsValue,
    total,
    currencyFormatted: formatCurrencyValue(currencyGoldValue),
    itemsFormatted: formatCurrencyValue(itemsValue),
    totalFormatted: formatCurrencyValue(total)
  };
}

/**
 * Zwraca standardowe opcje dla selectu waluty.
 * Używane w dialogach do wyboru, która waluta ma być losowana.
 *
 * @returns {array} Lista opcji: [{ label: string, value: string }, ...]
 */
export function buildCurrencyOptions() {
  return [
    { label: "Platinum (PP)", value: "platinum" },
    { label: "Gold (GP)", value: "gold" },
    { label: "Electrum (EP)", value: "electrum" },
    { label: "Silver (SP)", value: "silver" },
    { label: "Copper (CP)", value: "copper" }
  ];
}

/**
 * Zwraca listę dostępnych folderów dla Actorów (dla selectu).
 * Przydatne w dialog do wyboru katalogu dla nowego encounter.
 *
 * @param {object} options
 *  - game: {object} – Foundry game object (default: window.game)
 *  - filter: {function} – Opcjonalna funkcja filtrowania (default: brak)
 * @returns {array} Lista: [{ label: string, value: string }, ...]
 */
export function buildFolderOptions({ game = window.game, filter } = {}) {
  if (!game || !game.folders) return [];

  const folders = game.folders.contents.filter(
    (f) => f.type === "Actor" && (!filter || filter(f))
  );

  return folders.map((f) => ({
    label: f.name,
    value: f.id
  }));
}

/**
 * Waliduje ilość wrogów w tabeli i zwraca błędy (jeśli jakieś).
 * Używane w encounter-create-dialog do sprawdzenia integralności danych.
 *
 * @param {array} enemies – Lista wrogów: [{ name, quantity, ... }, ...]
 * @returns {array} Lista błędów (puste, jeśli wszystko OK):
 *  [{ enemyName: string, error: string }, ...]
 */
export function validateEnemiesQuantities(enemies = []) {
  const errors = [];

  if (!Array.isArray(enemies)) return errors;

  enemies.forEach((enemy, index) => {
    const qty = Number(enemy.quantity ?? 1);
    if (!Number.isFinite(qty) || qty < 1 || qty > 99) {
      errors.push({
        index,
        enemyName: enemy.name || `Enemy ${index}`,
        error: `Ilość musi być w zakresie 1-99 (obecna: ${qty})`
      });
    }
  });

  return errors;
}

/**
 * Oblicza sumę wartości wszystkich itemów w złocie (GP).
 * Przydatne do wyświetlenia sumy w stopce.
 *
 * @param {array} items – Lista itemów: [{ uuid, quantity, gold_value, ... }, ...]
 * @returns {number} Suma wartości w GP
 */
export function computeItemsGoldValue(items = []) {
  if (!Array.isArray(items)) return 0;

  return items.reduce((sum, item) => {
    const qty = Number(item.quantity ?? 1) || 1;
    const value = Number(item.gold_value ?? 0) || 0;
    return sum + qty * value;
  }, 0);
}

/**
 * Tworzy obiekt context dla szablonu formularza waluty.
 * Przydatne w _prepareContext do standaryzacji.
 *
 * @param {object} params
 *  - platinum, gold, electrum, silver, copper: {number}
 *  - itemsGoldValue: {number}
 * @returns {object} Context dla szablonu
 */
export function buildCurrencyContext({
  platinum = 0,
  gold = 0,
  electrum = 0,
  silver = 0,
  copper = 0,
  itemsGoldValue = 0
} = {}) {
  const values = computeTotalValue({
    platinum,
    gold,
    electrum,
    silver,
    copper,
    itemsGoldValue
  });

  return {
    platinum,
    gold,
    electrum,
    silver,
    copper,
    currencyGoldValue: values.currencyGoldValue,
    itemsGoldValue: values.itemsGoldValue,
    totalEncounterValue: values.total,
    currencyFormatted: values.currencyFormatted,
    itemsFormatted: values.itemsFormatted,
    totalFormatted: values.totalFormatted,
    currencyOptions: buildCurrencyOptions()
  };
}

/**
 * currency-roller.service.js
 *
 * Serwis do rolowania walut i mapowania currency labels.
 * Eliminuje switch-case i label mappingi z encounter-create-dialog.
 */

/**
 * Mapa przetłumaczonych etykiet walut (PL).
 */
const CURRENCY_LABELS = {
  platinum: "platyny (PP)",
  gold: "złota (GP)",
  silver: "srebra (SP)",
  copper: "miedzi (CP)",
  electrum: "electrum (EP)"
};

/**
 * Zwraca przetłumaczoną etykietę waluty.
 * 
 * @param {string} currencyKey - Klucz waluty (platinum, gold, etc)
 * @returns {string} Etykieta waluty
 */
export function getCurrencyLabel(currencyKey) {
  return CURRENCY_LABELS[currencyKey] ?? currencyKey;
}

/**
 * Zwraca mapę wszystkich etykiet walut.
 * 
 * @returns {Object} Mapa klucz → etykieta
 */
export function getCurrencyLabels() {
  return { ...CURRENCY_LABELS };
}

/**
 * Parsuje i ewaluuje formułę rzutu. Zwraca liczbę całkowitą.
 * 
 * @param {string} formula - Formuła rzutu (np. "2d6+5")
 * @returns {Promise<number>} Wynik rzutu (>= 0)
 * @throws {Error} Jeśli formuła jest nieprawidłowa
 */
export async function rollCurrencyFormula(formula) {
  if (!formula || formula.trim() === "") {
    throw new Error("Formuła nie może być pusta");
  }

  try {
    const r = new Roll(formula);
    await r.evaluate();
    const total = Math.max(0, Math.floor(r.total ?? 0));
    return total;
  } catch (error) {
    console.error("[currency-roller] Błąd parsowania formuły:", error);
    throw new Error("Nieprawidłowa formuła rzutu.");
  }
}

/**
 * Mapa funkcji do aktualizacji pól waluty w kontekście (this).
 * Używane jako dispatch table w zamiast switch-case.
 */
export function getCurrencySetterMap(contextObject) {
  return {
    platinum: (value) => { contextObject._platinum = value; },
    gold: (value) => { contextObject._gold = value; },
    silver: (value) => { contextObject._silver = value; },
    copper: (value) => { contextObject._copper = value; },
    electrum: (value) => { contextObject._electrum = value; }
  };
}

/**
 * Aktualizuje pole waluty w kontekście i na DOM.
 * 
 * @param {Object} contextObject - Kontekst (this) z dialogu
 * @param {string} currencyKey - Klucz waluty
 * @param {number} value - Nowa wartość
 */
export function setCurrencyValue(contextObject, currencyKey, value) {
  const setterMap = getCurrencySetterMap(contextObject);
  const setter = setterMap[currencyKey];
  
  if (!setter) {
    console.warn(`[currency-roller] Nieznany currency key: ${currencyKey}`);
    return;
  }

  setter(value);

  // Aktualizuj DOM
  const root = contextObject.element;
  if (root) {
    const input = root.querySelector(`input[name="${currencyKey}"]`);
    if (input) {
      input.value = value;
    }
  }
}

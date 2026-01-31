/**
 * UI Helpers – drobne pomocnicze funkcje do warstwy UI.
 */

/**
 * Prosta konwersja plain-text → prosty HTML (escape + <br> + <p>).
 *
 * @param {string} plain
 * @returns {string}
 */
export function formatPlainTextToHtml(plain) {
  const trimmed = (plain ?? "").toString().trim();
  if (!trimmed) return "";

  const escaped = trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const withBreaks = escaped.replace(/\r?\n/g, "<br>");

  return `<p>${withBreaks}</p>`;
}

/**
 * Podpina event listener tylko raz (oznacza element przez dataset).
 *
 * @param {HTMLElement} element
 * @param {string} datasetKey - np. "boundRoll"
 * @param {string} eventName - np. "click"
 * @param {Function} handler
 * @returns {boolean} - true jeśli podpięto, false jeśli już było
 */
export function bindOnce(element, datasetKey, eventName, handler) {
  if (!element) return false;
  if (element.dataset?.[datasetKey] === "true") return false;

  element.addEventListener(eventName, handler);
  element.dataset[datasetKey] = "true";
  return true;
}

/**
 * Podpina wiele eventów tylko raz (oznacza element przez dataset).
 *
 * @param {HTMLElement} element
 * @param {string} datasetKey
 * @param {string[]} eventNames
 * @param {Function} handler
 * @returns {boolean}
 */
export function bindOnceMulti(element, datasetKey, eventNames, handler) {
  if (!element) return false;
  if (element.dataset?.[datasetKey] === "true") return false;

  (eventNames || []).forEach((eventName) => {
    element.addEventListener(eventName, handler);
  });

  element.dataset[datasetKey] = "true";
  return true;
}

/**
 * Podpina event listener do wielu elementów tylko raz.
 *
 * @param {NodeListOf<HTMLElement>} elements
 * @param {string} datasetKey
 * @param {string} eventName
 * @param {Function} handler
 */
export function bindOnceAll(elements, datasetKey, eventName, handler) {
  if (!elements) return;
  elements.forEach((el) => bindOnce(el, datasetKey, eventName, handler));
}

/**
 * Podpina wiele eventów do wielu elementów tylko raz.
 *
 * @param {NodeListOf<HTMLElement>} elements
 * @param {string} datasetKey
 * @param {string[]} eventNames
 * @param {Function} handler
 */
export function bindOnceAllMulti(elements, datasetKey, eventNames, handler) {
  if (!elements) return;
  elements.forEach((el) => bindOnceMulti(el, datasetKey, eventNames, handler));
}

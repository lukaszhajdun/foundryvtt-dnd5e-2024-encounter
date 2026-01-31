/**
 * dialog-helpers.service.js
 * ─────────────────────────────────────────────────────────────────
 * Wspólne helpery dla dialogów (styling, event binding, validation).
 * Zmniejsza duplikację kodu w RollFormulaDialog i TreasureChoiceDialog.
 */

import { applyUserStyles } from "./ui-style.service.js";
import { bindOnce } from "./ui-helpers.service.js";

/**
 * Aplikuje style użytkownika do elementu dialogu.
 * Wrapper wokół applyUserStyles() dla spójności.
 *
 * @param {HTMLElement} dialogElement - Element główny dialogu
 */
export function styleDialogRoot(dialogElement) {
  if (!dialogElement) return;
  applyUserStyles(dialogElement);
}

/**
 * Binduje event listener do buttona w dialogu, unikając duplikatów.
 * Używa bindOnce() z callbackem.
 *
 * @param {HTMLElement} element - Element (button) do bindowania
 * @param {string} bindKey - Klucz dla bindOnce (np. "boundRoll")
 * @param {string} eventType - Typ eventu (np. "click")
 * @param {Function} handler - Funkcja obsługi
 */
export function bindDialogButton(element, bindKey, eventType, handler) {
  if (!element) return;
  bindOnce(element, bindKey, eventType, handler);
}

/**
 * Binduje wiele buttonów naraz (tablica).
 * Przydatne dla dialogów z wieloma akcjami.
 *
 * @param {Array} buttonConfigs - Tablica {element, bindKey, handler}
 * @param {string} eventType - Typ eventu (domyślnie "click")
 */
export function bindMultipleDialogButtons(
  buttonConfigs,
  eventType = "click"
) {
  buttonConfigs?.forEach(({ element, bindKey, handler }) => {
    bindDialogButton(element, bindKey, eventType, handler);
  });
}

/**
 * Waliduje formułę rzutu kośćmi.
 *
 * @param {string} formula - Formuła do walidacji
 * @returns {boolean} True jeśli formuła jest poprawna
 */
export function validateRollFormula(formula) {
  if (!formula || !formula.trim()) {
    ui.notifications.warn("Podaj formułę rzutu kośćmi.");
    return false;
  }

  if (!Roll.validate(formula)) {
    ui.notifications.error("Nieprawidłowa formuła rzutu.");
    return false;
  }

  return true;
}

/**
 * Pobiera wartość z input field w dialogu.
 *
 * @param {HTMLElement} dialogElement - Element dialogu
 * @param {string} fieldSelector - CSS selector do input field
 * @returns {string} Wartość z pola (trimmed)
 */
export function getInputValue(dialogElement, fieldSelector) {
  const input = dialogElement?.querySelector(fieldSelector);
  return input?.value?.trim() ?? "";
}

/**
 * Uniwersalny resolver dla dialogów (pattern).
 * Wywołuje callback i zamyka dialog.
 *
 * @param {Function} resolveCallback - Funkcja resolve z Promise
 * @param {*} value - Wartość do zwrócenia
 * @param {ApplicationV2} dialogInstance - Instancja dialogu (dla close())
 */
export function resolveAndCloseDialog(resolveCallback, value, dialogInstance) {
  try {
    resolveCallback?.(value);
  } finally {
    dialogInstance?.close?.();
  }
}

/**
 * Tworzy handler dla buttons, który wywołuje resolveAndCloseDialog.
 * Przydatne dla dialogów z wieloma action buttons.
 *
 * @param {*} value - Wartość do zwrócenia (np. "roll", "average", null)
 * @param {ApplicationV2} dialogInstance - Instancja dialogu
 * @param {Function} resolveCallback - Callback resolve
 * @returns {Function} Handler function
 */
export function createDialogActionHandler(value, dialogInstance, resolveCallback) {
  return function handler(event) {
    event?.preventDefault?.();
    resolveAndCloseDialog(resolveCallback, value, dialogInstance);
  };
}

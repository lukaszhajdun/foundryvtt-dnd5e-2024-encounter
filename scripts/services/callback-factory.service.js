/**
 * callback-factory.service.js
 *
 * Fabryka do tworzenia standardowych konfiguracji callbacków dla DragDrop.
 * Wyeliminuje duplikację callback patterns.
 */

/**
 * Tworzy domyślną konfigurację callbacków DragDrop.
 * 
 * @param {Object} context - Kontekst (this) z aplikacji (EncounterCalculatorApp)
 * @returns {Object} Obiekt konfiguracji callbacków z permissions i callbacks
 */
export function getDefaultDragDropCallbacks(context) {
  return {
    permissions: {
      dragstart: context._canDragStart.bind(context),
      drop: context._canDragDrop.bind(context)
    },
    callbacks: {
      drop: context._onDrop.bind(context)
    }
  };
}

/**
 * Przygotowuje pełną konfigurację DragDrop z bazową konfig + callbackami.
 * 
 * @param {Object} baseConfig - Bazowa konfiguracja z options.dragDrop
 * @param {Object} callbacks - Callbacki (np. z getDefaultDragDropCallbacks)
 * @returns {Object} Pełna konfiguracja gotowa do new DragDrop(config)
 */
export function prepareDragDropConfig(baseConfig, callbacks) {
  return {
    ...baseConfig,
    ...callbacks
  };
}

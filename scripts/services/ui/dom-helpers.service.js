/**
 * dom-helpers.service.js
 *
 * Serwis pomocniczy do DOM queryselectors w encounter-create-dialog.
 * Wyeliminuje repetycję querySelector w _readFormValues().
 */

/**
 * Pobiera wszystkie inputy walut z formy.
 * 
 * @param {HTMLElement} root - Element root dialogu
 * @returns {Object} Obiekt z referencjami do inputów walut
 */
export function queryCurrencyInputs(root) {
  return {
    platinum: root.querySelector('input[name="platinum"]'),
    gold: root.querySelector('input[name="gold"]'),
    silver: root.querySelector('input[name="silver"]'),
    copper: root.querySelector('input[name="copper"]'),
    electrum: root.querySelector('input[name="electrum"]')
  };
}

/**
 * Pobiera wszystkie inputy tekstowe formy (nazwa, opis, itp).
 * 
 * @param {HTMLElement} root - Element root dialogu
 * @returns {Object} Obiekt z referencjami do inputów tekstowych
 */
export function queryFormTextInputs(root) {
  return {
    name: root.querySelector('input[name="encounterName"]'),
    summary: root.querySelector('textarea[name="encounterSummary"]'),
    description: root.querySelector('textarea[name="encounterDescription"]'),
    useFolder: root.querySelector('input[name="useFolder"]'),
    folderName: root.querySelector('input[name="folderName"]')
  };
}

/**
 * Pobiera wszystkie elementy relacionowane z itemami w inventory.
 * 
 * @param {HTMLElement} root - Element root dialogu
 * @returns {Object} Obiekt z referencjami do item-listy
 */
export function queryItemElements(root) {
  return {
    itemsContainer: root.querySelector('.encounter-items-container'),
    itemsList: root.querySelector('[data-list="encounter-items"]'),
    addItemBtn: root.querySelector('button[data-action="addItem"]'),
    removeItemBtns: root.querySelectorAll('button[data-action="removeItem"]')
  };
}

/**
 * Pobiera input dla konkretnego ID przedmiotu.
 * 
 * @param {HTMLElement} root - Element root dialogu
 * @param {string} itemId - ID przedmiotu
 * @param {string} fieldName - Nazwa pola (np. "quantity", "customPrice")
 * @returns {HTMLElement|null} Element input lub null
 */
export function queryItemField(root, itemId, fieldName) {
  return root.querySelector(`input[data-item-id="${itemId}"][name="${fieldName}"]`);
}

/**
 * item-quantity.service.js
 *
 * Serwis do obsługi ilości przedmiotów i ich filtrowaniem.
 * Wyodrębnia logikę quantity z encounter-create-dialog.
 */

import { MAX_ITEM_QUANTITY } from "../config.js";

/**
 * Usuwa przedmiot o danym ID z listy.
 * 
 * @param {Array<Object>} items - Tablica przedmiotów
 * @param {string} itemId - ID przedmiotu do usunięcia
 * @returns {Array<Object>} Nowa tablica bez przedmiotu
 */
export function removeItemById(items, itemId) {
  if (!Array.isArray(items)) return [];
  return items.filter((it) => it._id !== itemId);
}

/**
 * Aktualizuje ilość przedmiotu (delta lub set mode).
 * 
 * @param {Array<Object>} items - Tablica przedmiotów
 * @param {string} itemId - ID przedmiotu
 * @param {string} mode - "delta" lub "set"
 * @param {number} value - Wartość (delta) lub nowa ilość (set)
 * @returns {Object} Obiekt z { items, shouldRemove }
 */
export function updateItemQuantity(items, itemId, mode, value) {
  if (!Array.isArray(items)) items = [];
  
  const entry = items.find((it) => it._id === itemId);
  if (!entry) return { items, shouldRemove: false };

  let q = Number(entry.quantity ?? 1) || 1;

  if (mode === "delta") {
    q += value;
  } else if (mode === "set") {
    q = value;
  }

  // Jeśli ilość <= 0, usuń przedmiot
  if (q <= 0) {
    return { 
      items: removeItemById(items, itemId), 
      shouldRemove: true 
    };
  }

  // Normalizuj do zakresu [1, MAX_ITEM_QUANTITY]
  q = Math.max(1, Math.min(MAX_ITEM_QUANTITY, q));
  entry.quantity = q;

  return { items, shouldRemove: false };
}

/**
 * Waliduje wartość ilości przedmiotu z input.
 * 
 * @param {number} parsed - Parsowana wartość
 * @param {Array<Object>} items - Tablica przedmiotów (do sprawdzenia bieżącej)
 * @param {string} itemId - ID przedmiotu
 * @returns {Object} { valid: boolean, normalized: number, shouldRemove: boolean }
 */
export function validateItemQuantity(parsed, items, itemId) {
  // Jeśli nie jest liczbą, zwróć bieżącą wartość
  if (!Number.isFinite(parsed)) {
    const entry = items.find((it) => it._id === itemId);
    const currentQ = Number(entry?.quantity ?? 1) || 1;
    return { 
      valid: false, 
      normalized: currentQ, 
      shouldRemove: false 
    };
  }

  // Jeśli <= 0, należy usunąć
  if (parsed <= 0) {
    return { 
      valid: true, 
      normalized: parsed, 
      shouldRemove: true 
    };
  }

  // Normalizuj do zakresu
  const normalized = Math.max(1, Math.min(MAX_ITEM_QUANTITY, parsed));
  return { 
    valid: true, 
    normalized, 
    shouldRemove: false 
  };
}

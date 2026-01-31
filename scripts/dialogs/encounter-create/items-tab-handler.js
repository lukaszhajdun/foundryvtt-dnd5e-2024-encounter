/**
 * Items tab handlers for EncounterCreateDialog.
 */

import {
  removeItemById,
  updateItemQuantity,
  validateItemQuantity
} from "../../services/index.js";

const { TextEditor } = foundry.applications.ux;

export async function maybeInitializeAutoLootItems(dialog) {
  if (Array.isArray(dialog._items) && dialog._items.length > 0) return;
  if (!dialog.calculator) return;

  const enemiesCount = dialog.calculator.enemies?.length ?? 0;
  if (!enemiesCount) return;

  const autoLootItems =
    (await dialog.calculator.getAutoLootItemsFromEnemies()) ?? [];

  if (!autoLootItems.length) return;

  if (!Array.isArray(dialog._items) || !dialog._items.length) {
    dialog._items = autoLootItems;
  }
}

export function computeItemsGoldValue(items) {
  if (!Array.isArray(items) || !items.length) return 0;

  return items.reduce((sum, item) => {
    const price = Number(item.price ?? 0) || 0;
    const qty = Math.max(1, Math.min(99, Number(item.quantity ?? 1) || 1));
    return sum + price * qty;
  }, 0);
}

export function getItemGoldValueFromDocument(item) {
  const priceData = item?.system?.price;
  if (priceData == null) return 0;

  if (typeof priceData === "number") {
    const value = Number(priceData) || 0;
    return value;
  }

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
        return value;
    }
  }

  return 0;
}

export async function onDropItem(dialog, event) {
  event.preventDefault();

  const data = TextEditor.getDragEventData(event);
  if (!data) return;

  const type = data.type ?? data.documentName;
  if (type !== "Item") return;

  let uuid =
    data.uuid ??
    data.documentUuid ??
    data.data?.uuid ??
    (data.pack && data.id
      ? `Compendium.${data.pack}.${data.id}`
      : null);

  if (!uuid && data.actorId && (data.id || data._id)) {
    const itemId = data.id ?? data._id;
    uuid = `Actor.${data.actorId}.Item.${itemId}`;
  }

  if (!uuid) return;

  const item = await fromUuid(uuid);
  if (!item || item.documentName !== "Item") return;

  if (!Array.isArray(dialog._items)) dialog._items = [];

  const existing = dialog._items.find((it) => it.uuid === item.uuid);

  if (existing) {
    const current = Number(existing.quantity ?? 1) || 1;
    existing.quantity = Math.min(99, current + 1);
  } else {
    const localId = foundry.utils.randomID();
    const priceGp = getItemGoldValueFromDocument(item);

    const entry = {
      _id: localId,
      uuid: item.uuid,
      name: item.name,
      type: item.type,
      img: item.img,
      price: priceGp,
      quantity: 1
    };

    dialog._items.push(entry);
  }

  dialog.render();
}

export function updateItemQuantityForDialog(dialog, itemId, mode, value) {
  if (!Array.isArray(dialog._items)) dialog._items = [];
  const result = updateItemQuantity(dialog._items, itemId, mode, value);
  dialog._items = result.items;
}

export function onItemQuantityInputChange(dialog, event) {
  const input = event.currentTarget;
  const itemId = input.dataset.itemId;
  if (!itemId) return;

  const raw = input.value;
  const parsed = Number(raw);

  const validation = validateItemQuantity(parsed, dialog._items, itemId);
  input.value = String(validation.normalized);

  if (validation.shouldRemove) {
    dialog._items = removeItemById(dialog._items, itemId);
    dialog.render();
    return;
  }

  updateItemQuantityForDialog(dialog, itemId, "set", validation.normalized);
  dialog.render();
}

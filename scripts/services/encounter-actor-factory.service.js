/**
 * EncounterActorFactory – serwis do tworzenia aktora encounter.
 *
 * Odpowiada za:
 *  - budowanie danych aktora encounter (system + flags),
 *  - tworzenie folderu docelowego,
 *  - tworzenie embedded Items z poprawną ilością,
 *  - uruchamianie renderu karty po utworzeniu.
 */

import { MODULE_ID } from "../config.js";

/**
 * Tworzy aktora encounter typu "encounter".
 * Uwzględnia:
 *  - wrogów z kalkulatora,
 *  - summary / description z popupu,
 *  - waluty,
 *  - przedmioty z zakładki "Przedmioty" (z ilościami).
 *
 * @param {Object} params
 * @param {Array} params.enemies
 * @param {Object} params.config
 * @returns {Promise<Actor|null>}
 */
export async function createEncounterActor({ enemies = [], config = {} }) {
  if (!enemies.length) {
    ui.notifications.info(
      "Brak wrogów – nie ma czego zapisywać w encounterze."
    );
    return null;
  }

  if (!game.user.isGM && !game.user.isAssistant) {
    ui.notifications.warn("Tę funkcję może używać tylko MG lub asystent.");
    return null;
  }

  const useFolder = !!config.useFolder;
  const folderName = (config.folderName ?? "").trim();
  const rawName = (config.name ?? "").trim();

  const now = new Date();
  const fallbackName = `Encounter ${now.toLocaleString(
    game.i18n.lang ?? "pl-PL"
  )}`;
  const name = rawName || fallbackName;

  const gold = Math.max(0, Number(config.gold ?? 0) || 0);
  const silver = Math.max(0, Number(config.silver ?? 0) || 0);
  const copper = Math.max(0, Number(config.copper ?? 0) || 0);
  const platinum = Math.max(0, Number(config.platinum ?? 0) || 0);
  const electrum = Math.max(0, Number(config.electrum ?? 0) || 0);

  const summaryText = (config.summary ?? "").toString();
  const descriptionText = (config.description ?? "").toString();

  const itemsConfigRaw = Array.isArray(config.items) ? config.items : [];

  /**
   * Prosta konwersja plain-text → prosty HTML (escape + <br> + <p>).
   */
  const formatPlainTextToHtml = (plain) => {
    const trimmed = (plain ?? "").toString().trim();
    if (!trimmed) return "";

    const escaped = trimmed
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

    const withBreaks = escaped.replace(/\r?\n/g, "<br>");

    return `<p>${withBreaks}</p>`;
  };

  const summaryHtml = formatPlainTextToHtml(summaryText);
  const descriptionHtml = formatPlainTextToHtml(descriptionText);

  let folder = null;
  if (useFolder && folderName) {
    folder = await ensureActorFolder(folderName);
  }

  const totalXP = enemies.reduce(
    (sum, e) =>
      sum +
      (Number(
        e.totalXp ??
          (Number(e.xp) || 0) * (Number(e.quantity ?? 1) || 1)
      ) || 0),
    0
  );

  const membersForFlags = enemies.map((e) => ({
    uuid: e.uuid,
    name: e.name,
    type: e.type,
    xp: Number(e.xp) || 0,
    quantity: Number(e.quantity ?? 1) || 1,
    level: e.level ?? null,
    cr: e.cr ?? null
  }));

  const systemMembers = enemies.map((e) => ({
    uuid: e.uuid,
    quantity: {
      value: Math.max(1, Number(e.quantity ?? 1) || 1)
    }
  }));

  // Upewniamy się, że przedmioty są w formacie z quantity (1–99).
  const itemsConfig = (itemsConfigRaw ?? []).map((it) => {
    const qty = Math.max(1, Math.min(99, Number(it.quantity ?? 1) || 1));
    return {
      _id: it._id,
      uuid: it.uuid,
      name: it.name,
      type: it.type,
      img: it.img,
      price: Number(it.price ?? 0) || 0,
      quantity: qty
    };
  });

  // uproszczona lista przedmiotów do flags[MODULE_ID]
  const lootItemsForFlags = itemsConfig.map((it) => ({
    uuid: it.uuid,
    name: it.name,
    type: it.type,
    img: it.img,
    quantity: it.quantity
  }));

  const actorData = {
    name,
    type: "encounter",
    folder: folder?.id ?? null,
    system: {
      currency: {
        pp: platinum,
        gp: gold,
        ep: electrum,
        sp: silver,
        cp: copper
      },
      members: systemMembers,
      description: {
        summary: summaryHtml,
        full: descriptionHtml
      }
    },
    flags: {
      [MODULE_ID]: {
        source: "encounter-calculator",
        createdAt: now.toISOString(),
        totalXP,
        treasure: {
          gp: gold,
          sp: silver,
          cp: copper
        },
        enemies: membersForFlags,
        lootItems: lootItemsForFlags
      }
    }
  };

  const encounterActor = await Actor.create(actorData, {
    renderSheet: false
  });

  // Dodanie przedmiotów jako embedded Items do encountera
  // z poprawnie ustawioną ilością (system.quantity).
  if (itemsConfig.length) {
    const embeddedItemsData = [];

    for (const entry of itemsConfig) {
      if (!entry?.uuid) continue;

      const itemDoc = await fromUuid(entry.uuid);
      if (!itemDoc || itemDoc.documentName !== "Item") continue;

      const quantity = entry.quantity;

      const itemData = itemDoc.toObject();
      delete itemData._id;

      const sys = itemData.system ?? (itemData.system = {});

      // Dostosowujemy się do możliwych formatów quantity:
      // - liczba,
      // - obiekt z polem value,
      // - brak → tworzymy nowe pole.
      if (typeof sys.quantity === "number") {
        sys.quantity = quantity;
      } else if (typeof sys.quantity === "object" && sys.quantity !== null) {
        sys.quantity.value = quantity;
      } else {
        sys.quantity = quantity;
      }

      embeddedItemsData.push(itemData);
    }

    if (embeddedItemsData.length) {
      await encounterActor.createEmbeddedDocuments(
        "Item",
        embeddedItemsData
      );
    }
  }

  ui.notifications.info(`Utworzono encounter: ${encounterActor.name}`);
  encounterActor.sheet?.render(true);

  return encounterActor;
}

/**
 * Tworzy (lub zwraca istniejący) folder dla aktorów o danej nazwie.
 *
 * @param {string} folderName
 * @returns {Promise<Folder|null>}
 */
export async function ensureActorFolder(folderName) {
  const name = (folderName ?? "").trim();
  if (!name) return null;

  let folder = game.folders.find(
    (f) => f.type === "Actor" && f.name === name
  );
  if (folder) return folder;

  folder = await Folder.create({
    name,
    type: "Actor"
  });

  return folder;
}

/**
 * EncounterCalculatorApp – główne okno kalkulatora starć.
 *
 * Odpowiada za:
 *  - UI kalkulatora (drag & drop aktorów po dwóch stronach),
 *  - przeliczanie budżetu XP na podstawie tabeli 2024,
 *  - ocenę trudności starcia (wg ustawienia modułu: klasyczne DMG lub względem budżetu),
 *  - tworzenie aktora encounter (wrogowie, waluta, opis, summary, przedmioty),
 *  - import aktora encounter (modułowego i ręcznie stworzonego),
 *  - obsługę ilości (quantity) wrogów,
 *  - dostarczanie listy przedmiotów do auto-loot w popupie encountera.
 */

import { applyUserStyles } from "./ui-style.js";
import { EncounterCreateDialog } from "./encounter-create-dialog.js";
import {
  MODULE_ID,
  DEFAULT_ALLY_NPC_WEIGHT
} from "./config.js";
import {
  calculateDifficulty,
  normalizeEnemyQuantities,
  aggregateLootFromEnemies,
  getTargetDifficulty,
  getDifficultyDisplayMode,
  getAutoLoadSavedAllies,
  getAutoLootQuantityMode,
  getAllyNpcWeight,
  getSavedAllies,
  getSavedTeam,
  setSavedAllies,
  setSavedTeam,
  createEncounterActor,
  bindOnceAll
} from "./services/index.js";

const { ApplicationV2, HandlebarsApplicationMixin } =
  foundry.applications.api;
const { DragDrop, TextEditor } = foundry.applications.ux;

export class EncounterCalculatorApp extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  /**
   * Aktualny stan aplikacji – listy sojuszników i wrogów.
   * Tablice przechowują uproszczone wpisy:
   *  {
   *    id, uuid, name, type, level, cr, xp,
   *    quantity, totalXp
   *  }
   */
  dragDropHandlers = [];
  allies = [];
  enemies = [];

  /**
   * Aktualnie wybrany próg budżetu XP:
   *  - "low"
   *  - "moderate"
   *  - "high"
   */
  targetDifficultyKey = "moderate";

  /**
   * Tryb wyliczania ramki „Trudność względem budżetu”:
   *  - "dmg"    – klasyczne progi DMG (niska / umiarkowana / wysoka / ekstremalna),
   *  - "budget" – porównanie względem wybranego budżetu docelowego.
   */
  difficultyDisplayMode = "dmg";

  /**
   * Podstawowe opcje okna ApplicationV2.
   */
  static DEFAULT_OPTIONS = {
    id: "dnd5e-2024-encounter-calculator",
    title: "D&D 5e 2024 – Encounter Calculator",
    classes: ["dnd5e-2024-encounter-calculator", "dnd5e-encounter-calculator"],
    position: {
      width: 960,
      height: 740
    },
    window: {
      title: "D&D 5e 2024 – Encounter Calculator",
      icon: "fa-solid fa-swords",
      resizable: true
    },
    dragDrop: [
      {
        dragSelector: null,
        dropSelector: ".encounter-dropzone"
      }
    ],
    actions: {
      clearAllies: EncounterCalculatorApp._onActionClearAllies,
      clearEnemies: EncounterCalculatorApp._onActionClearEnemies,
      saveTeam: EncounterCalculatorApp._onActionSaveTeam,
      saveAllies: EncounterCalculatorApp._onActionSaveAllies,
      loadSaved: EncounterCalculatorApp._onActionLoadSaved,
      clearSaved: EncounterCalculatorApp._onActionClearSaved,
      removeEntry: EncounterCalculatorApp._onActionRemoveEntry,
      openEncounterDialog:
        EncounterCalculatorApp._onActionOpenEncounterDialog,
      setTargetDifficulty:
        EncounterCalculatorApp._onActionSetTargetDifficulty,
      increaseQuantity:
        EncounterCalculatorApp._onActionIncreaseQuantity,
      decreaseQuantity:
        EncounterCalculatorApp._onActionDecreaseQuantity
    }
  };

  /**
   * PARTS – główny szablon Handlebars kalkulatora.
   */
  static PARTS = {
    main: {
      template:
        "modules/dnd5e-2024-encounter/templates/encounter-calculator.hbs"
    }
  };

  /**
   * Konstruktor:
   *  - wczytuje zapisany próg trudności z ustawień,
   *  - wczytuje tryb wyświetlania trudności,
   *  - tworzy instancje DragDrop.
   */
  constructor(options = {}) {
    super(options);

    // Domyślny próg budżetu (Niska/Umiarkowana/Wysoka).
    this.targetDifficultyKey = getTargetDifficulty();

    // Tryb wyświetlania trudności (klasyczny DMG vs wzgl. budżetu).
    this.difficultyDisplayMode = getDifficultyDisplayMode();

    this.dragDropHandlers = this.#createDragDropHandlers();

    // Autowczytywanie zapisanego zestawu sojuszników (jeśli włączone w ustawieniach)
    (async () => {
      if (getAutoLoadSavedAllies()) {
        await this._loadSavedFromSettings();
        // renderujemy z nowymi sojusznikami
        this.render();
      }
    })();
  }

  /**
   * Tworzy instancje DragDrop na podstawie DEFAULT_OPTIONS.dragDrop.
   */
  #createDragDropHandlers() {
    return this.options.dragDrop.map((conf) => {
      const config = {
        ...conf,
        permissions: {
          dragstart: this._canDragStart.bind(this),
          drop: this._canDragDrop.bind(this)
        },
        callbacks: {
          drop: this._onDrop.bind(this)
        }
      };
      return new DragDrop(config);
    });
  }

  _canDragStart(_selector) {
    return true;
  }

  _canDragDrop(_selector) {
    return true;
  }

  /**
   * Wczytuje zapisane UUIDy sojuszników / drużyny z ustawień świata.
   * Preferuje `savedAllies`, fallback na `savedTeam`.
   */
  async _loadSavedFromSettings() {
    try {
      const savedAllies = getSavedAllies();
      const savedTeam = getSavedTeam();

      const uuids = Array.isArray(savedAllies.uuids) && savedAllies.uuids.length
        ? savedAllies.uuids
        : Array.isArray(savedTeam.uuids) ? savedTeam.uuids : [];

      if (!uuids || !uuids.length) return;

      // Czyścimy obecną lewą stronę i wczytujemy aktorów na nowo
      this.allies = [];

      for (const uuid of uuids) {
        try {
          const actor = await fromUuid(uuid);
          if (actor) this.#addSingleActorToSide(actor, "allies");
        } catch (e) {
          console.error(e);
        }
      }
    } catch (e) {
      console.error(`${MODULE_ID} | Błąd wczytywania zapisu:`, e);
    }
  }

  /**
   * Dane do encounter-calculator.hbs.
   */
  async _prepareContext(_options) {
  // Upewniamy się, że ilości wrogów są w zakresie 1–99 i totalXp jest przeliczone.
  normalizeEnemyQuantities(this.enemies);

  const difficulty = calculateDifficulty({
    allies: this.allies,
    enemies: this.enemies,
    targetDifficultyKey: this.targetDifficultyKey,
    difficultyDisplayMode: this.difficultyDisplayMode,
    allyNpcWeight: this.#getAllyNpcWeight()
  });
  const target = this.targetDifficultyKey;

  return {
    allies: this.allies,
    enemies: this.enemies,
    alliesCount: this.allies.length,
    // Liczba wrogów = suma quantity wszystkich wpisów
    enemiesCount: this.enemies.reduce((sum, enemy) => {
      const rawQty = Number(enemy.quantity ?? 1);
      const safeQty =
        Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
      return sum + safeQty;
    }, 0),
    difficultyLabel: difficulty.label,             // „Trudność względem budżetu”
    difficultyTargetLabel: difficulty.targetLabel, // „Budowane pod trudność”
    xpBudget: difficulty.budget,                   // Budżet XP (docelowy)
    xpTotal: difficulty.totalXP,                   // Suma XP wrogów
    targetDifficultyKey: target,
    isTargetLow: target === "low",
    isTargetModerate: target === "moderate",
    isTargetHigh: target === "high"
  };
}


  /**
   * Po renderze:
   *  - podpinamy DragDrop,
   *  - nakładamy style użytkownika,
   *  - podpinamy inputy quantity dla wrogów.
   */
  _onRender(_context, _options) {
    const root = this.element;
    if (!root) return;

    for (const dd of this.dragDropHandlers) {
      dd.bind(root);
    }

    applyUserStyles(root);

    const quantityInputs = root.querySelectorAll("input.quantity-input");
    bindOnceAll(
      quantityInputs,
      "boundQuantityChange",
      "change",
      (event) => this.#onQuantityInputChange(event)
    );
  }

  /**
   * Obsługa dropa aktora na kalkulator.
   * - group      → rozwinięcie członków,
   * - encounter  → import wrogów,
   * - character / npc / monster / inne → dodanie normalne.
   */
  async _onDrop(event) {
    event.preventDefault();

    const data = TextEditor.getDragEventData(event);
    if (!data) return;

    const type = data.type ?? data.documentName;
    if (type !== "Actor") return;

    // Rozpoznanie uuid aktora z różnych możliwych formatów drag danych.
    const uuid =
      data.uuid ??
      data.documentUuid ??
      data.data?.uuid ??
      (data.pack && data.id
        ? `Compendium.${data.pack}.${data.id}`
        : null);

    if (!uuid) return;

    const actor = await fromUuid(uuid);
    if (!actor) return;

    // Określenie strony dropu (allies/enemies).
    const dropTarget = event.target.closest("[data-side]");
    let side = dropTarget?.dataset.side ?? "allies";

    // Aktor typu "group" – rozwijamy członków.
    if (actor.type === "group") {
      await this.#addGroupMembers(actor, side);
      this.render();
      return;
    }

    // Aktor typu "encounter" – import wrogów.
    if (actor.type === "encounter") {
      await this.#importEncounterActor(actor, side);
      this.render();
      return;
    }

    // Zwykły aktor (PC/NPC/potwór).
    this.#addSingleActorToSide(actor, side);
    this.render();
  }

  /**
   * Dodaje pojedynczego aktora po wskazanej stronie.
   *
   * PC:
   *  - są traktowani jako unikalni – nie dublujemy ich po obu stronach,
   *  - można ich przerzucać między stroną sojuszników i wrogów.
   *
   * NPC/potwory:
   *  - po stronie wrogów obsługujemy ilość (quantity),
   *  - po stronie sojuszników traktujemy jako pojedyncze wpisy.
   */
  #addSingleActorToSide(actor, side) {
    const isPC = actor.type === "character";

    const entry = {
      id: actor.id,
      uuid: actor.uuid,
      name: actor.name,
      type: actor.type,
      level: actor.system?.details?.level ?? null,
      cr: actor.system?.details?.cr ?? null,
      xp: this.#getActorXP(actor),
      quantity: 1,
      totalXp: this.#getActorXP(actor)
    };

    if (isPC) {
      // PC – zawsze unikalni, usuwamy z obu stron przed dodaniem.
      this.#removeEntryFromList(this.allies, entry.uuid);
      this.#removeEntryFromList(this.enemies, entry.uuid);

      if (side === "enemies") {
        entry.quantity = 1;
        entry.totalXp = Number(entry.xp) || 0;
        this.enemies.push(entry);
      } else {
        this.allies.push(entry);
      }
      return;
    }

    // NPC / potwory / inne – logika różna dla sojuszników i wrogów.
    if (side === "enemies") {
      const existing = this.enemies.find((e) => e.uuid === entry.uuid);

      if (existing) {
        let currentQ = Number(existing.quantity ?? 1) || 1;
        currentQ = Math.min(currentQ + 1, 99);
        existing.quantity = currentQ;
        existing.totalXp = (Number(existing.xp) || 0) * currentQ;
      } else {
        entry.quantity = 1;
        entry.totalXp = Number(entry.xp) || 0;
        this.enemies.push(entry);
      }
    } else {
      // Sojusznicy – nie grupujemy ilości, każdy wpis osobno.
      this.allies.push(entry);
    }
  }

  /**
   * Dodaje członków aktora typu "group" po wskazanej stronie.
   * Obsługujemy dwa formaty:
   *  - system.members.ids (Set z id aktorów),
   *  - system.members jako tablicę obiektów z polami actor/id/_id.
   */
  async #addGroupMembers(groupActor, side) {
    const members = groupActor.system?.members;
    if (!members) {
      ui.notifications.warn(
        `Grupa "${groupActor.name}" nie ma zdefiniowanych członków (system.members).`
      );
      return;
    }

    let memberIds = [];

    // Preferowany format: members.ids jako Set
    if (members.ids instanceof Set) {
      memberIds = Array.from(members.ids);
    }

    // Fallback: członkowie jako tablica obiektów
    if (!memberIds.length && Array.isArray(members)) {
      memberIds = members
        .map((m) => m?.actor ?? m?.id ?? m?._id ?? null)
        .filter(Boolean);
    }

    memberIds = [...new Set(memberIds.filter((id) => !!id))];

    if (!memberIds.length) {
      ui.notifications.warn(
        `Grupa "${groupActor.name}" nie zawiera żadnych rozpoznawalnych członków.`
      );
      return;
    }

    for (const id of memberIds) {
      const memberActor = game.actors.get(id);
      if (!memberActor) {
        console.warn(
          `${MODULE_ID} | Nie znaleziono aktora o id "${id}" z grupy "${groupActor.name}".`
        );
        continue;
      }

      this.#addSingleActorToSide(memberActor, side);
    }
  }

  /**
   * Importuje aktora encounter do kalkulatora (po stronie enemies).
   *
   * Obsługiwane przypadki:
   *  1) Encounter utworzony przez nasz moduł – dane w flags[MODULE_ID].enemies.
   *  2) Encounter utworzony ręcznie w Foundry – dane w system.members (format dnd5e).
   */
  async #importEncounterActor(encounterActor, side) {
    // Encounter zawsze importujemy po stronie wrogów – nawet jeśli ktoś przeciągnie go na sojuszników.
    if (side !== "enemies") {
      ui.notifications.info(
        "Aktor encounter jest importowany po stronie wrogów – przeciągnij go na kolumnę wrogów."
      );
      side = "enemies";
    }

    // 1) Próba odczytu danych zapisanych przez nasz moduł.
    const flags = encounterActor.flags?.[MODULE_ID];
    let entries = null;

    if (Array.isArray(flags?.enemies) && flags.enemies.length) {
      // Encounter utworzony przez kalkulator – używamy naszego formatu.
      entries = flags.enemies
        .map((e) => ({
          uuid: e.uuid ?? null,
          quantity: Number(e.quantity ?? 1) || 1
        }))
        .filter((e) => !!e.uuid);
    }

    // 2) Jeśli nie ma entries w flags, próbujemy odczytać system.members (Encounter zrobiony ręcznie).
    if (
      (!entries || !entries.length) &&
      Array.isArray(encounterActor.system?.members)
    ) {
      const sysMembers = encounterActor.system.members;

      entries = sysMembers
        .map((m) => {
          // W dnd5e encounter members mają zazwyczaj:
          // { uuid: string, quantity: { value: number } }
          const uuid =
            m.uuid ??
            m.actorUuid ??
            m.actor ??
            null;

          const qty =
            Number(m.quantity?.value ?? m.quantity ?? 1) || 1;

          return { uuid, quantity: qty };
        })
        .filter((e) => !!e.uuid);
    }

    // 3) Jeśli nadal brak danych – kończymy z komunikatem.
    if (!entries || !entries.length) {
      ui.notifications.warn(
        "Ten aktor encounter nie zawiera danych o wrogach w formacie obsługiwanym przez kalkulator."
      );
      return;
    }

    // 4) Dla każdego wpisu:
    //    - pobieramy aktora po uuid,
    //    - dodajemy go tyle razy, ile wynosi quantity.
    for (const e of entries) {
      const eUuid = e.uuid;
      const qty = Number(e.quantity ?? 1) || 1;
      if (!eUuid) continue;

      const enemyActor = await fromUuid(eUuid);
      if (!enemyActor) {
        console.warn(
          `${MODULE_ID} | Nie udało się odnaleźć aktora wroga o uuid ${eUuid} podczas importu encountera.`
        );
        continue;
      }

      const loops = Math.max(1, Math.min(qty, 999));
      for (let i = 0; i < loops; i++) {
        // Dodajemy jako wroga – strona zawsze "enemies".
        this.#addSingleActorToSide(enemyActor, "enemies");
      }
    }
  }

  /**
   * Odczytuje XP z aktora (system.details.xp.value, jeśli istnieje).
   */
  #getActorXP(actor) {
    const xpValue = actor.system?.details?.xp?.value;
    if (Number.isFinite(xpValue)) return Number(xpValue) || 0;
    return 0;
  }

  #removeEntryFromList(list, uuid) {
    const index = list.findIndex((e) => e.uuid === uuid);
    if (index !== -1) list.splice(index, 1);
  }

  #getAllyNpcWeight() {
    return getAllyNpcWeight(DEFAULT_ALLY_NPC_WEIGHT);
  }

  /**
   * Auto-loot: zbiera przedmioty z ekwipunku wszystkich wrogów
   * z kalkulatora, aby wypełnić zakładkę "Przedmioty" w popupie.
   *
   * Tryb działania zależy od ustawienia:
   *  - autoLootQuantityMode = "off"
   *      → zwraca [] (brak auto-loot),
   *  - "perEnemy"
   *      → ekwipunek mnożony przez quantity wroga,
   *  - "perActorType"
   *      → jeden komplet ekwipunku na wpis wrogów (ignoruje quantity).
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
  async getAutoLootItemsFromEnemies() {
    // Odczytujemy tryb auto-loot z ustawień modułu.
    const mode = getAutoLootQuantityMode();

    return aggregateLootFromEnemies({
      enemies: this.enemies,
      mode,
      actorResolver: fromUuid
    });
  }

  /**
   * Tworzy aktora encounter typu "encounter".
   * Uwzględnia:
   *  - wrogów z kalkulatora,
   *  - summary / description z popupu,
   *  - waluty,
   *  - przedmioty z zakładki "Przedmioty" (z ilościami).
   */
  async createEncounterFromEnemies(config) {
    return createEncounterActor({
      enemies: this.enemies ?? [],
      config
    });
  }

  // ─────────────────────────────────────────────
  // ACTIONS – przyciski z encounter-calculator.hbs
  // ─────────────────────────────────────────────

  static _onActionClearAllies(_event, _target) {
    this.allies = [];
    this.render();
  }

  static _onActionClearEnemies(_event, _target) {
    this.enemies = [];
    this.render();
  }

  static _onActionRemoveEntry(_event, target) {
    const side = target.dataset.side;
    const uuid = target.dataset.uuid;
    if (!uuid || !side) return;

    const list = side === "enemies" ? this.enemies : this.allies;
    const index = list.findIndex((e) => e.uuid === uuid);
    if (index !== -1) list.splice(index, 1);

    this.render();
  }

  static _onActionOpenEncounterDialog(_event, _target) {
    if (!game.user.isGM && !game.user.isAssistant) {
      ui.notifications.warn(
        "Tę funkcję może używać tylko MG lub asystent."
      );
      return;
    }

    const dialog = new EncounterCreateDialog({
      calculator: this
    });
    dialog.render({ force: true });
  }

  static _onActionSetTargetDifficulty(_event, target) {
    const diff = target?.dataset?.diff;
    if (!["low", "moderate", "high"].includes(diff)) return;

    this.targetDifficultyKey = diff;

    game.settings
      .set(MODULE_ID, "targetDifficulty", diff)
      .catch(() => {});

    this.render();
  }

  // ─────────────────────────────────────────────
  // Save / Load / Clear saved allies/team
  // ─────────────────────────────────────────────
  static async _onActionSaveTeam(_event, _target) {
    // Zapisujemy tylko PC (character) obecnych w lewej kolumnie
    const pcUuids = (this.allies || [])
      .filter((a) => a?.type === "character" && a?.uuid)
      .map((a) => a.uuid);

    const unique = Array.from(new Set(pcUuids));

    await setSavedTeam({ uuids: unique });
    ui.notifications.info("Zapisano drużynę (PC) w ustawieniach świata.");
  }

  static async _onActionSaveAllies(_event, _target) {
    // Zapisujemy wszystkich aktorów po lewej stronie (PC + NPC)
    const allUuids = (this.allies || [])
      .map((a) => a?.uuid)
      .filter(Boolean);

    const unique = Array.from(new Set(allUuids));

    await setSavedAllies({ uuids: unique });
    ui.notifications.info("Zapisano sojuszników (PC + NPC) w ustawieniach świata.");
  }

  static async _onActionLoadSaved(_event, _target) {
    // Wczytujemy zapis – preferujemy savedAllies, fallback na savedTeam
    const savedAllies = getSavedAllies();
    const savedTeam = getSavedTeam();

    const uuids = Array.isArray(savedAllies.uuids) && savedAllies.uuids.length
      ? savedAllies.uuids
      : Array.isArray(savedTeam.uuids) ? savedTeam.uuids : [];

    if (!uuids || !uuids.length) {
      ui.notifications.info("Brak zapisanego zestawu do wczytania.");
      return;
    }

    // Zachowanie: wczytanie działa jak preset – najpierw czyścimy obecną lewą stronę
    this.allies = [];

    for (const uuid of uuids) {
      try {
        const actor = await fromUuid(uuid);
        if (actor) {
          this.#addSingleActorToSide(actor, "allies");
        } else {
          console.warn(`${MODULE_ID} | Nie znaleziono aktora o uuid ${uuid} podczas wczytywania zapisu.`);
        }
      } catch (e) {
        console.error(e);
      }
    }

    this.render();
    ui.notifications.info("Wczytano zapis sojuszników.");
  }

  static async _onActionClearSaved(_event, _target) {
    // Usuwamy zapisane presety (czyszcząc tablice uuid)
    await setSavedAllies({ uuids: [] });
    await setSavedTeam({ uuids: [] });
    ui.notifications.info("Usunięto zapis drużyny i sojuszników z ustawień świata.");
  }

  /**
   * Aktualizuje ilość (quantity) wroga o danym uuid.
   * mode:
   *  - "delta" – zmiana o wartość (np. +1 / -1),
   *  - "set"   – ustaw na wartość.
   */
  _updateEnemyQuantity(uuid, mode, value) {
    const enemy = this.enemies.find((e) => e.uuid === uuid);
    if (!enemy) return;

    const baseXp = Number(enemy.xp) || 0;
    let q = Number(enemy.quantity ?? 1) || 1;

    if (mode === "delta") {
      q += value;
    } else if (mode === "set") {
      q = value;
    }

    if (q <= 0) {
      const idx = this.enemies.findIndex((e) => e.uuid === uuid);
      if (idx !== -1) this.enemies.splice(idx, 1);
      return;
    }

    if (q < 1) q = 1;
    if (q > 99) q = 99;

    enemy.quantity = q;
    enemy.totalXp = baseXp * q;
  }

  static _onActionIncreaseQuantity(_event, target) {
    const uuid = target?.dataset?.uuid;
    if (!uuid) return;

    this._updateEnemyQuantity(uuid, "delta", 1);
    this.render();
  }

  static _onActionDecreaseQuantity(_event, target) {
    const uuid = target?.dataset?.uuid;
    if (!uuid) return;

    this._updateEnemyQuantity(uuid, "delta", -1);
    this.render();
  }

  /**
   * Zmiana ilości wroga wpisana ręcznie w input.
   */
  #onQuantityInputChange(event) {
    const input = event.currentTarget;
    const uuid = input.dataset.uuid;
    if (!uuid) return;

    const raw = input.value;
    let parsed = Number(raw);

    if (!Number.isFinite(parsed)) {
      const enemy = this.enemies.find((e) => e.uuid === uuid);
      const currentQ = Number(enemy?.quantity ?? 1) || 1;
      input.value = String(currentQ);
      return;
    }

    if (parsed <= 0) {
      const idx = this.enemies.findIndex((e) => e.uuid === uuid);
      if (idx !== -1) this.enemies.splice(idx, 1);
      this.render();
      return;
    }

    if (parsed > 99) parsed = 99;

    this._updateEnemyQuantity(uuid, "set", parsed);
    this.render();
  }
}

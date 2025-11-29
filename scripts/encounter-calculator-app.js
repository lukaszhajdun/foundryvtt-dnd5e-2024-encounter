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
  getBudgetRowForLevel,
  getPseudoLevelForNpcXp
} from "./xp-budget-2024.js";

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
    try {
      const stored = game.settings.get(MODULE_ID, "targetDifficulty");
      if (["low", "moderate", "high"].includes(stored)) {
        this.targetDifficultyKey = stored;
      }
    } catch (_e) {
      this.targetDifficultyKey = "moderate";
    }

    // Tryb wyświetlania trudności (klasyczny DMG vs wzgl. budżetu).
    try {
      const mode = game.settings.get(
        MODULE_ID,
        "difficultyDisplayMode"
      );
      if (mode === "budget" || mode === "dmg") {
        this.difficultyDisplayMode = mode;
      } else {
        this.difficultyDisplayMode = "dmg";
      }
    } catch (_e) {
      this.difficultyDisplayMode = "dmg";
    }

    this.dragDropHandlers = this.#createDragDropHandlers();
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
   * Dane do encounter-calculator.hbs.
   */
  async _prepareContext(_options) {
  // Upewniamy się, że ilości wrogów są w zakresie 1–99 i totalXp jest przeliczone.
  this.#normalizeEnemyQuantities();

  const difficulty = this.#calculateDifficulty();
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
    quantityInputs.forEach((input) => {
      if (input.dataset.boundQuantityChange === "true") return;
      input.addEventListener("change", (event) =>
        this.#onQuantityInputChange(event)
      );
      input.dataset.boundQuantityChange = "true";
    });
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
    try {
      const value = game.settings.get(MODULE_ID, "allyNpcWeight");
      const num = Number(value);
      if (!Number.isFinite(num)) return DEFAULT_ALLY_NPC_WEIGHT;
      const clamped = Math.max(0, Math.min(2, num));
      return clamped;
    } catch (_e) {
      return DEFAULT_ALLY_NPC_WEIGHT;
    }
  }

  /**
   * Upewnia się, że ilości wrogów (quantity) są między 1 i 99
   * oraz że totalXp jest przeliczone zgodnie z xp * quantity.
   */
  #normalizeEnemyQuantities() {
    for (const enemy of this.enemies) {
      const baseXp = Number(enemy.xp) || 0;
      let q = Number(enemy.quantity ?? 1) || 1;

      if (q < 1) q = 1;
      if (q > 99) q = 99;

      enemy.quantity = q;
      enemy.totalXp = baseXp * q;
    }
  }

  /**
   * Liczenie budżetu i trudności encountera.
   *
   * - Budżet XP (docelowy) zależy od wybranego progu (Niska / Umiarkowana / Wysoka).
   * - „Trudność względem budżetu” jest wyliczana na dwa sposoby:
   *    • klasyczny DMG – wg progów low/moderate/high (ustawienie: Klasyczny DMG),
   *    • względem wybranego budżetu docelowego (ustawienie: Względem budżetu).
   */
  #calculateDifficulty() {
    const partyMembers = [];
    const allyNpcWeight = this.#getAllyNpcWeight();

    // Składamy „logicznych członków drużyny”:
    // - PC o konkretnym poziomie,
    // - sojuszniczych NPC jako pseudo-poziomy (z wagą allyNpcWeight).
    for (const ally of this.allies) {
      if (ally.type === "character") {
        const level = Number(ally.level) || 1;
        partyMembers.push({
          level,
          weight: 1.0,
          source: "pc"
        });
      }

      if (ally.type === "npc") {
        const npcXp = Number(ally.xp) || 0;
        if (npcXp <= 0) continue;
        const pseudoLevel = getPseudoLevelForNpcXp(
          npcXp,
          "moderate"
        );
        partyMembers.push({
          level: pseudoLevel,
          weight: allyNpcWeight,
          source: "ally-npc"
        });
      }
    }

    // Liczymy całkowite XP wrogów.
    const totalXP = this.enemies.reduce(
      (sum, e) =>
        sum +
        (Number(
          e.totalXp ??
            (Number(e.xp) || 0) * (Number(e.quantity ?? 1) || 1)
        ) || 0),
      0
    );

    if (!partyMembers.length) {
      return {
        label: "Brak drużyny",
        targetLabel: "-",
        budget: 0,
        totalXP
      };
    }

    // Budżety dla całej drużyny na trzy progi.
    const budgets = this.#xpBudgetsForParty(partyMembers);

    // Wybrany próg z UI (Niska / Umiarkowana / Wysoka).
    let targetDifficulty = this.targetDifficultyKey;
    if (!["low", "moderate", "high"].includes(targetDifficulty)) {
      targetDifficulty = "moderate";
    }

    const budget = budgets[targetDifficulty] ?? 0;

    // Tryb wyświetlania trudności (z ustawień modułu).
    let mode = this.difficultyDisplayMode;
    try {
      const stored = game.settings.get(
        MODULE_ID,
        "difficultyDisplayMode"
      );
      if (stored === "budget" || stored === "dmg") {
        mode = stored;
        this.difficultyDisplayMode = stored;
      }
    } catch (_e) {
      // jeśli nie ma ustawienia, zostawiamy bieżące
    }

    if (mode !== "budget" && mode !== "dmg") {
      mode = "dmg";
      this.difficultyDisplayMode = "dmg";
    }

    let label;
    if (mode === "budget") {
      // Trudność względem WYBRANEGO budżetu (a nie stałych progów).
      label = this.#labelRelativeToBudget(totalXP, budget);
    } else {
      // Klasyczna trudność DMG – wg progów low/moderate/high.
      label = this.#labelClassicDmg(totalXP, budgets);
    }

    return {
      label,
      targetLabel: this.#difficultyName(targetDifficulty),
      budget,
      totalXP
    };
  }

  /**
   * Zwraca czytelną nazwę progu trudności (do „Budowane pod trudność”).
   */
  #difficultyName(diffKey) {
    switch (diffKey) {
      case "low":
        return "Niską";
      case "moderate":
        return "Umiarkowaną";
      case "high":
        return "Wysoką";
      default:
        return diffKey;
    }
  }

  /**
   * Sumuje budżety XP dla całej drużyny (poziomy + wagi).
   */
  #xpBudgetsForParty(partyMembers) {
    const totals = {
      low: 0,
      moderate: 0,
      high: 0
    };

    for (const member of partyMembers) {
      const row = getBudgetRowForLevel(member.level);
      const weight = Number(member.weight) || 1.0;

      totals.low += row.low * weight;
      totals.moderate += row.moderate * weight;
      totals.high += row.high * weight;
    }

    return {
      low: Math.round(totals.low),
      moderate: Math.round(totals.moderate),
      high: Math.round(totals.high)
    };
  }

  /**
   * Klasyczna trudność wg DMG:
   *  - totalXP <= low      → „Niskie”
   *  - <= moderate         → „Umiarkowane”
   *  - <= high             → „Wysokie”
   *  - > high              → „Ekstremalne”
   */
  #labelClassicDmg(totalXP, budgets) {
    if (!totalXP) return "Brak wrogów";
    if (!budgets) return "Brak budżetu";

    const low = Number(budgets.low ?? 0) || 0;
    const moderate = Number(budgets.moderate ?? 0) || 0;
    const high = Number(budgets.high ?? 0) || 0;

    if (low <= 0 && moderate <= 0 && high <= 0) {
      return "Brak budżetu";
    }

    if (totalXP <= low) return "Niskie";
    if (totalXP <= moderate) return "Umiarkowane";
    if (totalXP <= high) return "Wysokie";
    return "Ekstremalne";
  }

  /**
   * Trudność względem wybranego budżetu docelowego.
   *
   * - totalXP – suma XP wrogów,
   * - budget  – budżet XP dla wybranego progu (Niska / Umiarkowana / Wysoka).
   *
   * Zwraca etykiety w stylu:
   *  - „Brak wrogów”
   *  - „Brak budżetu”
   *  - „Poniżej budżetu”
   *  - „W zakresie budżetu”
   *  - „Powyżej budżetu”
   *  - „Znacznie powyżej budżetu”
   */
  #labelRelativeToBudget(totalXP, budget) {
    if (!totalXP) return "Brak wrogów";
    if (!budget) return "Brak budżetu";

    const ratio = totalXP / budget;

    // Progi można później doprecyzować; obecnie:
    // < 0.75    → poniżej
    // 0.75–1.25 → w zakresie
    // 1.25–1.75 → powyżej
    // > 1.75    → znacznie powyżej
    if (ratio < 0.75) return "Poniżej budżetu";
    if (ratio <= 1.25) return "W zakresie budżetu";
    if (ratio <= 1.75) return "Powyżej budżetu";
    return "Znacznie powyżej budżetu";
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
    let mode = "perEnemy";
    try {
      const stored = game.settings.get(
        MODULE_ID,
        "autoLootQuantityMode"
      );
      if (
        stored === "off" ||
        stored === "perEnemy" ||
        stored === "perActorType"
      ) {
        mode = stored;
      }
    } catch (_e) {
      // jeśli brak ustawienia – zostawiamy domyślne "perEnemy"
    }

    // Tryb "off" – nie generujemy żadnych przedmiotów.
    if (mode === "off") return [];

    if (!Array.isArray(this.enemies) || !this.enemies.length) {
      return [];
    }

    // Zamiast zwykłej tablicy używamy Map – kluczem jest uuid itemu,
    // wartością – zgrupowany wpis z ilością (quantity).
    const grouped = new Map();

    // Zbiór typów itemów, które traktujemy jako „loot”.
    const lootTypes = new Set([
      "weapon",
      "equipment",
      "armor",
      "consumable",
      "loot",
      "tool",
      "container",
      "gear"
    ]);

    for (const enemy of this.enemies) {
      const enemyUuid = enemy.uuid;
      if (!enemyUuid) continue;

      const enemyActor = await fromUuid(enemyUuid);
      if (!enemyActor || enemyActor.documentName !== "Actor") continue;

      const items = enemyActor.items ?? [];
      if (!items.size && !items.length) continue;

      // Określamy ile razy powielić ekwipunek tego wroga.
      // perEnemy     → ilość = quantity wroga,
      // perActorType → 1 komplet ekwipunku na wpis enemy.
      let repeats = 1;
      if (mode === "perEnemy") {
        let q = Number(enemy.quantity ?? 1) || 1;
        if (q < 1) q = 1;
        if (q > 99) q = 99;
        repeats = q;
      } else {
        repeats = 1;
      }

      for (const item of items) {
        // Bierzemy tylko typy, które traktujemy jako „loot”
        if (!lootTypes.has(item.type)) continue;

        // ─────────────────────────────────────
        // POMIŃ BROŃ NATURALNĄ
        // ─────────────────────────────────────
        //
        // W D&D5e 5.x naturalna broń to zazwyczaj:
        //  - item.type === "weapon"
        //  - system.weaponType === "natural"
        //    LUB we właściwościach jest flaga "nat" / "natural".
        //
        // Nie chcemy takich broni w auto-loocie – to są wbudowane ataki
        // potwora (pazury, kły itd.), a nie faktyczny łup.
        const sys = item.system ?? {};
        const weaponType = (sys.weaponType ?? "").toString().toLowerCase();
        const props = sys.properties ?? {};

        const hasNaturalProperty = !!(
          props.nat ||           // standardowy skrót w dnd5e
          props.natural          // asekuracyjnie, gdyby system użył pełnej nazwy
        );

        const isNaturalWeapon =
          item.type === "weapon" &&
          (weaponType === "natural" || hasNaturalProperty);

        if (isNaturalWeapon) {
          // Pomijamy naturalną broń – nie dodajemy jej do łupu.
          continue;
        }

        // ─────────────────────────────────────
        // DALSZA LOGIKA GRUPOWANIA ITEMÓW
        // ─────────────────────────────────────

        const priceGp = this.#getItemGoldValueFromDocument(item);
        const key = item.uuid;
        if (!key) continue;

        // Liczba sztuk tego itemu, którą wnosi ten jeden wpis wroga.
        const count = repeats;

        // Jeśli już mamy ten item w grupie – zwiększamy ilość.
        const existing = grouped.get(key);
        if (existing) {
          const newQty = Math.min(
            99,
            (Number(existing.quantity ?? 1) || 1) + count
          );
          existing.quantity = newQty;
          continue;
        }

        // Jeśli to pierwszy raz, gdy widzimy ten item – tworzymy wpis.
        grouped.set(key, {
          _id: foundry.utils.randomID(),
          uuid: item.uuid,
          name: item.name,
          type: item.type,
          img: item.img,
          price: priceGp,
          quantity: Math.min(99, count)
        });
      }

    }

    // Zwracamy zgrupowane wpisy jako zwykłą tablicę.
    return Array.from(grouped.values());
  }

  /**
   * Pomocnicza funkcja – wylicza wartość itemu w złocie (GP)
   * na podstawie item.system.price.
   *
   * Logika jest spójna z EncounterCreateDialog._getItemGoldValueFromDocument,
   * aby wartości w obu miejscach były liczone w ten sam sposób.
   */
  #getItemGoldValueFromDocument(item) {
    const priceData = item?.system?.price;

    if (priceData == null) return 0;

    // Przypadek 1: stary format – price jest liczbą, traktujemy jako GP.
    if (typeof priceData === "number") {
      const value = Number(priceData) || 0;
      return value;
    }

    // Przypadek 2: nowy format – obiekt z value i denomination.
    if (typeof priceData === "object") {
      const value = Number(priceData.value ?? 0) || 0;
      const denom =
        (priceData.denomination ??
          priceData.currency ??
          "gp").toLowerCase();

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
          // Nieznana denominacja – traktujemy jako GP.
          return value;
      }
    }

    // Gdy format jest inny / nieznany – traktujemy jako 0.
    return 0;
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
    const enemies = this.enemies ?? [];
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

    const itemsConfigRaw = Array.isArray(config.items)
      ? config.items
      : [];

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
      folder = await this.#ensureActorFolder(folderName);
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
      const qty = Math.max(
        1,
        Math.min(99, Number(it.quantity ?? 1) || 1)
      );
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
        } else if (
          typeof sys.quantity === "object" &&
          sys.quantity !== null
        ) {
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
   */
  async #ensureActorFolder(folderName) {
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

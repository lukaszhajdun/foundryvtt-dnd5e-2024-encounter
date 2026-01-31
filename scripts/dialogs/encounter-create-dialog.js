/**
 * EncounterCreateDialog – okno popup do konfiguracji aktora encounter.
 *
 * Ten dialog:
 *  - pozwala skonfigurować nazwę encountera, summary, opis, katalog i walutę,
 *  - pozwala dodać przedmioty (itemy) przeciągane z kompemdiów lub świata,
 *  - grupuje identyczne przedmioty po uuid i obsługuje ilości (quantity),
 *  - może zapisać domyślne ustawienia (bez przedmiotów),
 *  - przekazuje pełny config do EncounterCalculatorApp.createEncounterFromEnemies().
 *
 * W stopce pokazuje:
 *  - liczbę wrogów (TERAZ sumaryczna ilość = suma quantity),
 *  - sumaryczną wartość waluty w złocie (GP),
 *  - sumaryczną wartość przedmiotów w złocie (GP),
 *  - sumaryczną wartość encountera (waluta + przedmioty).
 *
 * Dodatkowo:
 *  - obsługuje generatory skarbów:
 *      • Individual Treasure (dla każdego potwora wg CR),
 *      • Treasure Hoard (dla najwyższego CR),
 *    zgodnie z tabelami opisanymi przez użytkownika.
 */

import {
  MODULE_ID,
  DEFAULT_ENCOUNTER_NAME,
  DEFAULT_ENCOUNTER_FOLDER_NAME,
  DEFAULT_ENCOUNTER_GOLD,
  DEFAULT_ENCOUNTER_SILVER,
  DEFAULT_ENCOUNTER_COPPER,
  MAX_ITEM_QUANTITY
} from "../config.js";
import { applyUserStyles } from "../ui-style.js";
import { RollFormulaDialog } from "./roll-formula-dialog.js";
import { TreasureChoiceDialog } from "./treasure-choice-dialog.js";
import {
  generateIndividualTreasure,
  generateTreasureHoard,
  getEncounterDefaultName,
  getEncounterUseFolderByDefault,
  getEncounterDefaultFolderName,
  getEncounterDefaultGold,
  getEncounterDefaultSilver,
  getEncounterDefaultCopper,
  bindOnceAll,
  bindOnceAllMulti,
  formatCurrencyValue,
  formatGoldEquivalent,
  normalizeNumberInput,
  queryCurrencyInputs,
  queryFormTextInputs,
  getCurrencyLabel,
  rollCurrencyFormula,
  setCurrencyValue,
  removeItemById,
  updateItemQuantity,
  validateItemQuantity
} from "../services/index.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const { DragDrop, TextEditor } = foundry.applications.ux;

export class EncounterCreateDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  // Referencja do głównej aplikacji kalkulatora encounterów.
  calculator;

  // Aktywna zakładka ("general" | "currency" | "items").
  activeTab = "general";

  // Flaga – czy próbowaliśmy już zainicjować auto-loot na podstawie wrogów.
  _autoLootInitialized = false;

  // Pamiętane wartości formularza (aby nie tracić ich przy przełączaniu zakładek).
  _name = undefined;
  _summary = undefined;
  _description = undefined;
  _useFolder = undefined;
  _folderName = undefined;

  // Waluta encountera – przechowywana jako liczby całkowite.
  _platinum = undefined;
  _gold = undefined;
  _silver = undefined;
  _copper = undefined;
  _electrum = undefined;

  // Liczba magicznych przedmiotów wylosowanych przez Treasure Hoard.
  _magicItemsCount = 0;

  // Lista przedmiotów (itemów) dodanych do encountera.
  _items = [];

  // Obiekt DragDrop do obsługi przeciągania itemów na zakładce "Przedmioty".
  _itemsDragDrop = null;

  // ─────────────────────────────────────────────
  // Konfiguracja ApplicationV2
  // ─────────────────────────────────────────────

  static DEFAULT_OPTIONS = {
    id: "dnd5e-2024-encounter-create-dialog",
    title: "Utwórz encounter",
    classes: [
      "dnd5e-2024-encounter-create-dialog",
      "dnd5e-encounter-calculator"
    ],
    position: {
      width: 960,
      height: 740
    },
    window: {
      title: "Utwórz encounter",
      icon: "fa-solid fa-dragon",
      resizable: true
    },
    actions: {
      saveEncounterSettings: EncounterCreateDialog._onActionSaveSettings,
      createEncounterActor: EncounterCreateDialog._onActionCreateActor,
      switchTab: EncounterCreateDialog._onActionSwitchTab,
      removeItem: EncounterCreateDialog._onActionRemoveItem,
      increaseItemQuantity: EncounterCreateDialog._onActionIncreaseItemQuantity,
      decreaseItemQuantity: EncounterCreateDialog._onActionDecreaseItemQuantity,
      generateIndividualTreasure:
        EncounterCreateDialog._onActionGenerateIndividualTreasure,
      generateTreasureHoard:
        EncounterCreateDialog._onActionGenerateTreasureHoard
    }
  };

  static PARTS = {
    main: {
      template:
        "modules/dnd5e-2024-encounter/templates/encounter-create-dialog.hbs"
    }
  };

  constructor(options = {}) {
    super(options);

    this.calculator = options.calculator ?? null;
    this.activeTab = "general";
  }

  // ─────────────────────────────────────────────
  // Ustawienia domyślne z game.settings
  // ─────────────────────────────────────────────

  static loadEncounterSettings() {
    let name = getEncounterDefaultName() || DEFAULT_ENCOUNTER_NAME;
    let useFolder = getEncounterUseFolderByDefault() ?? true;
    let folderName = getEncounterDefaultFolderName() || DEFAULT_ENCOUNTER_FOLDER_NAME;
    let gold = getEncounterDefaultGold() ?? DEFAULT_ENCOUNTER_GOLD;
    let silver = getEncounterDefaultSilver() ?? DEFAULT_ENCOUNTER_SILVER;
    let copper = getEncounterDefaultCopper() ?? DEFAULT_ENCOUNTER_COPPER;

    return {
      name,
      useFolder: !!useFolder,
      folderName,
      gold: Number(gold) || 0,
      silver: Number(silver) || 0,
      copper: Number(copper) || 0
    };
  }

  // ─────────────────────────────────────────────
  // Kontekst szablonu
  // ─────────────────────────────────────────────

  async _prepareContext(_options) {
    // 1) Ładujemy domyślne ustawienia encountera z game.settings.
    const defaults = EncounterCreateDialog.loadEncounterSettings();

    // 2) Wyliczamy liczbę wrogów:
    //    TERAZ jest to suma quantity wszystkich wpisów enemies,
    //    nie tylko liczba różnych typów.
    const enemiesRaw = this.calculator?.enemies ?? [];
    const enemiesCount = enemiesRaw.reduce(
      (sum, e) => sum + (Number(e.quantity ?? 1) || 1),
      0
    );

    // 3) Inicjalizujemy pamiętane wartości formularza, jeśli jeszcze są nieokreślone.
    if (typeof this._name === "undefined") this._name = defaults.name;
    if (typeof this._useFolder === "undefined")
      this._useFolder = defaults.useFolder;
    if (typeof this._folderName === "undefined")
      this._folderName = defaults.folderName;

    if (typeof this._gold === "undefined") this._gold = defaults.gold;
    if (typeof this._silver === "undefined") this._silver = defaults.silver;
    if (typeof this._copper === "undefined") this._copper = defaults.copper;

    if (typeof this._platinum === "undefined") this._platinum = 0;
    if (typeof this._electrum === "undefined") this._electrum = 0;

    if (typeof this._summary === "undefined") this._summary = "";
    if (typeof this._description === "undefined") this._description = "";

    if (typeof this._magicItemsCount === "undefined")
      this._magicItemsCount = 0;

    if (!Array.isArray(this._items)) this._items = [];

    // 4) Jednorazowa próba automatycznego uzupełnienia łupu z wrogów.
    if (!this._autoLootInitialized) {
      await this._maybeInitializeAutoLootItems();
      this._autoLootInitialized = true;
    }

    // 5) Obliczamy wartości waluty i przedmiotów za pomocą serwisu.
    const currencyGoldValue = formatGoldEquivalent(
      this._platinum,
      this._gold,
      this._electrum,
      this._silver,
      this._copper
    );
    const itemsGoldValue = this._computeItemsGoldValue();
    const totalEncounterValue = currencyGoldValue + itemsGoldValue;

    const totalGoldGpFormatted = formatCurrencyValue(currencyGoldValue);
    const itemsGoldValueFormatted = formatCurrencyValue(itemsGoldValue);
    const totalEncounterValueFormatted = formatCurrencyValue(totalEncounterValue);

    // 6) Zwracamy obiekt kontekstu dla szablonu HBS.
    return {
      // Ogólne
      name: this._name,
      summary: this._summary,
      description: this._description,
      useFolder: this._useFolder,
      folderName: this._folderName,

      // Waluta
      platinum: this._platinum,
      gold: this._gold,
      silver: this._silver,
      copper: this._copper,
      electrum: this._electrum,

      // Przedmioty
      items: this._items,

      // Magic items (Treasure Hoard)
      magicItemsCount: this._magicItemsCount ?? 0,

      // Stopka – wartości sformatowane do 2 miejsc po przecinku
      enemiesCount,
      totalGoldGp: totalGoldGpFormatted,
      itemsGoldValue: itemsGoldValueFormatted,
      totalEncounterValue: totalEncounterValueFormatted,

      // Zakładki
      activeTab: this.activeTab,
      isTabGeneral: this.activeTab === "general",
      isTabCurrency: this.activeTab === "currency",
      isTabItems: this.activeTab === "items"
    };
  }

  /**
   * Próbuje jednorazowo wygenerować automatyczny łup na podstawie wrogów
   * (np. ekwipunek przeciwników) – logika dostarczana przez EncounterCalculatorApp.
   */
  async _maybeInitializeAutoLootItems() {
    if (Array.isArray(this._items) && this._items.length > 0) return;
    if (!this.calculator) return;

    const enemiesCount = this.calculator.enemies?.length ?? 0;
    if (!enemiesCount) return;

    const autoLootItems =
      (await this.calculator.getAutoLootItemsFromEnemies()) ?? [];

    if (!autoLootItems.length) return;

    if (!Array.isArray(this._items) || !this._items.length) {
      this._items = autoLootItems;
    }
  }

  /**
   * Wywoływane po wyrenderowaniu okna – tutaj:
   *  - nakładamy styl użytkownika (tematy, dostępność),
   *  - konfigurujemy DragDrop dla zakładki "Przedmioty",
   *  - podpinamy nasłuchy na zmiany ilości itemów i waluty,
   *  - podpinamy przyciski losowania waluty.
   */
  _onRender(_context, _options) {
    const root = this.element;
    if (!root) return;

    // Styl globalny (tematy, rozmiar czcionki, tryb dostępności).
    applyUserStyles(root);

    // ───── Drag & Drop itemów (zakładka "Przedmioty") ─────
    if (!this._itemsDragDrop) {
      this._itemsDragDrop = new DragDrop({
        dragSelector: null,
        dropSelector: ".ec-items-dropzone",
        permissions: {
          dragstart: () => true,
          drop: () => true
        },
        callbacks: {
          drop: this._onDropItem.bind(this)
        }
      });
    }
    this._itemsDragDrop.bind(root);

    // ───── Zmiana ilości itemów (input number) ─────
    const qtyInputs = root.querySelectorAll(".ec-item-quantity-input");
    bindOnceAll(
      qtyInputs,
      "boundItemQuantityChange",
      "change",
      (event) => this._onItemQuantityInputChange(event)
    );

    // ───── Przyciski losowania waluty (🎲 przy każdej walucie) ─────
    const rollButtons = root.querySelectorAll(".ec-roll-button");
    bindOnceAll(
      rollButtons,
      "boundCurrencyRoll",
      "click",
      (event) => this._onClickRollCurrencyButton(event)
    );

    // ───── Ręczna zmiana wartości waluty (inputy) ─────
    const currencyInputs = root.querySelectorAll(
      '.ec-currency-input input[type="number"]'
    );
    const handler = (event) => this._onCurrencyFieldChanged(event);
    bindOnceAllMulti(
      currencyInputs,
      "boundCurrencyChange",
      ["change", "blur"],
      handler
    );
  }

  // ─────────────────────────────────────────────
  // Waluta i wartości w GP
  // ─────────────────────────────────────────────

  /**
   * Przelicza całą walutę encountera na złoto (GP) jako wartość liczbową.
   * Deleguje do serwisu form-components.
   */
  _computeCurrencyGoldValue() {
    return formatGoldEquivalent(
      this._platinum,
      this._gold,
      this._electrum,
      this._silver,
      this._copper
    );
  }

  /**
   * Przelicza wszystkie itemy (z uwzględnieniem quantity) na wartość w GP.
   * Przyjmuje, że pole price itemu to już GP.
   */
  _computeItemsGoldValue() {
    if (!Array.isArray(this._items) || !this._items.length) return 0;

    return this._items.reduce((sum, item) => {
      const price = Number(item.price ?? 0) || 0;
      const qty = Math.max(1, Math.min(99, Number(item.quantity ?? 1) || 1));
      return sum + price * qty;
    }, 0);
  }

  /**
   * Wylicza wartość itemu w GP na podstawie jego dokumentu (Item5e).
   * Obsługuje strukturę system.price z jednostkami waluty (pp/gp/ep/sp/cp).
   */
  _getItemGoldValueFromDocument(item) {
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

  // ─────────────────────────────────────────────
  // Odczyt formularza
  // ─────────────────────────────────────────────

  /**
   * Odczytuje aktualne wartości formularza z DOM i zapisuje je w polach
   * prywatnych, aby utrzymać stan między przełączeniami zakładek.
   */
  _readFormValues() {
    const root = this.element;
    if (!root) {
      return {
        name: this._name ?? DEFAULT_ENCOUNTER_NAME,
        summary: this._summary ?? "",
        description: this._description ?? "",
        useFolder:
          typeof this._useFolder === "boolean" ? this._useFolder : true,
        folderName: this._folderName ?? DEFAULT_ENCOUNTER_FOLDER_NAME,
        platinum: this._platinum ?? 0,
        gold: this._gold ?? DEFAULT_ENCOUNTER_GOLD,
        silver: this._silver ?? DEFAULT_ENCOUNTER_SILVER,
        copper: this._copper ?? DEFAULT_ENCOUNTER_COPPER,
        electrum: this._electrum ?? 0
      };
    }

    // Użyj dom-helpers
    const textInputs = queryFormTextInputs(root);
    const currencyInputs = queryCurrencyInputs(root);

    const name = (textInputs.name?.value ?? "").toString().trim();
    const summary = textInputs.summary?.value?.toString() ?? "";
    const description = textInputs.description?.value?.toString() ?? "";
    const useFolder = textInputs.useFolder?.checked ?? true;
    const folderName = (textInputs.folderName?.value ?? "").toString().trim();

    const platinum = normalizeNumberInput(currencyInputs.platinum?.value, 0);
    const gold = normalizeNumberInput(currencyInputs.gold?.value, 0);
    const silver = normalizeNumberInput(currencyInputs.silver?.value, 0);
    const copper = normalizeNumberInput(currencyInputs.copper?.value, 0);
    const electrum = normalizeNumberInput(currencyInputs.electrum?.value, 0);

    this._name = name || DEFAULT_ENCOUNTER_NAME;
    this._summary = summary;
    this._description = description;
    this._useFolder = !!useFolder;
    this._folderName = folderName || DEFAULT_ENCOUNTER_FOLDER_NAME;

    this._platinum = platinum;
    this._gold = gold;
    this._silver = silver;
    this._copper = copper;
    this._electrum = electrum;

    return {
      name: this._name,
      summary: this._summary,
      description: this._description,
      useFolder: this._useFolder,
      folderName: this._folderName,
      platinum: this._platinum,
      gold: this._gold,
      silver: this._silver,
      copper: this._copper,
      electrum: this._electrum
    };
  }

  // ─────────────────────────────────────────────
  // Drag & Drop itemów
  // ─────────────────────────────────────────────

  /**
   * Obsługuje drop itemu (z kompemdium lub świata) na zakładkę "Przedmioty".
   * Grupuje itemy po uuid – jeśli już istnieje, zwiększa quantity, inaczej dodaje nowy wpis.
   */
  async _onDropItem(event) {
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

    if (!Array.isArray(this._items)) this._items = [];

    const existing = this._items.find((it) => it.uuid === item.uuid);

    if (existing) {
      const current = Number(existing.quantity ?? 1) || 1;
      existing.quantity = Math.min(99, current + 1);
    } else {
      const localId = foundry.utils.randomID();
      const priceGp = this._getItemGoldValueFromDocument(item);

      const entry = {
        _id: localId,
        uuid: item.uuid,
        name: item.name,
        type: item.type,
        img: item.img,
        price: priceGp,
        quantity: 1
      };

      this._items.push(entry);
    }

    this.render();
  }

  // ─────────────────────────────────────────────
  // Ilość przedmiotów
  // ─────────────────────────────────────────────

  /**
   * Aktualizuje ilość itemu (quantity) według trybu:
   *  - "delta" – dodaj/odejmij,
   *  - "set" – ustaw konkretną wartość.
   */
  _updateItemQuantity(itemId, mode, value) {
    if (!Array.isArray(this._items)) this._items = [];
    const result = updateItemQuantity(this._items, itemId, mode, value);
    this._items = result.items;
  }

  /**
   * Handler zmiany ilości przedmiotu w polu input (zakładka "Przedmioty").
   */
  _onItemQuantityInputChange(event) {
    const input = event.currentTarget;
    const itemId = input.dataset.itemId;
    if (!itemId) return;

    const raw = input.value;
    let parsed = Number(raw);

    const validation = validateItemQuantity(parsed, this._items, itemId);
    input.value = String(validation.normalized);

    if (validation.shouldRemove) {
      this._items = removeItemById(this._items, itemId);
      this.render();
      return;
    }

    this._updateItemQuantity(itemId, "set", validation.normalized);
    this.render();
  }

  // ─────────────────────────────────────────────
  // Ręczna zmiana waluty – aktualizacja stopki
  // ─────────────────────────────────────────────

  /**
   * Wywoływany przy zmianie / opuszczeniu pola waluty – odczytuje formularz
   * i odświeża stopkę, aby przeliczyć złoto w GP.
   */
  _onCurrencyFieldChanged(_event) {
    this._readFormValues();
    this.render();
  }

  // ─────────────────────────────────────────────
  // Zapis ustawień i tworzenie encountera
  // ─────────────────────────────────────────────

  /**
   * Zapisuje z formularza domyślne ustawienia encountera do game.settings
   * (bez przedmiotów – chodzi o nazwę, katalog i walutę).
   */
  async _saveSettingsFromForm() {
    const values = this._readFormValues();

    await game.settings.set(
      MODULE_ID,
      "encounterDefaultName",
      values.name || DEFAULT_ENCOUNTER_NAME
    );

    await game.settings.set(
      MODULE_ID,
      "encounterUseFolderByDefault",
      !!values.useFolder
    );

    await game.settings.set(
      MODULE_ID,
      "encounterDefaultFolderName",
      values.folderName || DEFAULT_ENCOUNTER_FOLDER_NAME
    );

    await game.settings.set(
      MODULE_ID,
      "encounterDefaultGold",
      Math.max(0, values.gold)
    );
    await game.settings.set(
      MODULE_ID,
      "encounterDefaultSilver",
      Math.max(0, values.silver)
    );
    await game.settings.set(
      MODULE_ID,
      "encounterDefaultCopper",
      Math.max(0, values.copper)
    );

    ui.notifications.info(
      "Ustawienia domyślne encountera zostały zapisane."
    );

    this.render();
  }

  /**
   * Tworzy aktora encounter na podstawie danych z formularza
   * i aktualnych wrogów w kalkulatorze.
   */
  async _createActorFromForm() {
    if (!this.calculator) {
      ui.notifications.error(
        "Brak połączenia z kalkulatorem encounterów."
      );
      return;
    }

    const enemiesCount = this.calculator.enemies?.length ?? 0;
    if (!enemiesCount) {
      ui.notifications.info(
        "Brak wrogów w kalkulatorze. Dodaj wrogów po prawej stronie, zanim utworzysz encounter."
      );
      return;
    }

    const values = this._readFormValues();
    values.items = Array.isArray(this._items) ? this._items : [];
    values.magicItemsCount = this._magicItemsCount ?? 0;

    await this.calculator.createEncounterFromEnemies(values);
    this.close();
  }

  // ─────────────────────────────────────────────
  // ACTIONS popupu
  // ─────────────────────────────────────────────

  static _onActionSaveSettings(_event, _target) {
    this._saveSettingsFromForm();
  }

  static _onActionCreateActor(_event, _target) {
    this._createActorFromForm();
  }

  static _onActionSwitchTab(_event, target) {
    const tab = target?.dataset?.tab;
    if (!["general", "currency", "items"].includes(tab)) return;

    this._readFormValues();
    this.activeTab = tab;
    this.render();
  }

  static _onActionRemoveItem(_event, target) {
    const itemId = target?.dataset?.itemId;
    if (!itemId) return;

    if (!Array.isArray(this._items)) this._items = [];
    this._items = removeItemById(this._items, itemId);

    this.render();
  }

  static _onActionIncreaseItemQuantity(_event, target) {
    const itemId = target?.dataset?.itemId;
    if (!itemId) return;

    this._updateItemQuantity(itemId, "delta", 1);
    this.render();
  }

  static _onActionDecreaseItemQuantity(_event, target) {
    const itemId = target?.dataset?.itemId;
    if (!itemId) return;

    this._updateItemQuantity(itemId, "delta", -1);
    this.render();
  }

  static _onActionGenerateIndividualTreasure(_event, _target) {
    this._generateIndividualTreasure();
  }

  static _onActionGenerateTreasureHoard(_event, _target) {
    this._generateTreasureHoard();
  }

  // ─────────────────────────────────────────────
  // Enemies do generatorów skarbów
  // ─────────────────────────────────────────────

  /**
   * Zwraca tablicę wrogów do generatorów skarbów (Individual / Hoard),
   * z normalizacją CR i quantity.
   */
  _getEnemiesForTreasure() {
    const raw = this.calculator?.enemies ?? [];
    return raw
      .map((e) => {
        const crNum = e.cr != null ? Number(e.cr) : NaN;
        const quantity = Number(e.quantity ?? 1) || 1;
        const safeCr =
          Number.isFinite(crNum) && crNum >= 0 ? crNum : null;

        return {
          name: e.name ?? "??",
          cr: safeCr,
          quantity: Math.max(1, Math.min(99, quantity))
        };
      })
      .filter((e) => e.cr !== null);
  }

  // ─────────────────────────────────────────────
  // INDIVIDUAL TREASURE
  // ─────────────────────────────────────────────

  async _generateIndividualTreasure() {
    const enemies = this._getEnemiesForTreasure();
    if (!enemies.length) {
      ui.notifications.info(
        "Brak wrogów z CR – nie można wygenerować Individual Treasure."
      );
      return;
    }

    const mode = await this._promptTreasureMode("individual");
    if (!mode) return;

    const rollEvaluator = async (formula) => {
      const roll = new Roll(formula);
      await roll.evaluate();
      return Math.max(0, Math.floor(roll.total ?? 0));
    };

    const result = await generateIndividualTreasure({
      enemies,
      mode,
      rollEvaluator
    });

    this._platinum = result.platinum;
    this._gold = result.gold;
    this._silver = result.silver;
    this._copper = result.copper;
    this._electrum = result.electrum;

    this.render();
  }

  // ─────────────────────────────────────────────
  // TREASURE HOARD
  // ─────────────────────────────────────────────

  async _generateTreasureHoard() {
    const enemies = this._getEnemiesForTreasure();
    if (!enemies.length) {
      ui.notifications.info(
        "Brak wrogów z CR – nie można wygenerować Treasure Hoard."
      );
      return;
    }

    const maxCr = Math.max(...enemies.map((e) => e.cr));

    const mode = await this._promptTreasureMode("hoard");
    if (!mode) return;

    const rollEvaluator = async (formula) => {
      const roll = new Roll(formula);
      await roll.evaluate();
      return Math.max(0, Math.floor(roll.total ?? 0));
    };

    const result = await generateTreasureHoard({
      maxCr,
      mode,
      rollEvaluator
    });

    this._platinum = result.platinum;
    this._gold = result.gold;
    this._silver = result.silver;
    this._copper = result.copper;
    this._electrum = result.electrum;
    this._magicItemsCount = result.magicItemsCount;

    this.render();
  }

  // ─────────────────────────────────────────────
  // Popup wyboru trybu: "rzuty" vs "średnie"
  // ─────────────────────────────────────────────

  async _promptTreasureMode(kind) {
    return new Promise((resolve) => {
      const dialog = new TreasureChoiceDialog({
        kind,
        resolve
      });
      dialog.render(true);
    });
  }

  // ─────────────────────────────────────────────
  // LOSOWANIE POJEDYNCZEJ WALUTY – przyciski 🎲
  // ─────────────────────────────────────────────

  async _onClickRollCurrencyButton(event) {
    event.preventDefault();

    const button = event.currentTarget;
    if (!button) return;

    const currencyKey = button.dataset.currency;
    if (!currencyKey) return;

    const prettyLabel = getCurrencyLabel(currencyKey);

    const result = await new Promise((resolve) => {
      const dialog = new RollFormulaDialog({
        currencyLabel: prettyLabel,
        defaultFormula: "",
        resolve
      });
      dialog.render(true);
    });

    if (!result || !result.formula) return;

    let total;
    try {
      total = await rollCurrencyFormula(result.formula);
    } catch (error) {
      console.error("[EncounterCreateDialog] Błąd rzutu:", error);
      ui.notifications.error("Nieprawidłowa formuła rzutu.");
      return;
    }

    // Aktualizuj zarówno this._XXX jak i DOM
    setCurrencyValue(this, currencyKey, total);

    // Wyślij wiadomość o rzucie do chatu
    const r = new Roll(result.formula);
    await r.evaluate();

    r.toMessage({
      speaker: ChatMessage.getSpeaker(),
      flavor: `Losowanie waluty (${prettyLabel}) dla encountera "${
        this._name ?? ""
      }".`
    });

    this.render();
  }
}

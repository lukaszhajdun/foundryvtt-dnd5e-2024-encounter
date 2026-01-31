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
  DEFAULT_ENCOUNTER_COPPER
} from "../config/constants.js";
import { applyUserStyles } from "../services/ui/ui-style.service.js";
import {
  getEncounterDefaultName,
  getEncounterUseFolderByDefault,
  getEncounterDefaultFolderName,
  getEncounterDefaultGold,
  getEncounterDefaultSilver,
  getEncounterDefaultCopper,
  bindOnceAll,
  bindOnceAllMulti,
  formatCurrencyValue,
  normalizeNumberInput,
  queryCurrencyInputs,
  queryFormTextInputs,
  removeItemById
} from "../services/index.js";
import {
  computeCurrencyGoldValue,
  onCurrencyFieldChanged,
  onClickRollCurrencyButton
} from "./encounter-create/currency-tab-handler.js";
import {
  maybeInitializeAutoLootItems,
  computeItemsGoldValue,
  onDropItem,
  updateItemQuantityForDialog,
  onItemQuantityInputChange
} from "./encounter-create/items-tab-handler.js";
import {
  getEnemiesForTreasure,
  generateIndividualTreasureForDialog,
  generateTreasureHoardForDialog
} from "./encounter-create/treasure-handler.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const { DragDrop } = foundry.applications.ux;

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
    const currencyGoldValue = this._computeCurrencyGoldValue();
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
    await maybeInitializeAutoLootItems(this);
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
   */
  _computeCurrencyGoldValue() {
    return computeCurrencyGoldValue({
      platinum: this._platinum,
      gold: this._gold,
      electrum: this._electrum,
      silver: this._silver,
      copper: this._copper
    });
  }

  /**
   * Przelicza wszystkie itemy (z uwzględnieniem quantity) na wartość w GP.
   * Przyjmuje, że pole price itemu to już GP.
   */
  _computeItemsGoldValue() {
    return computeItemsGoldValue(this._items);
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
    await onDropItem(this, event);
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
    updateItemQuantityForDialog(this, itemId, mode, value);
  }

  /**
   * Handler zmiany ilości przedmiotu w polu input (zakładka "Przedmioty").
   */
  _onItemQuantityInputChange(event) {
    onItemQuantityInputChange(this, event);
  }

  // ─────────────────────────────────────────────
  // Ręczna zmiana waluty – aktualizacja stopki
  // ─────────────────────────────────────────────

  /**
   * Wywoływany przy zmianie / opuszczeniu pola waluty – odczytuje formularz
   * i odświeża stopkę, aby przeliczyć złoto w GP.
   */
  _onCurrencyFieldChanged(_event) {
    onCurrencyFieldChanged(this);
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
    return getEnemiesForTreasure(this);
  }

  // ─────────────────────────────────────────────
  // INDIVIDUAL TREASURE
  // ─────────────────────────────────────────────

  async _generateIndividualTreasure() {
    await generateIndividualTreasureForDialog(this);
  }

  // ─────────────────────────────────────────────
  // TREASURE HOARD
  // ─────────────────────────────────────────────

  async _generateTreasureHoard() {
    await generateTreasureHoardForDialog(this);
  }

  // ─────────────────────────────────────────────
  // LOSOWANIE POJEDYNCZEJ WALUTY – przyciski 🎲
  // ─────────────────────────────────────────────

  async _onClickRollCurrencyButton(event) {
    await onClickRollCurrencyButton(this, event);
  }
}

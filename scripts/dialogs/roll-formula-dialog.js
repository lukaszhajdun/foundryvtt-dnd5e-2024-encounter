// scripts/roll-formula-dialog.js

// Wyciągamy ApplicationV2 i HandlebarsApplicationMixin z API Foundry 13+
// scripts/roll-formula-dialog.js
// scripts/roll-formula-dialog.js

import { applyUserStyles } from "../ui-style.js";
import { bindOnce } from "../services/index.js";

// Wyciągamy ApplicationV2 i HandlebarsApplicationMixin z API Foundry 13+
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;



/**
 * RollFormulaDialog
 * ------------------
 * Małe okno V2 + Handlebars używane do wpisania formuły rzutu kośćmi
 * dla konkretnej waluty (PP, GP, SP, CP, EP).
 *
 * - ZERO Application V1 / Dialog V1.
 * - Styl zgodny z kalkulatorem (te same klasy CSS).
 * - Zwraca do wywołującego obiekt:
 *     { formula: string }
 *   lub null, jeśli użytkownik anulował.
 */
export class RollFormulaDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  // Prywatne pola przechowujące dane instancji
  #currencyLabel;
  #defaultFormula;
  #resolve;

  /**
   * Konstruktor przyjmuje:
   *  - currencyLabel: tekst do wyświetlenia (np. "złota (GP)")
   *  - defaultFormula: domyślna formuła (opcjonalne)
   *  - resolve: funkcja z Promisa, którą wywołamy po kliknięciu "Rzuć" lub "Anuluj"
   */
  constructor({ currencyLabel, defaultFormula = "", resolve } = {}) {
    super();
    this.#currencyLabel = currencyLabel ?? "";
    this.#defaultFormula = defaultFormula ?? "";
    this.#resolve = typeof resolve === "function" ? resolve : () => {};
  }

  // ─────────────────────────────────────────────
  // OPTIONS + PARTS – styl i szablon
  // ─────────────────────────────────────────────

  /**
   * Domyślne opcje okna – V2.
   * Używamy tych samych klas co popup encountera, żeby styl był spójny
   * i żeby działały ustawienia stylu modułu (kolory, font-size itp.).
   */
  static DEFAULT_OPTIONS = {
    id: "dnd5e-encounter-roll-formula-dialog",
    window: {
      title: "Losowanie waluty",
      icon: "fa-solid fa-dice",
      resizable: true
    },
    position: {
      width: 480,
      height: "auto"
    },
    classes: [
      // Te same klasy, które stosujesz w głównym kalkulatorze / popupach
      "dnd5e-encounter-calculator",
      "dnd5e-2024-encounter-create-dialog",
      "encounter-roll-dialog"
    ],
    popOut: true
  };

  /**
   * PARTS – HandlebarsApplicationMixin użyje tego szablonu jako głównego.
   * Upewniamy się, że ścieżka modułu jest taka sama jak w encounter-create-dialog.hbs.
   */
  static PARTS = {
    main: {
      template:
        "modules/dnd5e-2024-encounter/templates/roll-formula-dialog.hbs"
    }
  };

  // ─────────────────────────────────────────────
  // KONTEKST DLA SZABLONU
  // ─────────────────────────────────────────────

  /**
   * Kontekst przekazywany do szablonu HBS.
   * Zawiera:
   *  - currencyLabel: tekst nagłówka / podtytułu
   *  - defaultFormula: wartość początkowa w polu input
   */
  _prepareContext(_options) {
    return {
      currencyLabel: this.#currencyLabel,
      defaultFormula: this.#defaultFormula
    };
  }

  // ─────────────────────────────────────────────
  // RENDER I LISTENERY
  // ─────────────────────────────────────────────

  /**
   * Po wyrenderowaniu okna podpinamy event listenery do przycisków "Rzuć" i "Anuluj".
   */
  _onRender(_context, _options) {
    const root = this.element;
    if (!root) return;

    // Nałóż ten sam styl użytkownika, co na główne okno kalkulatora i popup encountera
    applyUserStyles(root);

    const rollButton = root.querySelector('[data-action="roll"]');
    const cancelButton = root.querySelector('[data-action="cancel"]');

    bindOnce(rollButton, "boundRoll", "click", (event) =>
      this.#onClickRoll(event)
    );

    bindOnce(cancelButton, "boundCancel", "click", (event) =>
      this.#onClickCancel(event)
    );
  }



  // ─────────────────────────────────────────────
  // LOGIKA FORMUŁY
  // ─────────────────────────────────────────────

  /**
   * Pobiera aktualną formułę z inputu w oknie.
   */
  #getFormula() {
    const input = this.element?.querySelector('input[name="formula"]');
    return input?.value?.trim() ?? "";
  }

  /**
   * Obsługa kliknięcia "Rzuć".
   *  - Waliduje formułę przy pomocy Roll.validate
   *  - Zwraca ją do wywołującego (EncounterCreateDialog) przez this.#resolve
   */
  #onClickRoll(event) {
    event.preventDefault();

    const formula = this.#getFormula();
    if (!formula) {
      ui.notifications.warn("Podaj formułę rzutu kośćmi.");
      return;
    }

    // Walidacja formuły – Foundry 13 obsługuje złożone wyrażenia (nawiasy, mnożenie, itp.).
    if (!Roll.validate(formula)) {
      ui.notifications.error("Nieprawidłowa formuła rzutu.");
      return;
    }

    // Zwracamy formułę do kodu wywołującego
    this.#resolve({ formula });
    this.close();
  }

  /**
   * Obsługa kliknięcia "Anuluj" – nic nie zwracamy (null).
   */
  #onClickCancel(event) {
    event.preventDefault();
    this.#resolve(null);
    this.close();
  }
}

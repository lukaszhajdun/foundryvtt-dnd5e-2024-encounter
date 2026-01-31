/**
 * TreasureChoiceDialog – małe okno do wyboru:
 *  - "Rzuty kośćmi"
 *  - "Użyj średnich"
 *
 * Używane w:
 *  - EncounterCreateDialog._generateIndividualTreasure()
 *  - EncounterCreateDialog._generateTreasureHoard()
 */

import { styleDialogRoot } from "../services/index.js";

const { ApplicationV2, HandlebarsApplicationMixin } =
  foundry.applications.api;

export class TreasureChoiceDialog extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  /**
   * kind:
   *  - "individual" – Individual Treasure,
   *  - "hoard"      – Treasure Hoard.
   *
   * resolve:
   *  - funkcja z Promise, którą wywołujemy z:
   *      • "roll"
   *      • "average"
   *      • null (anulowanie)
   */
  kind;
  resolve;

  static DEFAULT_OPTIONS = {
    id: "dnd5e-2024-treasure-choice-dialog",
    title: "Wybierz sposób generowania skarbu",
    classes: [
      "dnd5e-2024-treasure-choice-dialog",
      "dnd5e-encounter-calculator"
    ],
    position: {
      width: 420,
      height: "auto"
    },
    window: {
      title: "Generowanie skarbu",
      icon: "fa-solid fa-coins",
      resizable: false
    },
    actions: {
      chooseRoll: TreasureChoiceDialog._onActionChooseRoll,
      chooseAverage: TreasureChoiceDialog._onActionChooseAverage,
      cancel: TreasureChoiceDialog._onActionCancel
    }
  };

  static PARTS = {
    main: {
      template:
        "modules/dnd5e-2024-encounter/templates/treasure-choice-dialog.hbs"
    }
  };

  constructor(options = {}) {
    super(options);
    this.kind = options.kind ?? "individual";
    this.resolve = options.resolve ?? (() => {});
  }

  async _prepareContext() {
    let title = "";
    let message = "";
    let hint = "";

    if (this.kind === "hoard") {
      title = "Treasure Hoard – sposób generowania";
      message =
        "Wybierz, czy złoto skarbu ma być generowane rzutami kośćmi, czy na podstawie wartości średnich.";
      hint =
        "Liczba magicznych przedmiotów zawsze jest losowana kośćmi. Wartości średnie dotyczą tylko złota.";
    } else {
      title = "Individual Treasure – sposób generowania";
      message =
        "Wybierz, czy skarb indywidualny dla każdego potwora ma być generowany rzutami, czy jako średnie z tabel.";
      hint =
        "Średnie wartości odpowiadają średnim wynikom podanym w tabelach. Rzuty dadzą bardziej losowy rezultat.";
    }

    return { title, message, hint };
  }

  _onRender(_context, _options) {
    const root = this.element;
    if (!root) return;

    // Ujednolicamy styl z kalkulatorem i popupem encountera.
    styleDialogRoot(root);
  }

  // ─────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────

  static _onActionChooseRoll(_event, _target) {
    this._resolveAndClose("roll");
  }

  static _onActionChooseAverage(_event, _target) {
    this._resolveAndClose("average");
  }

  static _onActionCancel(_event, _target) {
    this._resolveAndClose(null);
  }

  _resolveAndClose(value) {
    try {
      this.resolve?.(value);
    } finally {
      this.close();
    }
  }
}

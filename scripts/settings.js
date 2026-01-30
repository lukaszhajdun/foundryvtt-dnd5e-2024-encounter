// scripts/settings.js

/**
 * Rejestracja wszystkich ustawień modułu.
 * Ten plik jest powiązany z:
 *  - config.js (stałe i domyślne wartości)
 *  - ui-style.js (nakładanie stylu na okna)
 *  - encounter-create-dialog.js (popup "Utwórz encounter")
 */

import {
  MODULE_ID,
  DEFAULT_ALLY_NPC_WEIGHT,
  DEFAULT_BG_COLOR,
  DEFAULT_TEXT_COLOR,
  DEFAULT_FONT_SCALE,
  DEFAULT_ENCOUNTER_NAME,
  DEFAULT_ENCOUNTER_FOLDER_NAME,
  DEFAULT_ENCOUNTER_GOLD,
  DEFAULT_ENCOUNTER_SILVER,
  DEFAULT_ENCOUNTER_COPPER,
  COLOR_PRESETS
} from "./config.js";

/**
 * Funkcja wywoływana w Hooks.once("init"),
 * która rejestruje wszystkie ustawienia modułu.
 */
export function registerModuleSettings() {
  // ─────────────────────────────────────────────
  // Waga sojuszniczych NPC (friendly NPC)
  // ─────────────────────────────────────────────
  game.settings.register(MODULE_ID, "allyNpcWeight", {
    name: "Waga sojuszniczych NPC (friendly NPC)",
    hint:
      "Określa, jak mocno jednostki z MM po stronie sojuszników wzmacniają budżet XP drużyny. " +
      "0 = ignoruj ich, 0.5 = 'pół postaci', 1 = jak pełna postać.",
    scope: "world",
    config: true,
    type: Number,
    default: DEFAULT_ALLY_NPC_WEIGHT,
    range: {
      min: 0,
      max: 2,
      step: 0.05
    }
  });

  // ─────────────────────────────────────────────
  // Domyślny próg trudności budżetu (low / moderate / high)
  // ─────────────────────────────────────────────
  game.settings.register(MODULE_ID, "targetDifficulty", {
    name: "Domyślny poziom trudności budżetu",
    hint:
      "Określa, czy budżet XP drużyny ma być liczony jako niski, umiarkowany czy wysoki. " +
      "Możesz go później zmieniać przyciskami w samym kalkulatorze.",
    scope: "world",
    config: true,
    type: String,
    default: "moderate",
    choices: {
      low: "Niska",
      moderate: "Umiarkowana",
      high: "Wysoka"
    }
  });

  // ─────────────────────────────────────────────
  // Preset kolorów kalkulatora (ciemny / jasny / wysoki kontrast / własne)
  // Klucz MUSI być "colorPreset", bo ui-style.js go używa.
  // ─────────────────────────────────────────────
  game.settings.register(MODULE_ID, "colorPreset", {
    name: "Schemat kolorów kalkulatora",
    hint:
      "Wybierz predefiniowany schemat kolorów (ciemny, jasny, wysoki kontrast) " +
      "lub 'Własne kolory', aby użyć własnych wartości tła i tekstu.",
    scope: "world",
    config: true,
    type: String,
    default: "dark",
    choices: {
      dark: COLOR_PRESETS.dark.name,
      light: COLOR_PRESETS.light.name,
      highContrast: COLOR_PRESETS.highContrast.name,
      custom: COLOR_PRESETS.custom.name
    }
  });

  // ─────────────────────────────────────────────
  // Własny kolor tła (używany tylko gdy preset = "custom")
  // Klucz: "backgroundColor" – używany w ui-style.js.
  // ─────────────────────────────────────────────
  game.settings.register(MODULE_ID, "backgroundColor", {
    name: "Kolor tła kalkulatora (własny)",
    hint:
      "Kolor tła okna kalkulatora, używany gdy schemat kolorów to 'Własne kolory'. " +
      "Podaj dowolną wartość CSS (np. #0b0f18, black, rgb(10,10,20)).",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULT_BG_COLOR
  });

  // ─────────────────────────────────────────────
  // Własny kolor tekstu (używany tylko gdy preset = "custom")
  // Klucz: "textColor" – używany w ui-style.js.
  // ─────────────────────────────────────────────
  game.settings.register(MODULE_ID, "textColor", {
    name: "Kolor tekstu kalkulatora (własny)",
    hint:
      "Kolor tekstu w oknie kalkulatora, używany gdy schemat kolorów to 'Własne kolory'. " +
      "Podaj dowolną wartość CSS (np. #f5f7ff, white, rgb(240,240,255)). " +
      "Upewnij się, że kontrast z tłem jest wysoki.",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULT_TEXT_COLOR
  });

  // ─────────────────────────────────────────────
  // Skala rozmiaru czcionki (0.8–1.4)
  // Klucz: "fontScale" – używany w ui-style.js.
  // ─────────────────────────────────────────────
  game.settings.register(MODULE_ID, "fontScale", {
    name: "Skala rozmiaru czcionki",
    hint:
      "Pozwala powiększyć lub zmniejszyć tekst w oknie kalkulatora. 1.0 = rozmiar standardowy, " +
      "0.8 = mniejszy tekst, 1.4 = większy tekst.",
    scope: "world",
    config: true,
    type: Number,
    default: DEFAULT_FONT_SCALE,
    range: {
      min: 0.8,
      max: 1.4,
      step: 0.05
    }
  });

  // ─────────────────────────────────────────────
  // Tryb dostępności (większe odstępy, większe kontrolki itd.)
  // Klucz: "accessibilityMode" – używany w ui-style.js.
  // ─────────────────────────────────────────────
  game.settings.register(MODULE_ID, "accessibilityMode", {
    name: "Tryb dostępności",
    hint:
      "Włącza większe odstępy, grubsze ramki i powiększa elementy klikalne, aby ułatwić obsługę " +
      "osobom z problemami ze wzrokiem lub motoryką.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // ─────────────────────────────────────────────
  // Ustawienia domyślne popupu „Utwórz Encounter”
  // Te wartości są odczytywane w EncounterCreateDialog.loadEncounterSettings()
  // i trafiają do pól:
  //  - nazwa encountera
  //  - checkbox "Twórz / użyj katalogu"
  //  - nazwa katalogu
  //  - domyślna ilość gold / silver / copper
  // ─────────────────────────────────────────────

  game.settings.register(MODULE_ID, "encounterDefaultName", {
    name: "Domyślna nazwa encountera",
    hint:
      "Ta nazwa pojawi się domyślnie w popupie 'Utwórz encounter'. " +
      "Możesz ją nadpisać przy każdym użyciu.",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULT_ENCOUNTER_NAME
  });

  game.settings.register(MODULE_ID, "encounterUseFolderByDefault", {
    name: "Domyślnie twórz encounter w katalogu",
    hint:
      "Jeśli zaznaczone, popup 'Utwórz encounter' będzie domyślnie zaznaczał " +
      "opcję 'Twórz / użyj katalogu'.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "encounterDefaultFolderName", {
    name: "Domyślna nazwa katalogu encounterów",
    hint:
      "Ten katalog zostanie użyty domyślnie do tworzenia aktorów typu encounter. " +
      "Jeśli nie istnieje, zostanie utworzony.",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULT_ENCOUNTER_FOLDER_NAME
  });

  game.settings.register(MODULE_ID, "encounterDefaultGold", {
    name: "Domyślna ilość gold (GP)",
    hint:
      "Ta wartość pojawi się domyślnie w polu gold w popupie encountera.",
    scope: "world",
    config: true,
    type: Number,
    default: DEFAULT_ENCOUNTER_GOLD
  });

  game.settings.register(MODULE_ID, "encounterDefaultSilver", {
    name: "Domyślna ilość silver (SP)",
    hint:
      "Ta wartość pojawi się domyślnie w polu silver w popupie encountera.",
    scope: "world",
    config: true,
    type: Number,
    default: DEFAULT_ENCOUNTER_SILVER
  });

  game.settings.register(MODULE_ID, "encounterDefaultCopper", {
    name: "Domyślna ilość copper (CP)",
    hint:
      "Ta wartość pojawi się domyślnie w polu copper w popupie encountera.",
    scope: "world",
    config: true,
    type: Number,
    default: DEFAULT_ENCOUNTER_COPPER
  });
    // ─────────────────────────────────────────────
    // Tryb auto-loot z potworów do zakładki „Przedmioty”
    // ─────────────────────────────────────────────
    game.settings.register(MODULE_ID, "autoLootQuantityMode", {
      name: "Tryb auto-loot z potworów",
      hint:
        "Określa, jak kalkulator zbiera ekwipunek potworów do zakładki 'Przedmioty' w popupie 'Utwórz encounter'. " +
        "Wyłączony – brak auto-loot. Z mnożeniem – każdy przeciwnik daje swój ekwipunek. " +
        "Bez mnożenia – jeden komplet ekwipunku na typ potwora.",
      scope: "world",
      config: true,
      type: String,
      choices: {
        off: "Wyłączony",
        perEnemy:
          "Z mnożeniem (każdy przeciwnik daje swój ekwipunek)",
        perActorType:
          "Bez mnożenia (jeden komplet ekwipunku na typ potwora)"
      },
      default: "perEnemy"
    });
  
  // ─────────────────────────────────────────────
  // Autowczytywanie zapisu sojuszników przy otwarciu kalkulatora
  // ─────────────────────────────────────────────
  game.settings.register(MODULE_ID, "autoLoadSavedAllies", {
    name: "Autowczytywanie zapisu sojuszników",
    hint:
      "Jeśli włączone, kalkulator automatycznie wczyta zapisanych sojuszników przy otwarciu.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // ─────────────────────────────────────────────
  // Zapisane presety drużyny / sojuszników (przechowywane w ustawieniach świata)
  // Nie są widoczne w konfiguracji modułu (config: false).
  // ─────────────────────────────────────────────
  game.settings.register(MODULE_ID, "savedTeam", {
    name: "Zapisana drużyna (UUID)",
    scope: "world",
    config: false,
    type: Object,
    default: { uuids: [] }
  });

  game.settings.register(MODULE_ID, "savedAllies", {
    name: "Zapisani sojusznicy (UUID)",
    scope: "world",
    config: false,
    type: Object,
    default: { uuids: [] }
  });
  

  // (Na tym etapie celowo NIE rejestrujemy domyślnych wartości
  // dla platyny / electrum – i NIE importujemy żadnych dodatkowych
  // stałych z config.js, żeby nie powodować błędów runtime.)
}

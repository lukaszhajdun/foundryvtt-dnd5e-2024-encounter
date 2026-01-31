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
 * Mapa konfiguracji wszystkich ustawień modułu.
 * Każdy wpis zawiera kompletną konfigurację dla game.settings.register().
 * Struktura: { key: "settingKey", ...restOfConfig }
 */
const SETTINGS_CONFIG = [
  {
    key: "allyNpcWeight",
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
  },
  {
    key: "targetDifficulty",
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
  },
  {
    key: "colorPreset",
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
  },
  {
    key: "backgroundColor",
    name: "Kolor tła kalkulatora (własny)",
    hint:
      "Kolor tła okna kalkulatora, używany gdy schemat kolorów to 'Własne kolory'. " +
      "Podaj dowolną wartość CSS (np. #0b0f18, black, rgb(10,10,20)).",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULT_BG_COLOR
  },
  {
    key: "textColor",
    name: "Kolor tekstu kalkulatora (własny)",
    hint:
      "Kolor tekstu w oknie kalkulatora, używany gdy schemat kolorów to 'Własne kolory'. " +
      "Podaj dowolną wartość CSS (np. #f5f7ff, white, rgb(240,240,255)). " +
      "Upewnij się, że kontrast z tłem jest wysoki.",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULT_TEXT_COLOR
  },
  {
    key: "fontScale",
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
  },
  {
    key: "accessibilityMode",
    name: "Tryb dostępności",
    hint:
      "Włącza większe odstępy, grubsze ramki i powiększa elementy klikalne, aby ułatwić obsługę " +
      "osobom z problemami ze wzrokiem lub motoryką.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  },
  {
    key: "encounterDefaultName",
    name: "Domyślna nazwa encountera",
    hint:
      "Ta nazwa pojawi się domyślnie w popupie 'Utwórz encounter'. " +
      "Możesz ją nadpisać przy każdym użyciu.",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULT_ENCOUNTER_NAME
  },
  {
    key: "encounterUseFolderByDefault",
    name: "Domyślnie twórz encounter w katalogu",
    hint:
      "Jeśli zaznaczone, popup 'Utwórz encounter' będzie domyślnie zaznaczał " +
      "opcję 'Twórz / użyj katalogu'.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  },
  {
    key: "encounterDefaultFolderName",
    name: "Domyślna nazwa katalogu encounterów",
    hint:
      "Ten katalog zostanie użyty domyślnie do tworzenia aktorów typu encounter. " +
      "Jeśli nie istnieje, zostanie utworzony.",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULT_ENCOUNTER_FOLDER_NAME
  },
  {
    key: "encounterDefaultGold",
    name: "Domyślna ilość gold (GP)",
    hint:
      "Ta wartość pojawi się domyślnie w polu gold w popupie encountera.",
    scope: "world",
    config: true,
    type: Number,
    default: DEFAULT_ENCOUNTER_GOLD
  },
  {
    key: "encounterDefaultSilver",
    name: "Domyślna ilość silver (SP)",
    hint:
      "Ta wartość pojawi się domyślnie w polu silver w popupie encountera.",
    scope: "world",
    config: true,
    type: Number,
    default: DEFAULT_ENCOUNTER_SILVER
  },
  {
    key: "encounterDefaultCopper",
    name: "Domyślna ilość copper (CP)",
    hint:
      "Ta wartość pojawi się domyślnie w polu copper w popupie encountera.",
    scope: "world",
    config: true,
    type: Number,
    default: DEFAULT_ENCOUNTER_COPPER
  },
  {
    key: "autoLootQuantityMode",
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
  },
  {
    key: "autoLoadSavedAllies",
    name: "Autowczytywanie zapisu sojuszników",
    hint:
      "Jeśli włączone, kalkulator automatycznie wczyta zapisanych sojuszników przy otwarciu.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  },
  {
    key: "savedTeam",
    name: "Zapisana drużyna (UUID)",
    scope: "world",
    config: false,
    type: Object,
    default: { uuids: [] }
  },
  {
    key: "savedAllies",
    name: "Zapisani sojusznicy (UUID)",
    scope: "world",
    config: false,
    type: Object,
    default: { uuids: [] }
  }
];

/**
 * Funkcja wywoływana w Hooks.once("init"),
 * która rejestruje wszystkie ustawienia modułu.
 * Iteruje przez SETTINGS_CONFIG i rejestruje każde ustawienie.
 */
export function registerModuleSettings() {
  for (const settingConfig of SETTINGS_CONFIG) {
    const { key, ...config } = settingConfig;
    game.settings.register(MODULE_ID, key, config);
  }
}

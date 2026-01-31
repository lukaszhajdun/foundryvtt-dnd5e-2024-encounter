// scripts/treasure-tables.js

/**
 * Tabele do generowania walut i magicznych przedmiotów.
 * Wszystkie dane są placeholderami – możesz je później podmienić 1:1
 * na dane z DMG 2024 bez żadnych zmian w innych plikach modułu.
 */

/**
 * Podstawowe formuły walut (fallback dla ręcznego rzutu konkretnej waluty).
 * Możesz tu wpisać dowolne formuły Foundry (np. "2d6*10").
 */
export const BASE_CURRENCY_FORMULAS = {
  platinum: {
    formula: "1d4 * 10",
    average: 25
  },
  gold: {
    formula: "2d6 * 10",
    average: 70
  },
  silver: {
    formula: "3d8 * 10",
    average: 135
  },
  copper: {
    formula: "4d10 * 10",
    average: 220
  },
  electrum: {
    formula: "1d6 * 10",
    average: 35
  }
};

/**
 * Tabela Individual Treasure — generowanie waluty zależnej od CR
 * Każdy wpis określa zakres CR, formułę, walutę i średnią wartość.
 */
export const INDIVIDUAL_TREASURE_TABLE = [
  {
    minCR: 0,
    maxCR: 4,
    currency: "gp",
    formula: "3d6",
    average: 10
  },
  {
    minCR: 5,
    maxCR: 10,
    currency: "gp",
    formula: "2d8 * 10",
    average: 90
  },
  {
    minCR: 11,
    maxCR: 16,
    currency: "pp",
    formula: "2d10 * 10",
    average: 110
  },
  {
    minCR: 17,
    maxCR: 99,
    currency: "pp",
    formula: "2d8 * 100",
    average: 900
  }
];

/**
 * Tabela Treasure Hoard — generowanie dużego łupu zależnego od max CR
 */
export const TREASURE_HOARD_TABLE = [
  {
    minCR: 0,
    maxCR: 4,
    currency: "gp",
    formula: "2d4 * 100",
    magicItemsFormula: "1d4 - 1",
    averageGold: 500,
    averageMagic: 1
  },
  {
    minCR: 5,
    maxCR: 10,
    currency: "gp",
    formula: "8d10 * 100",
    magicItemsFormula: "1d3",
    averageGold: 4400,
    averageMagic: 2
  },
  {
    minCR: 11,
    maxCR: 16,
    currency: "gp",
    formula: "8d8 * 1000",
    magicItemsFormula: "1d4",
    averageGold: 36000,
    averageMagic: 2
  },
  {
    minCR: 17,
    maxCR: 99,
    currency: "gp",
    formula: "6d10 * 10000",
    magicItemsFormula: "1d6",
    averageGold: 330000,
    averageMagic: 3
  }
];

/**
 * Pobiera formułę pojedynczej waluty (PP, GP, SP, EP, CP)
 */
export function getCurrencyFormula(currency) {
  return BASE_CURRENCY_FORMULAS[currency]?.formula ?? null;
}

/**
 * Finds the correct Individual Treasure entry based on CR.
 */
export function getIndividualTreasureEntry(cr) {
  return INDIVIDUAL_TREASURE_TABLE.find(
    (entry) => cr >= entry.minCR && cr <= entry.maxCR
  );
}

/**
 * Finds the correct Treasure Hoard entry based on highest CR.
 */
export function getTreasureHoardEntry(maxCr) {
  return TREASURE_HOARD_TABLE.find(
    (entry) => maxCr >= entry.minCR && maxCr <= entry.maxCR
  );
}

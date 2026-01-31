/**
 * TreasureGenerator – serwis do generowania skarbów według reguł D&D 5e 2024.
 *
 * Odpowiada za:
 *  - obliczanie Individual Treasure (na podstawie CR wrogów),
 *  - obliczanie Treasure Hoard (na podstawie najwyższego CR),
 *  - zwracanie konfiguracji formuł i średnich wartości,
 *  - ewaluację rzutów lub średnich wartości.
 *
 * Serwis jest bezstanowy – przyjmuje dane wejściowe (enemies, mode, rollEvaluator)
 * i zwraca wygenerowane skarby bez bezpośredniego dostępu do Foundry API.
 */

/**
 * Generuje Individual Treasure dla listy wrogów.
 *
 * @param {Object} params - parametry generowania
 * @param {Array} params.enemies - tablica wrogów z polami: cr, quantity
 * @param {string} params.mode - tryb: "roll" lub "average"
 * @param {Function} params.rollEvaluator - async (formula) => number (wynik rzutu)
 * @returns {Promise<Object>} - { platinum, gold, silver, copper, electrum }
 */
export async function generateIndividualTreasure({
  enemies = [],
  mode = "average",
  rollEvaluator = null
}) {
  if (!Array.isArray(enemies) || !enemies.length) {
    return { platinum: 0, gold: 0, silver: 0, copper: 0, electrum: 0 };
  }

  if (mode === "roll" && typeof rollEvaluator !== "function") {
    console.error("TreasureGenerator: rollEvaluator must be a function for roll mode");
    return { platinum: 0, gold: 0, silver: 0, copper: 0, electrum: 0 };
  }

  let totalGp = 0;
  let totalPp = 0;

  for (const enemy of enemies) {
    const cr = enemy.cr;
    if (cr == null) continue;

    const cfg = getIndividualTreasureConfig(cr);
    if (!cfg) continue;

    const { formula, average, currency } = cfg;
    const quantity = enemy.quantity ?? 1;

    if (mode === "average") {
      const avgPer = average ?? 0;
      const totalForEnemy = avgPer * quantity;
      if (currency === "pp") totalPp += totalForEnemy;
      else totalGp += totalForEnemy;
    } else {
      if (!formula) continue;

      const expr = quantity > 1 ? `(${formula})*${quantity}` : formula;

      const rolledTotal = await rollEvaluator(expr);
      if (currency === "pp") totalPp += rolledTotal;
      else totalGp += rolledTotal;
    }
  }

  const finalPp = Math.max(0, Math.floor(totalPp));
  const finalGp = Math.max(0, Math.floor(totalGp));

  return {
    platinum: finalPp,
    gold: finalGp,
    silver: 0,
    copper: 0,
    electrum: 0
  };
}

/**
 * Generuje Treasure Hoard dla najwyższego CR.
 *
 * @param {Object} params - parametry generowania
 * @param {number} params.maxCr - najwyższy CR wrogów
 * @param {string} params.mode - tryb: "roll" lub "average"
 * @param {Function} params.rollEvaluator - async (formula) => number (wynik rzutu)
 * @returns {Promise<Object>} - { platinum, gold, silver, copper, electrum, magicItemsCount }
 */
export async function generateTreasureHoard({
  maxCr = 0,
  mode = "average",
  rollEvaluator = null
}) {
  if (maxCr == null || maxCr < 0) {
    return { platinum: 0, gold: 0, silver: 0, copper: 0, electrum: 0, magicItemsCount: 0 };
  }

  const cfg = getTreasureHoardConfig(maxCr);
  if (!cfg) {
    return { platinum: 0, gold: 0, silver: 0, copper: 0, electrum: 0, magicItemsCount: 0 };
  }

  if (mode === "roll" && typeof rollEvaluator !== "function") {
    console.error("TreasureGenerator: rollEvaluator must be a function for roll mode");
    return { platinum: 0, gold: 0, silver: 0, copper: 0, electrum: 0, magicItemsCount: 0 };
  }

  let goldTotal = 0;

  if (mode === "average") {
    goldTotal = cfg.moneyAverage ?? 0;
  } else {
    goldTotal = await rollEvaluator(cfg.moneyFormula);
  }

  let magicCount = 0;
  if (cfg.magicItemsFormula) {
    if (mode === "roll") {
      magicCount = await rollEvaluator(cfg.magicItemsFormula);
    } else {
      // W trybie average możemy użyć średniej z formuły
      // Dla uproszczenia używamy rollEvaluator lub wartość 0
      magicCount = 0;
    }
  }

  return {
    platinum: 0,
    gold: Math.max(0, Math.floor(goldTotal)),
    silver: 0,
    copper: 0,
    electrum: 0,
    magicItemsCount: Math.max(0, Math.floor(magicCount))
  };
}

/**
 * Zwraca konfigurację Individual Treasure dla danego CR.
 *
 * @param {number} cr - Challenge Rating
 * @returns {Object} - { formula, average, currency }
 */
export function getIndividualTreasureConfig(cr) {
  if (cr <= 4) {
    return {
      formula: "3d6",
      average: 10,
      currency: "gp"
    };
  } else if (cr <= 10) {
    return {
      formula: "2d8*10",
      average: 90,
      currency: "gp"
    };
  } else if (cr <= 16) {
    return {
      formula: "2d10*10",
      average: 110,
      currency: "pp"
    };
  } else {
    return {
      formula: "2d8*100",
      average: 900,
      currency: "pp"
    };
  }
}

/**
 * Zwraca konfigurację Treasure Hoard dla danego CR.
 *
 * @param {number} maxCr - najwyższy Challenge Rating
 * @returns {Object} - { moneyFormula, moneyAverage, magicItemsFormula }
 */
export function getTreasureHoardConfig(maxCr) {
  if (maxCr <= 4) {
    return {
      moneyFormula: "2d4*100",
      moneyAverage: 500,
      magicItemsFormula: "1d4-1"
    };
  } else if (maxCr <= 10) {
    return {
      moneyFormula: "8d10*100",
      moneyAverage: 4400,
      magicItemsFormula: "1d3"
    };
  } else if (maxCr <= 16) {
    return {
      moneyFormula: "8d8*1000",
      moneyAverage: 36000,
      magicItemsFormula: "1d4"
    };
  } else {
    return {
      moneyFormula: "6d10*10000",
      moneyAverage: 330000,
      magicItemsFormula: "1d6"
    };
  }
}

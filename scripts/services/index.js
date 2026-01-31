/**
 * Centralne API serwisów modułu.
 *
 * Eksportuje wszystkie serwisy w stylu single file response,
 * aby UI mogło importować je z jednego miejsca.
 */

export {
  calculateDifficulty,
  normalizeEnemyQuantities
} from "./difficulty-calculator.service.js";

export {
  aggregateLootFromEnemies,
  getItemGoldValue
} from "./loot-aggregator.service.js";

export {
  generateIndividualTreasure,
  generateTreasureHoard,
  getIndividualTreasureConfig,
  getTreasureHoardConfig
} from "./treasure-generator.service.js";

/**
 * Centralne API serwisów modułu.
 *
 * Eksportuje wszystkie serwisy w stylu single file response,
 * aby UI mogło importować je z jednego miejsca.
 *
 * Struktura:
 * - core/       - Core logic (difficulty, state, settings, actor factory)
 * - ui/         - UI helpers (dialogs, DOM, forms, callbacks)
 * - data/       - Data processing (loot, treasure, currency, items)
 * - import-export/ - Import/export functionality (allies, encounters, groups)
 */

// ═══════════════════════════════════════════════════════════════
// CORE SERVICES
// ═══════════════════════════════════════════════════════════════

export {
  calculateDifficulty,
  normalizeEnemyQuantities
} from "./core/difficulty-calculator.service.js";

export {
  getTargetDifficulty,
  getDifficultyDisplayMode,
  getAutoLoadSavedAllies,
  getAutoLootQuantityMode,
  getAllyNpcWeight,
  getSavedAllies,
  getSavedTeam,
  setSavedAllies,
  setSavedTeam,
  getEncounterDefaultName,
  getEncounterUseFolderByDefault,
  getEncounterDefaultFolderName,
  getEncounterDefaultGold,
  getEncounterDefaultSilver,
  getEncounterDefaultCopper
} from "./core/settings-repository.service.js";

export {
  createEncounterActor,
  ensureActorFolder
} from "./core/encounter-actor-factory.service.js";

export {
  getActorXp,
  removeEntryFromList,
  addSingleActorToSide,
  updateEnemyQuantity
} from "./core/encounter-state.service.js";

// ═══════════════════════════════════════════════════════════════
// UI SERVICES
// ═══════════════════════════════════════════════════════════════

export {
  formatPlainTextToHtml,
  bindOnce,
  bindOnceAll,
  bindOnceMulti,
  bindOnceAllMulti
} from "./ui/ui-helpers.service.js";

export {
  formatCurrencyValue,
  formatGoldEquivalent,
  normalizeNumberInput,
  validateCurrencyField,
  validateQuantity,
  createCurrencyFieldId,
  sanitizeTextInput,
  computeTotalValue,
  buildCurrencyOptions,
  buildFolderOptions,
  validateEnemiesQuantities,
  computeItemsGoldValue,
  buildCurrencyContext
} from "./ui/form-components.service.js";

export {
  getDefaultDragDropCallbacks,
  prepareDragDropConfig
} from "./ui/callback-factory.service.js";

export {
  queryCurrencyInputs,
  queryFormTextInputs,
  queryItemElements,
  queryItemField
} from "./ui/dom-helpers.service.js";

export {
  styleDialogRoot,
  bindDialogButton,
  bindMultipleDialogButtons,
  validateRollFormula,
  getInputValue,
  resolveAndCloseDialog,
  createDialogActionHandler
} from "./ui/dialog-helpers.service.js";

// ═══════════════════════════════════════════════════════════════
// DATA SERVICES
// ═══════════════════════════════════════════════════════════════

export {
  aggregateLootFromEnemies,
  getItemGoldValue
} from "./data/loot-aggregator.service.js";

export {
  generateIndividualTreasure,
  generateTreasureHoard,
  getIndividualTreasureConfig,
  getTreasureHoardConfig
} from "./data/treasure-generator.service.js";

export {
  getCurrencyLabel,
  getCurrencyLabels,
  rollCurrencyFormula,
  getCurrencySetterMap,
  setCurrencyValue
} from "./data/currency-roller.service.js";

export {
  removeItemById,
  updateItemQuantity,
  validateItemQuantity
} from "./data/item-quantity.service.js";

// ═══════════════════════════════════════════════════════════════
// IMPORT/EXPORT SERVICES
// ═══════════════════════════════════════════════════════════════

export {
  importGroupMembers
} from "./import-export/group-import.service.js";

export {
  importEncounterActor
} from "./import-export/encounter-import.service.js";

export {
  getPcUuids,
  getAllyUuids
} from "./import-export/ally-serializer.service.js";

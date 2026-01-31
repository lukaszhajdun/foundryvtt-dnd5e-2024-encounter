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
} from "./settings-repository.service.js";

export {
  createEncounterActor,
  ensureActorFolder
} from "./encounter-actor-factory.service.js";

export {
  formatPlainTextToHtml,
  bindOnce,
  bindOnceAll,
  bindOnceMulti,
  bindOnceAllMulti
} from "./ui-helpers.service.js";

export {
  getActorXp,
  removeEntryFromList,
  addSingleActorToSide,
  updateEnemyQuantity
} from "./encounter-state.service.js";

export {
  importGroupMembers
} from "./group-import.service.js";

export {
  importEncounterActor
} from "./encounter-import.service.js";

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
} from "./form-components.service.js";
export {
  getDefaultDragDropCallbacks,
  prepareDragDropConfig
} from "./callback-factory.service.js";

export {
  getPcUuids,
  getAllyUuids
} from "./ally-serializer.service.js";

export {
  queryCurrencyInputs,
  queryFormTextInputs,
  queryItemElements,
  queryItemField
} from "./dom-helpers.service.js";

export {
  getCurrencyLabel,
  getCurrencyLabels,
  rollCurrencyFormula,
  getCurrencySetterMap,
  setCurrencyValue
} from "./currency-roller.service.js";

export {
  removeItemById,
  updateItemQuantity,
  validateItemQuantity
} from "./item-quantity.service.js";

export {
  styleDialogRoot,
  bindDialogButton,
  bindMultipleDialogButtons,
  validateRollFormula,
  getInputValue,
  resolveAndCloseDialog,
  createDialogActionHandler
} from "./dialog-helpers.service.js";

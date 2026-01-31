/**
 * DifficultyCalculator – serwis do obliczeń trudności starcia.
 *
 * Odpowiada za:
 *  - normalizację liczby wrogów (quantity),
 *  - obliczanie budżetu XP na podstawie składu drużyny,
 *  - wyliczanie trudności według trybu DMG lub względem budżetu,
 *  - mapowanie poziomów PC i pseudo-poziomów NPC do budżetu XP.
 *
 * Serwis jest bezstanowy i nie korzysta z Foundry API – przyjmuje dane wejściowe
 * i zwraca wynik obliczonej trudności.
 */

import {
  getBudgetRowForLevel,
  getPseudoLevelForNpcXp
} from "../data/xp-budget-2024.js";
import { DEFAULT_ALLY_NPC_WEIGHT } from "../config/constants.js";

/**
 * Normalizuje ilości wrogów (quantity) do zakresu 1–99.
 * Aktualizuje także pole totalXp = xp * quantity dla każdego wroga.
 *
 * @param {Array} enemies - tablica wrogów z polami: xp, quantity, totalXp
 * @returns {Array} - ta sama tablica (mutacja in-place) z znormalizowanymi wartościami
 */
export function normalizeEnemyQuantities(enemies) {
  if (!Array.isArray(enemies)) return enemies;

  for (const enemy of enemies) {
    const baseXp = Number(enemy.xp) || 0;
    let q = Number(enemy.quantity ?? 1) || 1;

    if (q < 1) q = 1;
    if (q > 99) q = 99;

    enemy.quantity = q;
    enemy.totalXp = baseXp * q;
  }

  return enemies;
}

/**
 * Oblicza trudność starcia na podstawie składu drużyny i wrogów.
 *
 * @param {Object} params - parametry obliczenia
 * @param {Array} params.allies - tablica sojuszników (PC i NPC) z polami: type, level, xp
 * @param {Array} params.enemies - tablica wrogów z polami: xp, quantity, totalXp
 * @param {string} params.targetDifficultyKey - próg budżetu: "low", "moderate", "high"
 * @param {string} params.difficultyDisplayMode - tryb wyświetlania: "dmg" lub "budget"
 * @param {number} params.allyNpcWeight - waga sojuszniczych NPC (domyślnie DEFAULT_ALLY_NPC_WEIGHT)
 * @returns {Object} - wynik: { label, targetLabel, budget, totalXP }
 */
export function calculateDifficulty({
  allies = [],
  enemies = [],
  targetDifficultyKey = "moderate",
  difficultyDisplayMode = "dmg",
  allyNpcWeight = DEFAULT_ALLY_NPC_WEIGHT
}) {
  const partyMembers = [];

  // Składamy „logicznych członków drużyny":
  // - PC o konkretnym poziomie,
  // - sojuszniczych NPC jako pseudo-poziomy (z wagą allyNpcWeight).
  for (const ally of allies) {
    if (ally.type === "character") {
      const level = Number(ally.level) || 1;
      partyMembers.push({
        level,
        weight: 1.0,
        source: "pc"
      });
    }

    if (ally.type === "npc") {
      const npcXp = Number(ally.xp) || 0;
      if (npcXp <= 0) continue;
      if (allyNpcWeight <= 0) continue; // Jeśli waga = 0, NPC są ignorowani
      const pseudoLevel = getPseudoLevelForNpcXp(npcXp, "moderate");
      partyMembers.push({
        level: pseudoLevel,
        weight: allyNpcWeight,
        source: "ally-npc"
      });
    }
  }

  // Liczymy całkowite XP wrogów.
  const totalXP = enemies.reduce(
    (sum, e) =>
      sum +
      (Number(
        e.totalXp ?? (Number(e.xp) || 0) * (Number(e.quantity ?? 1) || 1)
      ) || 0),
    0
  );

  if (!partyMembers.length) {
    return {
      label: "Brak drużyny",
      targetLabel: "-",
      budget: 0,
      totalXP
    };
  }

  // Budżety dla całej drużyny na trzy progi.
  const budgets = xpBudgetsForParty(partyMembers);

  // Wybrany próg z UI (Niska / Umiarkowana / Wysoka).
  let targetDifficulty = targetDifficultyKey;
  if (!["low", "moderate", "high"].includes(targetDifficulty)) {
    targetDifficulty = "moderate";
  }

  const budget = budgets[targetDifficulty] ?? 0;

  // Tryb wyświetlania trudności.
  let mode = difficultyDisplayMode;
  if (mode !== "budget" && mode !== "dmg") {
    mode = "dmg";
  }

  let label;
  if (mode === "budget") {
    // Trudność względem WYBRANEGO budżetu (a nie stałych progów).
    label = labelRelativeToBudget(totalXP, budget);
  } else {
    // Klasyczna trudność DMG – wg progów low/moderate/high.
    label = labelClassicDmg(totalXP, budgets);
  }

  return {
    label,
    targetLabel: difficultyName(targetDifficulty),
    budget,
    totalXP
  };
}

/**
 * Zwraca czytelną nazwę progu trudności (do „Budowane pod trudność").
 *
 * @param {string} diffKey - klucz trudności: "low", "moderate", "high"
 * @returns {string} - nazwa w języku polskim
 */
function difficultyName(diffKey) {
  switch (diffKey) {
    case "low":
      return "Niską";
    case "moderate":
      return "Umiarkowaną";
    case "high":
      return "Wysoką";
    default:
      return diffKey;
  }
}

/**
 * Sumuje budżety XP dla całej drużyny (poziomy + wagi).
 *
 * @param {Array} partyMembers - tablica członków drużyny z polami: level, weight
 * @returns {Object} - budżety: { low, moderate, high }
 */
function xpBudgetsForParty(partyMembers) {
  const totals = {
    low: 0,
    moderate: 0,
    high: 0
  };

  for (const member of partyMembers) {
    const row = getBudgetRowForLevel(member.level);
    const weight = Number(member.weight) || 1.0;

    totals.low += row.low * weight;
    totals.moderate += row.moderate * weight;
    totals.high += row.high * weight;
  }

  return {
    low: Math.round(totals.low),
    moderate: Math.round(totals.moderate),
    high: Math.round(totals.high)
  };
}

/**
 * Klasyczna trudność wg DMG:
 *  - totalXP <= low      → „Niskie"
 *  - <= moderate         → „Umiarkowane"
 *  - <= high             → „Wysokie"
 *  - > high              → „Ekstremalne"
 *
 * @param {number} totalXP - suma XP wrogów
 * @param {Object} budgets - budżety: { low, moderate, high }
 * @returns {string} - etykieta trudności
 */
function labelClassicDmg(totalXP, budgets) {
  if (!totalXP) return "Brak wrogów";
  if (!budgets) return "Brak budżetu";

  const low = Number(budgets.low ?? 0) || 0;
  const moderate = Number(budgets.moderate ?? 0) || 0;
  const high = Number(budgets.high ?? 0) || 0;

  if (low <= 0 && moderate <= 0 && high <= 0) {
    return "Brak budżetu";
  }

  if (totalXP <= low) return "Niskie";
  if (totalXP <= moderate) return "Umiarkowane";
  if (totalXP <= high) return "Wysokie";
  return "Ekstremalne";
}

/**
 * Trudność względem wybranego budżetu docelowego.
 *
 * - totalXP – suma XP wrogów,
 * - budget  – budżet XP dla wybranego progu (Niska / Umiarkowana / Wysoka).
 *
 * Zwraca etykiety w stylu:
 *  - „Brak wrogów"
 *  - „Brak budżetu"
 *  - „Poniżej budżetu"
 *  - „W zakresie budżetu"
 *  - „Powyżej budżetu"
 *  - „Znacznie powyżej budżetu"
 *
 * @param {number} totalXP - suma XP wrogów
 * @param {number} budget - budżet XP dla wybranego progu
 * @returns {string} - etykieta trudności
 */
function labelRelativeToBudget(totalXP, budget) {
  if (!totalXP) return "Brak wrogów";
  if (!budget) return "Brak budżetu";

  const ratio = totalXP / budget;

  // Progi można później doprecyzować; obecnie:
  // < 0.75    → poniżej
  // 0.75–1.25 → w zakresie
  // 1.25–1.75 → powyżej
  // > 1.75    → znacznie powyżej
  if (ratio < 0.75) return "Poniżej budżetu";
  if (ratio <= 1.25) return "W zakresie budżetu";
  if (ratio <= 1.75) return "Powyżej budżetu";
  return "Znacznie powyżej budżetu";
}

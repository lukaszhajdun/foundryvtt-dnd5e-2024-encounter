// scripts/xp-budget-2024.js

/**
 * Tabela budżetów XP na JEDNĄ postać, w stylu zasad DMG 2024.
 *
 * Klucz: poziom postaci (1–20)
 * Wartość: obiekt z progami dla różnych poziomów trudności:
 *   - low      – łatwe starcie
 *   - moderate – umiarkowane (najczęściej używany próg „docelowy”)
 *   - high     – trudne
 *
 * UWAGA (BARDZO WAŻNE):
 *  - To są PRZYKŁADOWE wartości o zbliżonej skali.
 *  - NIE są to oficjalne liczby z DMG 2024.
 *  - Jeśli chcesz używać oficjalnych danych:
 *      1) otwórz ten plik,
 *      2) podmień liczby low/moderate/high dla każdego poziomu.
 *
 * Wartości są tak dobrane, aby:
 *  - rosły mniej więcej wykładniczo / liniowo w górnych poziomach,
 *  - nadawały się do przeliczania „pseudo-poziomu” z XP sojusznika.
 */
export const XP_BUDGET_2024 = {
    1:  { low: 50,   moderate: 75,   high: 100   },
    2:  { low: 100,  moderate: 150,  high: 200   },
    3:  { low: 150,  moderate: 225,  high: 400   },
    4:  { low: 250,  moderate: 375,  high: 500   },
    5:  { low: 500,  moderate: 750,  high: 1100  },
    6:  { low: 600,  moderate: 1000, high: 1400  },
    7:  { low: 750,  moderate: 1300, high: 1700  },
    8:  { low: 1000, moderate: 1700, high: 2100  },
    9:  { low: 1300, moderate: 2000, high: 2600  },
    10: { low: 1600, moderate: 2300, high: 3100  },
    11: { low: 1900, moderate: 2900, high: 4100  },
    12: { low: 2200, moderate: 3700, high: 4700  },
    13: { low: 2600, moderate: 4200, high: 5400  },
    14: { low: 2900, moderate: 4900, high: 6200  },
    15: { low: 3300, moderate: 5400, high: 7800  },
    16: { low: 3800, moderate: 6100, high: 9800  },
    17: { low: 4500, moderate: 7200, high: 11700 },
    18: { low: 5000, moderate: 8700, high: 14200 },
    19: { low: 5500, moderate: 10700, high: 17200 },
    20: { low: 6400, moderate: 13200, high: 22000 }
};

/**
 * Pomocnicza funkcja – zwraca wiersz tabeli budżetowej dla podanego poziomu.
 *
 * @param {number} level - poziom postaci (może być spoza zakresu 1–20).
 * @returns {{ low: number, moderate: number, high: number }} wiersz z tabeli.
 *
 * Działanie:
 *  - poziom jest przycinany do zakresu [1, 20],
 *  - jeśli level jest np. 0 lub null → dostaniesz wiersz dla poziomu 1,
 *  - jeśli level > 20 → dostaniesz wiersz dla 20.
 *
 * Dzięki temu:
 *  - logika po stronie kalkulatora jest prostsza,
 *  - nie musimy się martwić o poziomy „out of range”.
 */
export function getBudgetRowForLevel(level) {
  const clamped = Math.max(1, Math.min(20, Number(level) || 1));
  return XP_BUDGET_2024[clamped];
}

/**
 * Oblicza „pseudo-poziom” (pseudo-level) dla sojuszniczego NPC
 * na podstawie jego XP ze statbloku (system.details.xp.value).
 *
 * Idea:
 *  - DMG 2024 pracuje na budżecie XP „na postać”.
 *  - NPC/sojusznik z MM ma tylko CR i XP, brak poziomu.
 *  - Chcemy przybliżyć: „Na ile poziomów postaci odpowiada taki NPC?”
 *
 * Algorytm:
 *  1. Bierzemy tabelę XP_BUDGET_2024.
 *  2. Dla wybranego progu trudności (domyślnie "moderate"):
 *      - patrzymy, jaka wartość budżetu XP przypada na każdy poziom.
 *  3. Szukamy takiego poziomu, dla którego budżet jest NAJBLIŻSZY XP NPC:
 *      - liczymy |budget[level] - npcXp|,
 *      - wybieramy poziom o najmniejszej różnicy.
 *
 * To oznacza:
 *  - NPC o XP zbliżonym do budżetu moderate na 5 poziom trafi jako pseudo-level ~5.
 *  - Jeśli XP NPC wyjdzie mocno poza tabelę (np. bardzo małe lub bardzo duże),
 *    pseudo-poziom zostanie naturalnie przycięty do 1 lub 20.
 *
 * Możesz zmienić:
 *  - difficultyKey (np. "low" lub "high") – wtedy pseudo-level będzie liczony
 *    względem innego progu.
 *
 * @param {number} npcXp - XP sojuszniczego NPC z MM.
 * @param {"low"|"moderate"|"high"} [difficultyKey="moderate"]
 * @returns {number} pseudo-level w zakresie 1–20
 */
export function getPseudoLevelForNpcXp(npcXp, difficultyKey = "moderate") {
  // Jeśli XP jest nieprawidłowe lub nieistotne – traktujemy NPC jak 1 poziom.
  const xp = Number(npcXp) || 0;
  if (xp <= 0) return 1;

  // Wyciągamy wszystkie [level, row] z tabeli.
  const entries = Object.entries(XP_BUDGET_2024);

  // Jeśli ktoś podał dziwny klucz trudności, zabezpieczamy się fallbackiem.
  const validDifficulty =
    difficultyKey === "low" ||
    difficultyKey === "high" ||
    difficultyKey === "moderate"
      ? difficultyKey
      : "moderate";

  let bestLevel = 1;
  let bestDiff = Infinity;

  // Przechodzimy po wszystkich poziomach z tabeli i szukamy budżetu
  // najbliższego XP naszej jednostki.
  for (const [levelStr, row] of entries) {
    const lvl = Number(levelStr);
    const budget = row[validDifficulty];

    // Różnica między „mocą” NPC (jego XP) a budżetem na postać.
    const diff = Math.abs(budget - xp);

    // Jeśli ta różnica jest mniejsza od dotychczasowej – aktualizujemy wynik.
    if (diff < bestDiff) {
      bestDiff = diff;
      bestLevel = lvl;
    }
  }

  // Zwracamy znaleziony pseudo-level (i tak jest w zakresie 1–20).
  return bestLevel;
}

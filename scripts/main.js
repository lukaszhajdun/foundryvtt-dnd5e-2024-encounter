// scripts/main.js

/**
 * Punkt wejścia modułu.
 * Importuje i inicjalizuje wszystkie moduły bootstrapowe.
 */

import { initializeSettings } from "./initialization/register-settings.js";
import { initializeApp } from "./initialization/register-app.js";
import { initializeSceneControls } from "./initialization/register-buttons.js";

// Inicjalizacja wszystkich komponentów modułu
initializeSettings();
initializeApp();
initializeSceneControls();

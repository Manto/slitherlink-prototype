// ============================================
// SLITHERLINK GAME - ENTRY POINT
// ============================================
// 
// This file structure separates concerns:
// - boardLogic.js: Pure computation (worker code, validation)
// - squareGame.js: Square grid game class
// - hexGame.js: Hexagonal grid game class
// - gameController.js: Game type switching and UI management
// - game.js: Entry point (this file)
//
// ============================================

import { GameController } from './gameController.js?v=1.0.0';
import { initTutorialDiagrams } from './tutorialDiagrams.js';

// Initialize game controller when page loads
window.addEventListener('DOMContentLoaded', () => {
    initTutorialDiagrams();
    new GameController();
});

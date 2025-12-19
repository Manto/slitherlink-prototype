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

import { initTutorialDiagrams } from './tutorialDiagrams.js';
import { GameController } from './gameController.js';

// Initialize game controller when page loads
function init() {
    initTutorialDiagrams();
    new GameController();
}

// Handle both cases: script loaded before or after DOMContentLoaded
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
} else {
    // DOM already loaded, run immediately
    init();
}

// ============================================
// GAME CONTROLLER
// Manages switching between game types
// ============================================

import { SlitherlinkGame } from './squareGame.js?v=1.0.0';
import { HexSlitherlink } from './hexGame.js?v=1.0.0';

export class GameController {
    constructor() {
        this.currentGame = null;
        this.currentType = 'square';
        this.sharedWorker = null;
        this.sharedWorkerUrl = null;
        
        this.init();
    }
    
    init() {
        // Initialize with square game (it creates its own worker)
        this.currentGame = new SlitherlinkGame('gameCanvas');
        this.sharedWorker = this.currentGame.puzzleWorker;
        this.sharedWorkerUrl = this.currentGame.workerUrl;
        
        // Setup board type selector
        document.getElementById('boardType').addEventListener('change', (e) => {
            this.switchBoardType(e.target.value);
        });
        
        // Setup hex size selector
        document.getElementById('hexBoardSize').addEventListener('change', () => {
            if (this.currentType === 'hexagonal' && this.currentGame) {
                this.currentGame.handleBoardSizeChange();
            }
        });
    }
    
    switchBoardType(type) {
        this.currentType = type;
        
        // Show/hide appropriate size selector
        const squareSelector = document.getElementById('squareSizeSelector');
        const hexSelector = document.getElementById('hexSizeSelector');
        
        // Destroy the old game instance before creating a new one
        if (this.currentGame) {
            this.currentGame.destroy();
            this.currentGame = null;
        }
        
        // Clean up shared worker references
        this.sharedWorker = null;
        this.sharedWorkerUrl = null;
        
        if (type === 'square') {
            squareSelector.style.display = 'flex';
            hexSelector.style.display = 'none';
            
            // Create new square game
            this.currentGame = new SlitherlinkGame('gameCanvas');
            this.sharedWorker = this.currentGame.puzzleWorker;
            this.sharedWorkerUrl = this.currentGame.workerUrl;
            
        } else if (type === 'hexagonal') {
            squareSelector.style.display = 'none';
            hexSelector.style.display = 'flex';
            
            // Create new hex game
            this.currentGame = new HexSlitherlink('gameCanvas', null);
            this.sharedWorker = this.currentGame.worker;
            this.sharedWorkerUrl = this.currentGame.workerUrl;
        }
        
        // Rebind button handlers
        this.rebindButtons();
    }
    
    rebindButtons() {
        // Remove old listeners by replacing elements
        const clearBtn = document.getElementById('clearBtn');
        const checkBtn = document.getElementById('checkBtn');
        const showSolutionBtn = document.getElementById('showSolutionBtn');
        const newPuzzleBtn = document.getElementById('newPuzzleBtn');
        
        const newClearBtn = clearBtn.cloneNode(true);
        const newCheckBtn = checkBtn.cloneNode(true);
        const newShowSolutionBtn = showSolutionBtn.cloneNode(true);
        const newNewPuzzleBtn = newPuzzleBtn.cloneNode(true);
        
        clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
        checkBtn.parentNode.replaceChild(newCheckBtn, checkBtn);
        showSolutionBtn.parentNode.replaceChild(newShowSolutionBtn, showSolutionBtn);
        newPuzzleBtn.parentNode.replaceChild(newNewPuzzleBtn, newPuzzleBtn);
        
        newClearBtn.addEventListener('click', () => this.currentGame.clearBoard());
        newCheckBtn.addEventListener('click', () => this.currentGame.checkSolution());
        newShowSolutionBtn.addEventListener('click', () => this.currentGame.showSolution());
        newNewPuzzleBtn.addEventListener('click', () => this.currentGame.nextPuzzle());
        
        // Rebind size selector for square
        if (this.currentType === 'square') {
            const boardSizeSelect = document.getElementById('boardSize');
            const newBoardSizeSelect = boardSizeSelect.cloneNode(true);
            boardSizeSelect.parentNode.replaceChild(newBoardSizeSelect, boardSizeSelect);
            newBoardSizeSelect.addEventListener('change', () => this.currentGame.handleBoardSizeChange());
        }
    }
}


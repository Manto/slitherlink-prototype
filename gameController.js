// ============================================
// GAME CONTROLLER
// Manages switching between game types
// ============================================

import { SlitherlinkGame } from './squareGame.js';
import { HexSlitherlink } from './hexGame.js';

export class GameController {
    constructor() {
        this.currentGame = null;
        this.currentType = 'square';
        this.sharedWorker = null;
        this.sharedWorkerUrl = null;

        this.init();
        this.setupSolvedModal();
    }
    
    init() {
        // Store global reference for solved modal access
        window.gameControllerInstance = this;

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
            
            // Reset hex dropdown to first option (2 per side)
            document.getElementById('hexBoardSize').value = '1';
            
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

    setupSolvedModal() {
        const modal = document.getElementById('solvedModal');
        const closeBtn = document.getElementById('closeSolvedBtn');
        const playAgainBtn = document.getElementById('playAgainBtn');

        // Close modal when clicking the close button
        closeBtn.addEventListener('click', () => {
            this.hideSolvedModal();
        });

        // Close modal when clicking outside the modal content
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideSolvedModal();
            }
        });

        // Play again button
        playAgainBtn.addEventListener('click', () => {
            this.hideSolvedModal();
            this.currentGame.nextPuzzle();
        });

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                this.hideSolvedModal();
            }
        });
    }

    showSolvedModal() {
        const modal = document.getElementById('solvedModal');
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');

        // Focus the play again button for accessibility
        document.getElementById('playAgainBtn').focus();
    }

    hideSolvedModal() {
        const modal = document.getElementById('solvedModal');
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }
}


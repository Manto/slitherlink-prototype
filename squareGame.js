// ============================================
// SQUARE GRID SLITHERLINK GAME
// ============================================

import { VERSION } from './version.js';
import {
    createInlineWorker,
    destroyWorker,
    checkSquareNumbers,
    checkSquareLoop
} from './boardLogic.js?v=1.0.1';

export class SlitherlinkGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Grid settings
        this.cellSize = 60;
        this.dotRadius = 5;
        this.lineWidth = 4;
        this.padding = 30;

        // Initialize Web Worker
        const { worker, workerUrl } = createInlineWorker();
        this.puzzleWorker = worker;
        this.workerUrl = workerUrl;
        this.puzzleWorker.onmessage = (e) => this.handleWorkerResponse(e.data);

        // Store bound event handlers for cleanup
        this._boundHandlers = null;

        // Initialize with default board size (5x5)
        this.setBoardSize(5);
        this.solution = null;

        this.setupCanvas();
        this.setupEventListeners();
        this.draw();

        // Generate initial puzzle
        this.showMessage('Generating puzzle...', 'info');
        console.log('Starting initial puzzle generation...');
        const size = this.getSelectedBoardSize();
        this.puzzleWorker.postMessage({ type: 'square', width: size, height: size });
    }

    setBoardSize(size) {
        this.gridWidth = size;
        this.gridHeight = size;
        this.numbers = Array(size).fill(null).map(() => Array(size).fill(null));

        // Initialize edge states
        this.horizontalEdges = Array(size + 1).fill(null)
            .map(() => Array(size).fill(0));
        this.verticalEdges = Array(size).fill(null)
            .map(() => Array(size + 1).fill(0));
    }

    getSelectedBoardSize() {
        const select = document.getElementById('boardSize');
        return parseInt(select.value);
    }

    destroy() {
        // Remove canvas event listeners
        if (this._boundHandlers && this.canvas) {
            this.canvas.removeEventListener('click', this._boundHandlers.canvasClick);
            this.canvas.removeEventListener('contextmenu', this._boundHandlers.canvasContextMenu);
        }

        // Remove DOM element event listeners
        if (this._boundHandlers) {
            const boardSize = document.getElementById('boardSize');
            const clearBtn = document.getElementById('clearBtn');
            const checkBtn = document.getElementById('checkBtn');
            const showSolutionBtn = document.getElementById('showSolutionBtn');
            const newPuzzleBtn = document.getElementById('newPuzzleBtn');

            if (boardSize) boardSize.removeEventListener('change', this._boundHandlers.boardSizeChange);
            if (clearBtn) clearBtn.removeEventListener('click', this._boundHandlers.clearClick);
            if (checkBtn) checkBtn.removeEventListener('click', this._boundHandlers.checkClick);
            if (showSolutionBtn) showSolutionBtn.removeEventListener('click', this._boundHandlers.showSolutionClick);
            if (newPuzzleBtn) newPuzzleBtn.removeEventListener('click', this._boundHandlers.newPuzzleClick);
        }

        this._boundHandlers = null;

        // Terminate worker and revoke blob URL
        destroyWorker(this.puzzleWorker, this.workerUrl);
        this.puzzleWorker = null;
        this.workerUrl = null;
    }

    // ============================================
    // CANVAS SETUP & DRAWING
    // ============================================

    setupCanvas() {
        const width = this.gridWidth * this.cellSize + 2 * this.padding;
        const height = this.gridHeight * this.cellSize + 2 * this.padding;
        this.canvas.width = width;
        this.canvas.height = height;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw cell backgrounds
        this.ctx.fillStyle = '#fafafa';
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                const x = this.padding + col * this.cellSize;
                const y = this.padding + row * this.cellSize;
                this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
            }
        }

        // Draw numbers
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#333';

        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                const num = this.numbers[row][col];
                if (num !== null) {
                    const x = this.padding + (col + 0.5) * this.cellSize;
                    const y = this.padding + (row + 0.5) * this.cellSize;
                    this.ctx.fillText(num.toString(), x, y);
                }
            }
        }

        // Draw dots at vertices
        this.ctx.fillStyle = '#000';
        for (let row = 0; row <= this.gridHeight; row++) {
            for (let col = 0; col <= this.gridWidth; col++) {
                const x = this.padding + col * this.cellSize;
                const y = this.padding + row * this.cellSize;
                this.ctx.beginPath();
                this.ctx.arc(x, y, this.dotRadius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // Draw horizontal edges
        for (let row = 0; row <= this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                const state = this.horizontalEdges[row][col];
                const x1 = this.padding + col * this.cellSize;
                const x2 = this.padding + (col + 1) * this.cellSize;
                const y = this.padding + row * this.cellSize;

                if (state === 1) {
                    this.ctx.strokeStyle = '#000';
                    this.ctx.lineWidth = this.lineWidth;
                    this.ctx.lineCap = 'round';
                    this.ctx.beginPath();
                    this.ctx.moveTo(x1, y);
                    this.ctx.lineTo(x2, y);
                    this.ctx.stroke();
                } else if (state === 2) {
                    this.drawX(x1 + this.cellSize / 2, y, 8);
                }
            }
        }

        // Draw vertical edges
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col <= this.gridWidth; col++) {
                const state = this.verticalEdges[row][col];
                const x = this.padding + col * this.cellSize;
                const y1 = this.padding + row * this.cellSize;
                const y2 = this.padding + (row + 1) * this.cellSize;

                if (state === 1) {
                    this.ctx.strokeStyle = '#000';
                    this.ctx.lineWidth = this.lineWidth;
                    this.ctx.lineCap = 'round';
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y1);
                    this.ctx.lineTo(x, y2);
                    this.ctx.stroke();
                } else if (state === 2) {
                    this.drawX(x, y1 + this.cellSize / 2, 8);
                }
            }
        }
    }

    drawX(x, y, size) {
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x - size, y - size);
        this.ctx.lineTo(x + size, y + size);
        this.ctx.moveTo(x + size, y - size);
        this.ctx.lineTo(x - size, y + size);
        this.ctx.stroke();
    }

    // ============================================
    // EVENT HANDLING
    // ============================================

    setupEventListeners() {
        // Create bound handlers that can be removed later
        this._boundHandlers = {
            canvasClick: (e) => this.handleClick(e, 'left'),
            canvasContextMenu: (e) => {
                e.preventDefault();
                this.handleClick(e, 'right');
            },
            boardSizeChange: () => this.handleBoardSizeChange(),
            clearClick: () => this.clearBoard(),
            checkClick: () => this.checkSolution(),
            showSolutionClick: () => this.showSolution(),
            newPuzzleClick: () => this.nextPuzzle()
        };

        this.canvas.addEventListener('click', this._boundHandlers.canvasClick);
        this.canvas.addEventListener('contextmenu', this._boundHandlers.canvasContextMenu);

        document.getElementById('boardSize').addEventListener('change', this._boundHandlers.boardSizeChange);
        document.getElementById('clearBtn').addEventListener('click', this._boundHandlers.clearClick);
        document.getElementById('checkBtn').addEventListener('click', this._boundHandlers.checkClick);
        document.getElementById('showSolutionBtn').addEventListener('click', this._boundHandlers.showSolutionClick);
        document.getElementById('newPuzzleBtn').addEventListener('click', this._boundHandlers.newPuzzleClick);
    }

    handleClick(e, button) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const edge = this.getEdgeFromPosition(x, y);

        if (edge) {
            if (edge.type === 'horizontal') {
                const currentState = this.horizontalEdges[edge.row][edge.col];
                if (button === 'left') {
                    this.horizontalEdges[edge.row][edge.col] = currentState === 1 ? 0 : 1;
                } else {
                    this.horizontalEdges[edge.row][edge.col] = currentState === 2 ? 0 : 2;
                }
            } else {
                const currentState = this.verticalEdges[edge.row][edge.col];
                if (button === 'left') {
                    this.verticalEdges[edge.row][edge.col] = currentState === 1 ? 0 : 1;
                } else {
                    this.verticalEdges[edge.row][edge.col] = currentState === 2 ? 0 : 2;
                }
            }
            this.draw();
        }
    }

    getEdgeFromPosition(x, y) {
        const threshold = 15;

        // Check horizontal edges
        for (let row = 0; row <= this.gridHeight; row++) {
            const edgeY = this.padding + row * this.cellSize;
            if (Math.abs(y - edgeY) < threshold) {
                for (let col = 0; col < this.gridWidth; col++) {
                    const x1 = this.padding + col * this.cellSize;
                    const x2 = this.padding + (col + 1) * this.cellSize;
                    if (x > x1 - threshold && x < x2 + threshold) {
                        return { type: 'horizontal', row, col };
                    }
                }
            }
        }

        // Check vertical edges
        for (let row = 0; row < this.gridHeight; row++) {
            const y1 = this.padding + row * this.cellSize;
            const y2 = this.padding + (row + 1) * this.cellSize;
            for (let col = 0; col <= this.gridWidth; col++) {
                const edgeX = this.padding + col * this.cellSize;
                if (Math.abs(x - edgeX) < threshold &&
                    y > y1 - threshold && y < y2 + threshold) {
                    return { type: 'vertical', row, col };
                }
            }
        }

        return null;
    }

    // ============================================
    // GAME ACTIONS
    // ============================================

    handleBoardSizeChange() {
        const newSize = this.getSelectedBoardSize();
        this.setBoardSize(newSize);
        this.setupCanvas();
        this.nextPuzzle();
    }

    clearBoard() {
        this.horizontalEdges = Array(this.gridHeight + 1).fill(null)
            .map(() => Array(this.gridWidth).fill(0));
        this.verticalEdges = Array(this.gridHeight).fill(null)
            .map(() => Array(this.gridWidth + 1).fill(0));
        this.draw();
        this.showMessage('Board cleared!', 'info');
    }

    showSolution() {
        if (!this.solution) {
            this.showMessage('No solution available. Generate a new puzzle first!', 'error');
            return;
        }

        for (let row = 0; row <= this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                this.horizontalEdges[row][col] = this.solution.horizontal[row][col];
            }
        }

        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col <= this.gridWidth; col++) {
                this.verticalEdges[row][col] = this.solution.vertical[row][col];
            }
        }

        this.draw();
        this.showMessage('Solution displayed!', 'success');
    }

    nextPuzzle() {
        this.showMessage('Generating puzzle...', 'info');
        console.log('Starting puzzle generation in worker...');
        const size = this.getSelectedBoardSize();
        this.puzzleWorker.postMessage({ type: 'square', width: size, height: size });
    }

    // ============================================
    // PUZZLE HANDLING
    // ============================================

    handleWorkerResponse(newPuzzle) {
        if (newPuzzle.type !== 'square') return;
        
        console.log('Received puzzle from worker!');

        this.gridWidth = newPuzzle.width;
        this.gridHeight = newPuzzle.height;
        this.numbers = newPuzzle.numbers;
        this.solution = newPuzzle.solution;

        this.horizontalEdges = Array(this.gridHeight + 1).fill(null)
            .map(() => Array(this.gridWidth).fill(0));
        this.verticalEdges = Array(this.gridHeight).fill(null)
            .map(() => Array(this.gridWidth + 1).fill(0));

        this.setupCanvas();
        this.draw();
        this.showMessage('New puzzle generated!', 'info');
    }

    // ============================================
    // SOLUTION VALIDATION
    // ============================================

    checkSolution() {
        const numbersValid = checkSquareNumbers(
            this.numbers, 
            this.horizontalEdges, 
            this.verticalEdges, 
            this.gridWidth, 
            this.gridHeight
        );
        
        if (!numbersValid) {
            this.showMessage('Numbers constraint violated! Check the number of lines around each number.', 'error');
            return;
        }

        const loopValid = checkSquareLoop(
            this.horizontalEdges, 
            this.verticalEdges, 
            this.gridWidth, 
            this.gridHeight
        );
        
        if (!loopValid) {
            this.showMessage('Must form a single continuous loop with no branches!', 'error');
            return;
        }

        this.showMessage('Congratulations! Puzzle solved correctly! 🎉', 'success');
    }

    // ============================================
    // UI HELPERS
    // ============================================

    showMessage(text, type) {
        const messageEl = document.getElementById('message');
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;

        if (type === 'info') {
            setTimeout(() => {
                messageEl.textContent = '';
                messageEl.className = 'message';
            }, 3000);
        }
    }
}


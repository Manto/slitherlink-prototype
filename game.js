class SlitherlinkGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Grid settings
        this.cellSize = 60;
        this.dotRadius = 5;
        this.lineWidth = 4;
        this.padding = 30; // Padding around the grid

        // Current puzzle
        this.currentPuzzleIndex = 0;

        // Initialize with the puzzle from the image
        this.puzzles = [
            {
                width: 6,
                height: 6,
                numbers: [
                    [null, null, null, 2, null, null],
                    [null, 2, 2, 2, null, 2],
                    [null, 0, null, null, 2, null],
                    [null, 2, null, 2, 0, null],
                    [null, null, null, null, 3, null],
                    [null, null, null, null, null, null]
                ]
            },
            // Additional puzzle for variety
            {
                width: 5,
                height: 5,
                numbers: [
                    [null, 2, null, 2, null],
                    [3, null, null, null, 2],
                    [null, null, 2, null, null],
                    [2, null, null, null, 3],
                    [null, 2, null, 2, null]
                ]
            }
        ];

        this.loadPuzzle(this.currentPuzzleIndex);
        this.setupCanvas();
        this.setupEventListeners();
        this.draw();
    }

    loadPuzzle(index) {
        const puzzle = this.puzzles[index];
        this.gridWidth = puzzle.width;
        this.gridHeight = puzzle.height;
        this.numbers = puzzle.numbers;

        // Initialize edge states
        // 0 = empty, 1 = line, 2 = X mark
        this.horizontalEdges = Array(this.gridHeight + 1).fill(null)
            .map(() => Array(this.gridWidth).fill(0));
        this.verticalEdges = Array(this.gridHeight).fill(null)
            .map(() => Array(this.gridWidth + 1).fill(0));
    }

    setupCanvas() {
        const width = this.gridWidth * this.cellSize + 2 * this.padding;
        const height = this.gridHeight * this.cellSize + 2 * this.padding;
        this.canvas.width = width;
        this.canvas.height = height;
    }

    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e, 'left'));
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.handleClick(e, 'right');
        });

        document.getElementById('clearBtn').addEventListener('click', () => this.clearBoard());
        document.getElementById('checkBtn').addEventListener('click', () => this.checkSolution());
        document.getElementById('newPuzzleBtn').addEventListener('click', () => this.nextPuzzle());
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
                    // Toggle between empty and line
                    this.horizontalEdges[edge.row][edge.col] = currentState === 1 ? 0 : 1;
                } else {
                    // Toggle between empty and X
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

        // Check horizontal edges (between dots on the same row)
        for (let row = 0; row <= this.gridHeight; row++) {
            const edgeY = this.padding + row * this.cellSize;  // Y position of the dots
            if (Math.abs(y - edgeY) < threshold) {
                for (let col = 0; col < this.gridWidth; col++) {
                    const x1 = this.padding + col * this.cellSize;
                    const x2 = this.padding + (col + 1) * this.cellSize;
                    const centerX = (x1 + x2) / 2;
                    if (x > x1 - threshold && x < x2 + threshold) {
                        return { type: 'horizontal', row, col };
                    }
                }
            }
        }

        // Check vertical edges (between dots on the same column)
        for (let row = 0; row < this.gridHeight; row++) {
            const y1 = this.padding + row * this.cellSize;
            const y2 = this.padding + (row + 1) * this.cellSize;
            const centerY = (y1 + y2) / 2;
            for (let col = 0; col <= this.gridWidth; col++) {
                const edgeX = this.padding + col * this.cellSize;  // X position of the dots
                if (Math.abs(x - edgeX) < threshold &&
                    y > y1 - threshold && y < y2 + threshold) {
                    return { type: 'vertical', row, col };
                }
            }
        }

        return null;
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid cells (light background)
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

        // Draw dots
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
                    // Draw line
                    this.ctx.strokeStyle = '#000';
                    this.ctx.lineWidth = this.lineWidth;
                    this.ctx.lineCap = 'round';
                    this.ctx.beginPath();
                    this.ctx.moveTo(x1, y);
                    this.ctx.lineTo(x2, y);
                    this.ctx.stroke();
                } else if (state === 2) {
                    // Draw X
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
                    // Draw line
                    this.ctx.strokeStyle = '#000';
                    this.ctx.lineWidth = this.lineWidth;
                    this.ctx.lineCap = 'round';
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y1);
                    this.ctx.lineTo(x, y2);
                    this.ctx.stroke();
                } else if (state === 2) {
                    // Draw X
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

    clearBoard() {
        this.horizontalEdges = Array(this.gridHeight + 1).fill(null)
            .map(() => Array(this.gridWidth).fill(0));
        this.verticalEdges = Array(this.gridHeight).fill(null)
            .map(() => Array(this.gridWidth + 1).fill(0));
        this.draw();
        this.showMessage('Board cleared!', 'info');
    }

    nextPuzzle() {
        this.currentPuzzleIndex = (this.currentPuzzleIndex + 1) % this.puzzles.length;
        this.loadPuzzle(this.currentPuzzleIndex);
        this.setupCanvas();
        this.draw();
        this.showMessage(`Puzzle ${this.currentPuzzleIndex + 1} loaded!`, 'info');
    }

    checkSolution() {
        // Check if numbers are satisfied
        const numbersValid = this.checkNumbers();
        if (!numbersValid) {
            this.showMessage('Numbers constraint violated! Check the number of lines around each number.', 'error');
            return;
        }

        // Check if there's exactly one loop
        const loopValid = this.checkLoop();
        if (!loopValid) {
            this.showMessage('Must form a single continuous loop with no branches!', 'error');
            return;
        }

        this.showMessage('Congratulations! Puzzle solved correctly! 🎉', 'success');
    }

    checkNumbers() {
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                const num = this.numbers[row][col];
                if (num !== null) {
                    const count = this.countLinesAroundCell(row, col);
                    if (count !== num) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    countLinesAroundCell(row, col) {
        let count = 0;
        // Top edge
        if (this.horizontalEdges[row][col] === 1) count++;
        // Bottom edge
        if (this.horizontalEdges[row + 1][col] === 1) count++;
        // Left edge
        if (this.verticalEdges[row][col] === 1) count++;
        // Right edge
        if (this.verticalEdges[row][col + 1] === 1) count++;
        return count;
    }

    checkLoop() {
        // Build adjacency list of dots connected by lines
        const dots = new Map();

        // Helper to get dot key
        const dotKey = (row, col) => `${row},${col}`;

        // Add horizontal edges
        for (let row = 0; row <= this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                if (this.horizontalEdges[row][col] === 1) {
                    const dot1 = dotKey(row, col);
                    const dot2 = dotKey(row, col + 1);

                    if (!dots.has(dot1)) dots.set(dot1, []);
                    if (!dots.has(dot2)) dots.set(dot2, []);

                    dots.get(dot1).push(dot2);
                    dots.get(dot2).push(dot1);
                }
            }
        }

        // Add vertical edges
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col <= this.gridWidth; col++) {
                if (this.verticalEdges[row][col] === 1) {
                    const dot1 = dotKey(row, col);
                    const dot2 = dotKey(row + 1, col);

                    if (!dots.has(dot1)) dots.set(dot1, []);
                    if (!dots.has(dot2)) dots.set(dot2, []);

                    dots.get(dot1).push(dot2);
                    dots.get(dot2).push(dot1);
                }
            }
        }

        // If no lines drawn, not valid
        if (dots.size === 0) return false;

        // Check each dot has exactly 0 or 2 connections (for a loop, all should have 2)
        for (const [dot, connections] of dots) {
            if (connections.length !== 2) {
                return false;
            }
        }

        // Check all dots form a single connected component (one loop)
        const visited = new Set();
        const start = dots.keys().next().value;
        const queue = [start];
        visited.add(start);

        while (queue.length > 0) {
            const current = queue.shift();
            for (const neighbor of dots.get(current)) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }

        // All dots with lines should be visited
        return visited.size === dots.size;
    }

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

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    new SlitherlinkGame('gameCanvas');
});

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

        // Initialize Web Worker for puzzle generation using inline worker (works with file:// protocol)
        this.puzzleWorker = this.createInlineWorker();
        this.puzzleWorker.onmessage = (e) => this.handleWorkerResponse(e.data);

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

    createInlineWorker() {
        // Create worker from inline code to avoid CORS issues with file:// protocol
        const workerCode = `
${this.getWorkerCode()}
        `;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        return new Worker(workerUrl);
    }

    getWorkerCode() {
        // Returns the complete worker code as a string
        return `
// Web Worker for generating Slitherlink puzzles
self.onmessage = function(e) {
    const { width, height } = e.data;
    console.log(\`Worker: Starting puzzle generation for \${width}x\${height}...\`);
    const puzzle = generatePuzzle(width, height);
    console.log('Worker: Puzzle generation complete!');
    self.postMessage(puzzle);
};

function generatePuzzle(width, height) {
    console.log('Worker: Generating random loop...');
    const solution = generateRandomLoop(width, height);
    console.log('Worker: Extracting numbers from solution...');
    const allNumbers = extractNumbersFromSolution(width, height, solution.horizontal, solution.vertical);
    console.log('Worker: Selecting clues...');
    const clueNumbers = selectClues(allNumbers, width, height);
    return { width, height, numbers: clueNumbers, solution };
}

function generateRandomLoop(width, height) {
    const horizontal = Array(height + 1).fill(null).map(() => Array(width).fill(0));
    const vertical = Array(height).fill(null).map(() => Array(width + 1).fill(0));
    const shuffle = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };
    let success = false;
    let attempts = 0;
    while (!success && attempts < 10) {
        attempts++;
        console.log(\`Worker: Generation attempt \${attempts}/10...\`);
        for (let i = 0; i <= height; i++) {
            for (let j = 0; j < width; j++) horizontal[i][j] = 0;
        }
        for (let i = 0; i < height; i++) {
            for (let j = 0; j <= width; j++) vertical[i][j] = 0;
        }
        console.log(\`Worker: Using carving algorithm...\`);
        success = generateCarvingLoop(width, height, horizontal, vertical);
        if (!success) {
            console.log('Worker:   Loop generation failed, retrying...');
            continue;
        }
        console.log('Worker:   Validating single region...');
        if (!validateSingleRegion(width, height, horizontal, vertical)) {
            console.log('Worker:   Validation failed: multiple enclosed regions detected');
            success = false;
        } else {
            console.log('Worker:   Validation passed! Loop is valid.');
        }
    }
    if (!success) {
        console.log('Worker: All attempts failed, retrying one more time...');
        // Last attempt with adjusted parameters
        generateCarvingLoop(width, height, horizontal, vertical);
    }
    return { horizontal, vertical };
}

function validateSingleRegion(width, height, horizontal, vertical) {
    const outside = Array(height).fill(null).map(() => Array(width).fill(false));
    const queue = [];
    for (let row = 0; row < height; row++) {
        if (vertical[row][0] === 0) { queue.push([row, 0]); outside[row][0] = true; }
        if (vertical[row][width] === 0) { queue.push([row, width - 1]); outside[row][width - 1] = true; }
    }
    for (let col = 0; col < width; col++) {
        if (horizontal[0][col] === 0) { queue.push([0, col]); outside[0][col] = true; }
        if (horizontal[height][col] === 0) { queue.push([height - 1, col]); outside[height - 1][col] = true; }
    }
    while (queue.length > 0) {
        const [row, col] = queue.shift();
        const neighbors = [
            [row - 1, col, horizontal[row][col]],
            [row + 1, col, horizontal[row + 1][col]],
            [row, col - 1, vertical[row][col]],
            [row, col + 1, vertical[row][col + 1]]
        ];
        for (const [newRow, newCol, edge] of neighbors) {
            if (newRow >= 0 && newRow < height && newCol >= 0 && newCol < width &&
                !outside[newRow][newCol] && edge === 0) {
                outside[newRow][newCol] = true;
                queue.push([newRow, newCol]);
            }
        }
    }
    const visited = Array(height).fill(null).map(() => Array(width).fill(false));
    let insideRegions = 0;
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            if (!outside[row][col] && !visited[row][col]) {
                insideRegions++;
                if (insideRegions > 1) return false;
                const regionQueue = [[row, col]];
                visited[row][col] = true;
                while (regionQueue.length > 0) {
                    const [r, c] = regionQueue.shift();
                    const neighbors = [
                        [r - 1, c, horizontal[r][c]],
                        [r + 1, c, horizontal[r + 1][c]],
                        [r, c - 1, vertical[r][c]],
                        [r, c + 1, vertical[r][c + 1]]
                    ];
                    for (const [newR, newC, edge] of neighbors) {
                        if (newR >= 0 && newR < height && newC >= 0 && newC < width &&
                            !outside[newR][newC] && !visited[newR][newC] && edge === 0) {
                            visited[newR][newC] = true;
                            regionQueue.push([newR, newC]);
                        }
                    }
                }
            }
        }
    }
    return insideRegions === 1;
}

function generateCarvingLoop(width, height, horizontal, vertical) {
    // Start with all cells as inside, then carve away cells from the edges
    const inside = Array(height).fill(null).map(() => Array(width).fill(true));

    // Target: remove 20-25% of cells
    const totalCells = width * height;
    const targetRemove = Math.floor(totalCells * (0.20 + Math.random() * 0.05));
    let removed = 0;

    // Start from edge cells - these are candidates for removal
    const candidates = [];
    const adjacentCandidates = []; // Cells adjacent to recently carved cells

    // Add all edge cells as initial candidates
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            if (row === 0 || row === height - 1 || col === 0 || col === width - 1) {
                candidates.push([row, col]);
            }
        }
    }

    // Shuffle candidates for randomness
    const shuffle = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };
    shuffle(candidates);

    // Remove cells iteratively
    const visited = new Set();
    while (removed < targetRemove && (candidates.length > 0 || adjacentCandidates.length > 0)) {
        let row, col;

        // 50% chance to carve adjacent to previously carved cell if available
        if (adjacentCandidates.length > 0 && Math.random() > 0.5) {
            [row, col] = adjacentCandidates.shift();
        } else if (candidates.length > 0) {
            [row, col] = candidates.shift();
        } else {
            [row, col] = adjacentCandidates.shift();
        }

        const key = \`\${row},\${col}\`;

        if (visited.has(key) || !inside[row][col]) continue;
        visited.add(key);

        // Mark as outside
        inside[row][col] = false;
        removed++;

        // Add adjacent inside cells as new adjacent candidates
        const neighbors = [
            [row - 1, col],
            [row + 1, col],
            [row, col - 1],
            [row, col + 1]
        ];

        shuffle(neighbors);
        for (const [nr, nc] of neighbors) {
            if (nr >= 0 && nr < height && nc >= 0 && nc < width && inside[nr][nc]) {
                const neighborKey = \`\${nr},\${nc}\`;
                if (!visited.has(neighborKey) && Math.random() > 0.3) {
                    adjacentCandidates.push([nr, nc]);
                }
            }
        }
    }

    // Now build the loop around the boundary of inside cells
    // For each inside cell, draw lines on edges that border outside cells or grid boundary
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            if (inside[row][col]) {
                // Check top edge
                if (row === 0 || !inside[row - 1][col]) {
                    horizontal[row][col] = 1;
                }
                // Check bottom edge
                if (row === height - 1 || !inside[row + 1][col]) {
                    horizontal[row + 1][col] = 1;
                }
                // Check left edge
                if (col === 0 || !inside[row][col - 1]) {
                    vertical[row][col] = 1;
                }
                // Check right edge
                if (col === width - 1 || !inside[row][col + 1]) {
                    vertical[row][col + 1] = 1;
                }
            }
        }
    }

    return true;
}

function extractNumbersFromSolution(width, height, horizontal, vertical) {
    const numbers = Array(height).fill(null).map(() => Array(width).fill(null));
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            let count = 0;
            if (horizontal[row][col] === 1) count++;
            if (horizontal[row + 1][col] === 1) count++;
            if (vertical[row][col] === 1) count++;
            if (vertical[row][col + 1] === 1) count++;
            numbers[row][col] = count;
        }
    }
    return numbers;
}

function selectClues(allNumbers, width, height) {
    const clues = Array(height).fill(null).map(() => Array(width).fill(null));
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const num = allNumbers[row][col];
            if (num === 0 || num === 3) {
                if (Math.random() > 0.15) clues[row][col] = num;
            } else if (num === 4) {
                if (Math.random() > 0.25) clues[row][col] = num;
            } else if (num === 1) {
                if (Math.random() > 0.55) clues[row][col] = num;
            } else if (num === 2) {
                if (Math.random() > 0.60) clues[row][col] = num;
            }
        }
    }
    const regionSize = 3;
    for (let regionRow = 0; regionRow < height; regionRow += regionSize) {
        for (let regionCol = 0; regionCol < width; regionCol += regionSize) {
            let hasClue = false;
            const regionEndRow = Math.min(regionRow + regionSize, height);
            const regionEndCol = Math.min(regionCol + regionSize, width);
            for (let r = regionRow; r < regionEndRow; r++) {
                for (let c = regionCol; c < regionEndCol; c++) {
                    if (clues[r][c] !== null) {
                        hasClue = true;
                        break;
                    }
                }
                if (hasClue) break;
            }
            if (!hasClue) {
                const attempts = 2;
                for (let i = 0; i < attempts; i++) {
                    const r = regionRow + Math.floor(Math.random() * (regionEndRow - regionRow));
                    const c = regionCol + Math.floor(Math.random() * (regionEndCol - regionCol));
                    if (clues[r][c] === null) clues[r][c] = allNumbers[r][c];
                }
            }
        }
    }
    return clues;
}
`;
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
        document.getElementById('showSolutionBtn').addEventListener('click', () => this.showSolution());
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

    showSolution() {
        if (!this.solution) {
            this.showMessage('No solution available. Generate a new puzzle first!', 'error');
            return;
        }

        // Copy the solution to the current board
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
        // Show generating message
        this.showMessage('Generating puzzle...', 'info');
        console.log('Starting puzzle generation in worker...');

        // Send generation request to worker (non-blocking)
        this.puzzleWorker.postMessage({ width: 6, height: 6 });
    }

    handleWorkerResponse(newPuzzle) {
        // Called when worker completes puzzle generation
        console.log('Received puzzle from worker!');

        this.gridWidth = newPuzzle.width;
        this.gridHeight = newPuzzle.height;
        this.numbers = newPuzzle.numbers;
        this.solution = newPuzzle.solution;  // Store solution

        // Clear the board
        this.horizontalEdges = Array(this.gridHeight + 1).fill(null)
            .map(() => Array(this.gridWidth).fill(0));
        this.verticalEdges = Array(this.gridHeight).fill(null)
            .map(() => Array(this.gridWidth + 1).fill(0));

        this.setupCanvas();
        this.draw();
        this.showMessage('New puzzle generated!', 'info');
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

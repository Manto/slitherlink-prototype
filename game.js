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
        // Generate a new random puzzle (always 6x6)
        const width = 6;
        const height = 6;
        const newPuzzle = this.generatePuzzle(width, height);

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

    generatePuzzle(width, height) {
        // Generate a valid random loop solution
        const solution = this.generateRandomLoop(width, height);

        // Extract all possible numbers from the solution
        const allNumbers = this.extractNumbersFromSolution(width, height, solution.horizontal, solution.vertical);

        // Select which numbers to reveal as clues
        const clueNumbers = this.selectClues(allNumbers, width, height);

        return {
            width: width,
            height: height,
            numbers: clueNumbers,
            solution: solution  // Store the solution
        };
    }

    generateRandomLoop(width, height) {
        // Generate a random valid loop with many turns that creates only ONE enclosed region
        const horizontal = Array(height + 1).fill(null).map(() => Array(width).fill(0));
        const vertical = Array(height).fill(null).map(() => Array(width + 1).fill(0));

        // Use a snake-like pattern to create interesting loops with many turns
        // Strategy: create a winding path that covers more area
        const shuffle = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };

        // Try multiple generation strategies
        let success = false;
        let attempts = 0;

        while (!success && attempts < 10) {
            // Clear previous attempt
            for (let i = 0; i <= height; i++) {
                for (let j = 0; j < width; j++) {
                    horizontal[i][j] = 0;
                }
            }
            for (let i = 0; i < height; i++) {
                for (let j = 0; j <= width; j++) {
                    vertical[i][j] = 0;
                }
            }

            // Try to generate a serpentine/winding loop
            if (Math.random() > 0.3) {
                success = this.generateWindingLoop(width, height, horizontal, vertical);
            } else {
                success = this.generateRecursiveLoop(width, height, horizontal, vertical);
            }

            // Validate that the loop creates only ONE enclosed region
            if (success && !this.validateSingleRegion(width, height, horizontal, vertical)) {
                success = false; // Reject loops with multiple enclosed regions
            }

            attempts++;
        }

        // If all attempts failed, use simple rectangular loop (always valid)
        if (!success) {
            this.generateSimpleRectangularLoop(width, height, horizontal, vertical);
        }

        return { horizontal, vertical };
    }

    validateSingleRegion(width, height, horizontal, vertical) {
        // Check that the loop divides the grid into exactly 2 regions (inside and outside)
        // Use flood fill from outside to mark all outside cells
        const outside = Array(height).fill(null).map(() => Array(width).fill(false));

        // Flood fill from all edges
        const queue = [];

        // Add all edge cells that aren't blocked
        for (let row = 0; row < height; row++) {
            // Left edge
            if (vertical[row][0] === 0) {
                queue.push([row, 0]);
                outside[row][0] = true;
            }
            // Right edge
            if (vertical[row][width] === 0) {
                queue.push([row, width - 1]);
                outside[row][width - 1] = true;
            }
        }

        for (let col = 0; col < width; col++) {
            // Top edge
            if (horizontal[0][col] === 0) {
                queue.push([0, col]);
                outside[0][col] = true;
            }
            // Bottom edge
            if (horizontal[height][col] === 0) {
                queue.push([height - 1, col]);
                outside[height - 1][col] = true;
            }
        }

        // Flood fill to find all outside cells
        while (queue.length > 0) {
            const [row, col] = queue.shift();

            // Try all 4 directions
            const neighbors = [
                [row - 1, col, horizontal[row][col]],      // up
                [row + 1, col, horizontal[row + 1][col]],  // down
                [row, col - 1, vertical[row][col]],        // left
                [row, col + 1, vertical[row][col + 1]]     // right
            ];

            for (const [newRow, newCol, edge] of neighbors) {
                if (newRow >= 0 && newRow < height &&
                    newCol >= 0 && newCol < width &&
                    !outside[newRow][newCol] && edge === 0) {
                    outside[newRow][newCol] = true;
                    queue.push([newRow, newCol]);
                }
            }
        }

        // Count inside regions using flood fill
        const visited = Array(height).fill(null).map(() => Array(width).fill(false));
        let insideRegions = 0;

        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                if (!outside[row][col] && !visited[row][col]) {
                    // Found a new inside region
                    insideRegions++;

                    if (insideRegions > 1) {
                        return false; // Multiple enclosed regions - invalid!
                    }

                    // Flood fill this inside region
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
                            if (newR >= 0 && newR < height &&
                                newC >= 0 && newC < width &&
                                !outside[newR][newC] &&
                                !visited[newR][newC] &&
                                edge === 0) {
                                visited[newR][newC] = true;
                                regionQueue.push([newR, newC]);
                            }
                        }
                    }
                }
            }
        }

        // Valid if exactly 1 inside region (or 0 if the loop encloses nothing, which is technically valid but boring)
        return insideRegions === 1;
    }

    generateWindingLoop(width, height, horizontal, vertical) {
        // Create a winding serpentine pattern with lots of turns
        const path = [];
        const visited = new Set();

        // Start from a random edge
        let row = Math.floor(Math.random() * (height + 1));
        let col = Math.floor(Math.random() * (width + 1));
        const startRow = row;
        const startCol = col;

        const getKey = (r, c) => `${r},${c}`;
        let lastDir = null;

        const directions = [
            { dr: 0, dc: 1, name: 'right', type: 'h' },
            { dr: 0, dc: -1, name: 'left', type: 'h' },
            { dr: 1, dc: 0, name: 'down', type: 'v' },
            { dr: -1, dc: 0, name: 'up', type: 'v' }
        ];

        const shuffle = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };

        // Build a path with preference for turning
        for (let step = 0; step < 100; step++) {
            visited.add(getKey(row, col));

            // Get available directions
            let availableDirs = directions.filter(dir => {
                const newRow = row + dir.dr;
                const newCol = col + dir.dc;
                return newRow >= 0 && newRow <= height &&
                       newCol >= 0 && newCol <= width;
            });

            // Prefer directions that turn (different from last direction)
            if (lastDir && Math.random() > 0.3) {
                const turningDirs = availableDirs.filter(dir => dir.name !== lastDir);
                if (turningDirs.length > 0) {
                    availableDirs = turningDirs;
                }
            }

            // Can we return to start?
            if (path.length > 15) {
                const toStart = availableDirs.find(dir =>
                    row + dir.dr === startRow && col + dir.dc === startCol
                );
                if (toStart && Math.random() > 0.5) {
                    path.push({ row, col, newRow: startRow, newCol: startCol, dir: toStart.type });
                    break;
                }
            }

            // Filter out visited nodes (but allow start after enough steps)
            availableDirs = availableDirs.filter(dir => {
                const newKey = getKey(row + dir.dr, col + dir.dc);
                return !visited.has(newKey) ||
                       (path.length > 15 && row + dir.dr === startRow && col + dir.dc === startCol);
            });

            if (availableDirs.length === 0) {
                // Dead end - try to return to start if close enough
                if (path.length > 15 &&
                    Math.abs(row - startRow) <= 1 &&
                    Math.abs(col - startCol) <= 1) {
                    const toStart = directions.find(dir =>
                        row + dir.dr === startRow && col + dir.dc === startCol
                    );
                    if (toStart) {
                        path.push({ row, col, newRow: startRow, newCol: startCol, dir: toStart.type });
                        break;
                    }
                }
                return false; // Failed
            }

            // Pick a random available direction
            const randomDirs = shuffle([...availableDirs]);
            const chosenDir = randomDirs[0];

            const newRow = row + chosenDir.dr;
            const newCol = col + chosenDir.dc;

            path.push({ row, col, newRow, newCol, dir: chosenDir.type });
            lastDir = chosenDir.name;

            row = newRow;
            col = newCol;
        }

        // Check if we made it back to start
        if (row !== startRow || col !== startCol || path.length < 12) {
            return false;
        }

        // Convert path to edges
        for (const edge of path) {
            if (edge.dir === 'h') {
                if (edge.col < edge.newCol) {
                    horizontal[edge.row][edge.col] = 1;
                } else {
                    horizontal[edge.row][edge.newCol] = 1;
                }
            } else {
                if (edge.row < edge.newRow) {
                    vertical[edge.row][edge.col] = 1;
                } else {
                    vertical[edge.newRow][edge.col] = 1;
                }
            }
        }

        return true;
    }

    generateRecursiveLoop(width, height, horizontal, vertical) {
        // Similar to original but with better parameters for more turns
        const visited = new Set();
        const path = [];
        const startRow = Math.floor(Math.random() * (height + 1));
        const startCol = Math.floor(Math.random() * (width + 1));

        const directions = [
            { dr: 0, dc: 1, type: 'h' },
            { dr: 0, dc: -1, type: 'h' },
            { dr: 1, dc: 0, type: 'v' },
            { dr: -1, dc: 0, type: 'v' }
        ];

        const shuffle = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };

        const buildLoop = (row, col, pathLength, lastDir) => {
            const key = `${row},${col}`;

            if (pathLength > 12 && row === startRow && col === startCol) {
                return true;
            }

            if (pathLength > 0 && visited.has(key)) {
                return false;
            }

            if (pathLength > 0) visited.add(key);

            let randomDirs = shuffle([...directions]);

            // Prefer turning
            if (lastDir !== null && Math.random() > 0.4) {
                randomDirs.sort((a, b) => {
                    if (a.type !== lastDir && b.type === lastDir) return -1;
                    if (a.type === lastDir && b.type !== lastDir) return 1;
                    return 0;
                });
            }

            for (const dir of randomDirs) {
                const newRow = row + dir.dr;
                const newCol = col + dir.dc;

                if (newRow < 0 || newRow > height || newCol < 0 || newCol > width) {
                    continue;
                }

                const newKey = `${newRow},${newCol}`;

                if (pathLength > 12 && newRow === startRow && newCol === startCol) {
                    path.push({ row, col, newRow, newCol, dir: dir.type });
                    return true;
                }

                if (visited.has(newKey)) {
                    continue;
                }

                path.push({ row, col, newRow, newCol, dir: dir.type });

                if (buildLoop(newRow, newCol, pathLength + 1, dir.type)) {
                    return true;
                }

                path.pop();
            }

            if (pathLength > 0) visited.delete(key);
            return false;
        };

        if (!buildLoop(startRow, startCol, 0, null) || path.length < 12) {
            return false;
        }

        // Convert path to edges
        for (const edge of path) {
            if (edge.dir === 'h') {
                if (edge.col < edge.newCol) {
                    horizontal[edge.row][edge.col] = 1;
                } else {
                    horizontal[edge.row][edge.newCol] = 1;
                }
            } else {
                if (edge.row < edge.newRow) {
                    vertical[edge.row][edge.col] = 1;
                } else {
                    vertical[edge.newRow][edge.col] = 1;
                }
            }
        }

        return true;
    }

    generateSimpleRectangularLoop(width, height, horizontal, vertical) {
        // Create a simple rectangular loop that's guaranteed to have only one enclosed region
        // Add some random indentations to make it more interesting
        const margin = 1;

        if (width < 3 || height < 3) {
            // Too small, make outer rectangle
            for (let col = 0; col < width; col++) {
                horizontal[0][col] = 1;
                horizontal[height][col] = 1;
            }
            for (let row = 0; row < height; row++) {
                vertical[row][0] = 1;
                vertical[row][width] = 1;
            }
            return;
        }

        const topRow = margin;
        const bottomRow = height - margin;
        const leftCol = margin;
        const rightCol = width - margin;

        // Create basic rectangle
        // Top edge
        for (let col = leftCol; col < rightCol; col++) {
            horizontal[topRow][col] = 1;
        }

        // Bottom edge
        for (let col = leftCol; col < rightCol; col++) {
            horizontal[bottomRow][col] = 1;
        }

        // Left edge
        for (let row = topRow; row < bottomRow; row++) {
            vertical[row][leftCol] = 1;
        }

        // Right edge
        for (let row = topRow; row < bottomRow; row++) {
            vertical[row][rightCol] = 1;
        }

        // Add some random single-cell indentations to make it less boring
        // but ensure we don't create multiple enclosed regions
        const numIndents = Math.floor(Math.random() * 3) + 1; // 1-3 indentations

        for (let i = 0; i < numIndents; i++) {
            const side = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left

            if (side === 0 && topRow > 0) {
                // Indent from top
                const col = leftCol + 1 + Math.floor(Math.random() * (rightCol - leftCol - 2));
                horizontal[topRow][col] = 0;
                horizontal[topRow - 1][col] = 1;
                vertical[topRow - 1][col] = 1;
                vertical[topRow - 1][col + 1] = 1;
            } else if (side === 1 && rightCol < width) {
                // Indent from right
                const row = topRow + 1 + Math.floor(Math.random() * (bottomRow - topRow - 2));
                vertical[row][rightCol] = 0;
                vertical[row][rightCol + 1] = 1;
                horizontal[row][rightCol] = 1;
                horizontal[row + 1][rightCol] = 1;
            } else if (side === 2 && bottomRow < height) {
                // Indent from bottom
                const col = leftCol + 1 + Math.floor(Math.random() * (rightCol - leftCol - 2));
                horizontal[bottomRow][col] = 0;
                horizontal[bottomRow + 1][col] = 1;
                vertical[bottomRow][col] = 1;
                vertical[bottomRow][col + 1] = 1;
            } else if (side === 3 && leftCol > 0) {
                // Indent from left
                const row = topRow + 1 + Math.floor(Math.random() * (bottomRow - topRow - 2));
                vertical[row][leftCol] = 0;
                vertical[row][leftCol - 1] = 1;
                horizontal[row][leftCol - 1] = 1;
                horizontal[row + 1][leftCol - 1] = 1;
            }
        }
    }

    extractNumbersFromSolution(width, height, horizontal, vertical) {
        // Count how many edges surround each cell in the solution
        const numbers = Array(height).fill(null).map(() => Array(width).fill(null));

        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                let count = 0;

                // Count edges around this cell
                if (horizontal[row][col] === 1) count++;     // top
                if (horizontal[row + 1][col] === 1) count++; // bottom
                if (vertical[row][col] === 1) count++;       // left
                if (vertical[row][col + 1] === 1) count++;   // right

                numbers[row][col] = count;
            }
        }

        return numbers;
    }

    selectClues(allNumbers, width, height) {
        // Select which numbers to reveal as clues
        // Strategy: reveal enough clues to avoid blank areas
        const clues = Array(height).fill(null).map(() => Array(width).fill(null));

        // First pass: select clues based on informativeness
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const num = allNumbers[row][col];

                // Reveal clues with weighted probabilities
                if (num === 0 || num === 3) {
                    if (Math.random() > 0.15) { // 85% chance
                        clues[row][col] = num;
                    }
                }
                else if (num === 4) {
                    if (Math.random() > 0.25) { // 75% chance
                        clues[row][col] = num;
                    }
                }
                else if (num === 1) {
                    if (Math.random() > 0.55) { // 45% chance
                        clues[row][col] = num;
                    }
                }
                else if (num === 2) {
                    if (Math.random() > 0.60) { // 40% chance
                        clues[row][col] = num;
                    }
                }
            }
        }

        // Second pass: ensure no large blank areas
        // Divide grid into 2x2 or 3x3 regions and ensure each has clues
        const regionSize = 3;
        for (let regionRow = 0; regionRow < height; regionRow += regionSize) {
            for (let regionCol = 0; regionCol < width; regionCol += regionSize) {
                // Check if this region has any clues
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

                // If region is blank, add 1-2 clues
                if (!hasClue) {
                    const attempts = 2;
                    for (let i = 0; i < attempts; i++) {
                        const r = regionRow + Math.floor(Math.random() * (regionEndRow - regionRow));
                        const c = regionCol + Math.floor(Math.random() * (regionEndCol - regionCol));
                        if (clues[r][c] === null) {
                            clues[r][c] = allNumbers[r][c];
                        }
                    }
                }
            }
        }

        return clues;
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

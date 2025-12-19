// ============================================
// SQUARE GRID SLITHERLINK
// ============================================

class SlitherlinkGame {
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

    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Grid settings
        this.cellSize = 60;
        this.dotRadius = 5;
        this.lineWidth = 4;
        this.padding = 30; // Padding around the grid

        // Initialize Web Worker for puzzle generation using inline worker (works with file:// protocol)
        this.puzzleWorker = this.createInlineWorker();
        this.puzzleWorker.onmessage = (e) => this.handleWorkerResponse(e.data);

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
    const { type, width, height, radius } = e.data;
    console.log(\`Worker: Starting puzzle generation...\`);
    
    if (type === 'hexagonal') {
        const puzzle = generateHexPuzzle(radius);
        console.log('Worker: Hex puzzle generation complete!');
        self.postMessage({ type: 'hexagonal', ...puzzle });
    } else {
    const puzzle = generatePuzzle(width, height);
        console.log('Worker: Square puzzle generation complete!');
        self.postMessage({ type: 'square', ...puzzle });
    }
};

// ============================================
// SQUARE PUZZLE GENERATION
// ============================================

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
    const inside = Array(height).fill(null).map(() => Array(width).fill(true));
    const totalCells = width * height;
    const targetCarve = Math.floor(totalCells / 3);
    const carved = new Set();

    const shuffle = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

    const getOutsideEdgeCells = () => {
        const edgeCells = [];
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                if (inside[row][col] &&
                    (row === 0 || row === height - 1 || col === 0 || col === width - 1)) {
                    edgeCells.push([row, col]);
                }
            }
        }
        return edgeCells;
    };

    const getAdjacentToCarved = () => {
        const adjacent = [];
        for (const key of carved) {
            const [r, c] = key.split(',').map(Number);
            const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
            for (const [nr, nc] of neighbors) {
                const nKey = \`\${nr},\${nc}\`;
                if (nr >= 0 && nr < height && nc >= 0 && nc < width &&
                    inside[nr][nc] && !carved.has(nKey)) {
                    adjacent.push([nr, nc]);
                }
            }
        }
        return adjacent;
    };

    const wouldClearRowOrColumn = (r, c) => {
        let rowCount = 0;
        for (let col = 0; col < width; col++) {
            if (inside[r][col]) rowCount++;
        }
        if (rowCount <= 1) return true;
        let colCount = 0;
        for (let row = 0; row < height; row++) {
            if (inside[row][c]) colCount++;
        }
        if (colCount <= 1) return true;
        return false;
    };

    const countZeroScoreCells = () => {
        const tempH = Array(height + 1).fill(null).map(() => Array(width).fill(0));
        const tempV = Array(height).fill(null).map(() => Array(width + 1).fill(0));

        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                if (inside[row][col]) {
                    if (row === 0 || !inside[row - 1][col]) tempH[row][col] = 1;
                    if (row === height - 1 || !inside[row + 1][col]) tempH[row + 1][col] = 1;
                    if (col === 0 || !inside[row][col - 1]) tempV[row][col] = 1;
                    if (col === width - 1 || !inside[row][col + 1]) tempV[row][col + 1] = 1;
                }
            }
        }

        let zeroCount = 0;
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                if (inside[row][col]) {
                    let count = 0;
                    if (tempH[row][col] === 1) count++;
                    if (tempH[row + 1][col] === 1) count++;
                    if (tempV[row][col] === 1) count++;
                    if (tempV[row][col + 1] === 1) count++;
                    if (count === 0) zeroCount++;
                }
            }
        }
        return zeroCount;
    };

    const wouldCreateMultipleLoops = () => {
        const insideCells = [];
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                if (inside[row][col]) insideCells.push([row, col]);
                }
            }
        if (insideCells.length === 0) return false;
        const visited = new Set();
        const queue = [insideCells[0]];
        visited.add(\`\${insideCells[0][0]},\${insideCells[0][1]}\`);

        while (queue.length > 0) {
            const [r, c] = queue.shift();
            const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
            for (const [nr, nc] of neighbors) {
                const nKey = \`\${nr},\${nc}\`;
                if (nr >= 0 && nr < height && nc >= 0 && nc < width &&
                    inside[nr][nc] && !visited.has(nKey)) {
                    visited.add(nKey);
                    queue.push([nr, nc]);
                }
            }
        }
        return visited.size !== insideCells.length;
    };

    let iterations = 0;
    const maxIterations = totalCells * 3;
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 20;

    while (iterations < maxIterations && carved.size < targetCarve) {
        iterations++;
        let candidates = [];

        if (carved.size === 0) {
            candidates = getOutsideEdgeCells();
            if (candidates.length === 0) break;
        } else {
            const adjacentCells = getAdjacentToCarved();
            const boundaryCells = getOutsideEdgeCells();
            const candidateSet = new Set();
            for (const [r, c] of adjacentCells) candidateSet.add(\`\${r},\${c}\`);
            for (const [r, c] of boundaryCells) candidateSet.add(\`\${r},\${c}\`);
            candidates = Array.from(candidateSet).map(key => key.split(',').map(Number));
        }

        const currentZeroCount = countZeroScoreCells();
        const zeroReducingCandidates = [];

        for (const [r, c] of candidates) {
            const key = \`\${r},\${c}\`;
            if (carved.has(key) || !inside[r][c]) continue;
            inside[r][c] = false;
            const newZeroCount = countZeroScoreCells();
            inside[r][c] = true;
            if (newZeroCount < currentZeroCount) zeroReducingCandidates.push([r, c]);
        }

        if (zeroReducingCandidates.length > 0) candidates = zeroReducingCandidates;
        if (candidates.length === 0) break;

        shuffle(candidates);
        let carved_this_iteration = false;

        for (let attempt = 0; attempt < Math.min(5, candidates.length); attempt++) {
            const [row, col] = candidates[attempt];
            const key = \`\${row},\${col}\`;
            if (carved.has(key) || !inside[row][col]) continue;
            if (wouldClearRowOrColumn(row, col)) continue;
            inside[row][col] = false;
            if (carved.size >= 3 && wouldCreateMultipleLoops()) {
                inside[row][col] = true;
                continue;
            }
            carved.add(key);
            carved_this_iteration = true;
            consecutiveFailures = 0;
            break;
        }

        if (!carved_this_iteration) {
            consecutiveFailures++;
            if (consecutiveFailures >= maxConsecutiveFailures) break;
        }
    }

    if (carved.size < targetCarve - 2) return false;

    for (let i = 0; i <= height; i++) {
        for (let j = 0; j < width; j++) horizontal[i][j] = 0;
    }
    for (let i = 0; i < height; i++) {
        for (let j = 0; j <= width; j++) vertical[i][j] = 0;
    }

    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            if (inside[row][col]) {
                if (row === 0 || !inside[row - 1][col]) horizontal[row][col] = 1;
                if (row === height - 1 || !inside[row + 1][col]) horizontal[row + 1][col] = 1;
                if (col === 0 || !inside[row][col - 1]) vertical[row][col] = 1;
                if (col === width - 1 || !inside[row][col + 1]) vertical[row][col + 1] = 1;
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
    const totalCells = width * height;
    const maxClues = Math.floor(totalCells * 0.5);

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

    const regionSize = 2;
    for (let regionRow = 0; regionRow < height; regionRow += regionSize) {
        for (let regionCol = 0; regionCol < width; regionCol += regionSize) {
            let hasClue = false;
            const regionEndRow = Math.min(regionRow + regionSize, height);
            const regionEndCol = Math.min(regionCol + regionSize, width);
            for (let r = regionRow; r < regionEndRow; r++) {
                for (let c = regionCol; c < regionEndCol; c++) {
                    if (clues[r][c] !== null) { hasClue = true; break; }
                }
                if (hasClue) break;
            }
            if (!hasClue) {
                for (let i = 0; i < 2; i++) {
                    const r = regionRow + Math.floor(Math.random() * (regionEndRow - regionRow));
                    const c = regionCol + Math.floor(Math.random() * (regionEndCol - regionCol));
                    if (clues[r][c] === null) clues[r][c] = allNumbers[r][c];
                }
            }
        }
    }

    let clueCount = 0;
    const cluePositions = [];
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            if (clues[row][col] !== null) {
                clueCount++;
                cluePositions.push([row, col]);
            }
        }
    }

    if (clueCount > maxClues) {
        const toRemove = clueCount - maxClues;
        for (let i = cluePositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cluePositions[i], cluePositions[j]] = [cluePositions[j], cluePositions[i]];
        }
        for (let i = 0; i < toRemove; i++) {
            const [row, col] = cluePositions[i];
            clues[row][col] = null;
        }
    }
    return clues;
}

// ============================================
// HEXAGONAL PUZZLE GENERATION
// ============================================

function generateHexPuzzle(radius) {
    console.log(\`Worker: Generating hex puzzle with radius \${radius}...\`);
    
    // Generate cells in the hexagonal grid
    const cells = [];
    for (let q = -radius; q <= radius; q++) {
        for (let r = -radius; r <= radius; r++) {
            if (Math.abs(q + r) <= radius) {
                cells.push({ q, r });
            }
        }
    }
    
    console.log(\`Worker: Generated \${cells.length} hexagonal cells\`);
    
    // Generate loop - connected inside region guarantees valid boundary loop
    const solution = generateHexLoop(cells, radius);
    console.log(\`Worker: Generated loop with \${Object.keys(solution.edges).length} edges\`);
    
    // Extract numbers from solution
    const numbers = extractHexNumbers(cells, solution.edges);
    
    // Select clues
    const clueNumbers = selectHexClues(numbers, cells);
    
    return { radius, cells, numbers: clueNumbers, solution };
}

function getHexNeighbors(q, r) {
    // Six neighbors for a hexagon in axial coordinates
    // Order MUST match edge indices for pointy-top hexagons:
    // Edge i connects vertex[i] and vertex[(i+1)%6]
    // Vertex angles: 0=30°, 1=90°, 2=150°, 3=210°, 4=270°, 5=330°
    // Edge faces outward at midpoint angle:
    // - Edge 0 faces 60° → Southeast neighbor (q, r+1)
    // - Edge 1 faces 120° → Southwest neighbor (q-1, r+1)
    // - Edge 2 faces 180° → West neighbor (q-1, r)
    // - Edge 3 faces 240° → Northwest neighbor (q, r-1)
    // - Edge 4 faces 300° → Northeast neighbor (q+1, r-1)
    // - Edge 5 faces 0° → East neighbor (q+1, r)
    return [
        { q: q, r: r + 1 },      // Edge 0: Southeast
        { q: q - 1, r: r + 1 },  // Edge 1: Southwest
        { q: q - 1, r: r },      // Edge 2: West
        { q: q, r: r - 1 },      // Edge 3: Northwest
        { q: q + 1, r: r - 1 },  // Edge 4: Northeast
        { q: q + 1, r: r }       // Edge 5: East
    ];
}

function hexCellKey(q, r) {
    return \`\${q},\${r}\`;
}

function hexEdgeKey(q1, r1, q2, r2) {
    // Canonical edge key: smaller coordinates first
    if (q1 < q2 || (q1 === q2 && r1 < r2)) {
        return \`\${q1},\${r1}|\${q2},\${r2}\`;
    }
    return \`\${q2},\${r2}|\${q1},\${r1}\`;
}

// Get vertex coordinates for a hexagon (for loop validation)
// Returns 6 vertices as {x, y} with sufficient precision for comparison
function getHexVertices(q, r, size) {
    const cx = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
    const cy = size * (3 / 2 * r);
    const vertices = [];
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 6 + (Math.PI / 3) * i;
        vertices.push({
            x: Math.round((cx + size * Math.cos(angle)) * 1000) / 1000,
            y: Math.round((cy + size * Math.sin(angle)) * 1000) / 1000
        });
    }
    return vertices;
}

function vertexKey(v) {
    return \`\${v.x},\${v.y}\`;
}

// Validate that the edges form a single closed loop
function validateHexLoop(edges, cells) {
    const size = 1; // Unit size for vertex calculation
    const cellSet = new Set(cells.map(c => hexCellKey(c.q, c.r)));
    
    // Build adjacency list of vertices
    const vertexConnections = new Map();
    
    for (const cell of cells) {
        const vertices = getHexVertices(cell.q, cell.r, size);
        const neighbors = getHexNeighbors(cell.q, cell.r);
        
        for (let i = 0; i < 6; i++) {
            const neighbor = neighbors[i];
            const edgeKey = hexEdgeKey(cell.q, cell.r, neighbor.q, neighbor.r);
            
            if (edges[edgeKey] === 1) {
                const v1 = vertices[i];
                const v2 = vertices[(i + 1) % 6];
                const v1Key = vertexKey(v1);
                const v2Key = vertexKey(v2);
                
                if (!vertexConnections.has(v1Key)) vertexConnections.set(v1Key, new Set());
                if (!vertexConnections.has(v2Key)) vertexConnections.set(v2Key, new Set());
                
                vertexConnections.get(v1Key).add(v2Key);
                vertexConnections.get(v2Key).add(v1Key);
            }
        }
    }
    
    // If no edges, invalid
    if (vertexConnections.size === 0) {
        console.log(\`Worker: Validation failed - no edges\`);
        return false;
    }
    
    // Check each vertex has exactly 2 connections (required for a loop)
    for (const [vertex, connections] of vertexConnections) {
        if (connections.size !== 2) {
            console.log(\`Worker: Validation failed - vertex has \${connections.size} connections (need 2)\`);
            return false;
        }
    }
    
    // Check all vertices form a single connected component
    const visited = new Set();
    const start = vertexConnections.keys().next().value;
    const queue = [start];
    visited.add(start);
    
    while (queue.length > 0) {
        const current = queue.shift();
        for (const neighbor of vertexConnections.get(current)) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }
    
    if (visited.size !== vertexConnections.size) {
        console.log(\`Worker: Validation failed - multiple disconnected components (\${visited.size} vs \${vertexConnections.size})\`);
        return false;
    }
    
    console.log(\`Worker: Loop validation passed! \${vertexConnections.size} vertices in single loop\`);
    return true;
}

function generateHexLoop(cells, radius) {
    const cellSet = new Set(cells.map(c => hexCellKey(c.q, c.r)));
    const inside = new Set(cells.map(c => hexCellKey(c.q, c.r)));
    
    const totalCells = cells.length;
    const targetCarve = Math.floor(totalCells / 3);
    const carved = new Set();
    
    const shuffle = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };
    
    // Get cells on the boundary (adjacent to outside of grid OR adjacent to carved cells)
    const getBoundaryCells = () => {
        const boundary = [];
        for (const cell of cells) {
            const key = hexCellKey(cell.q, cell.r);
            if (!inside.has(key)) continue;
            
            const neighbors = getHexNeighbors(cell.q, cell.r);
            let isBoundary = false;
            for (const n of neighbors) {
                const nKey = hexCellKey(n.q, n.r);
                // Boundary if neighbor is outside grid or carved
                if (!cellSet.has(nKey) || carved.has(nKey)) {
                    isBoundary = true;
                    break;
                }
            }
            if (isBoundary) boundary.push(cell);
        }
        return boundary;
    };
    
    // Check if inside cells form a single connected region
    const isInsideConnected = () => {
        const insideCells = [];
        for (const cell of cells) {
            const key = hexCellKey(cell.q, cell.r);
            if (inside.has(key)) insideCells.push(cell);
        }
        
        if (insideCells.length === 0) return true;
        if (insideCells.length === 1) return true;
        
        const visited = new Set();
        const queue = [insideCells[0]];
        visited.add(hexCellKey(insideCells[0].q, insideCells[0].r));
        
        while (queue.length > 0) {
            const current = queue.shift();
            const neighbors = getHexNeighbors(current.q, current.r);
            
            for (const n of neighbors) {
                const nKey = hexCellKey(n.q, n.r);
                if (inside.has(nKey) && !visited.has(nKey)) {
                    visited.add(nKey);
                    queue.push({ q: n.q, r: n.r });
                }
            }
        }
        
        return visited.size === insideCells.length;
    };
    
    // Build edges from inside cells
    const buildEdges = () => {
        const edges = {};
        
        for (const cell of cells) {
            const key = hexCellKey(cell.q, cell.r);
            if (!inside.has(key)) continue;
            
            const neighbors = getHexNeighbors(cell.q, cell.r);
            
            for (let i = 0; i < 6; i++) {
                const neighbor = neighbors[i];
                const nKey = hexCellKey(neighbor.q, neighbor.r);
                
                // Edge exists if neighbor is outside the inside region
                if (!inside.has(nKey)) {
                    const edgeKey = hexEdgeKey(cell.q, cell.r, neighbor.q, neighbor.r);
                    edges[edgeKey] = 1;
                }
            }
        }
        
        return edges;
    };
    
    // Carving loop - only carve from boundary cells to maintain connectivity
    let iterations = 0;
    const maxIterations = totalCells * 5;
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 30;
    
    while (iterations < maxIterations && carved.size < targetCarve) {
        iterations++;
        
        // Only carve cells that are on the boundary
        const candidates = getBoundaryCells();
        
        if (candidates.length === 0) {
            break;
        }
        
        shuffle(candidates);
        let carved_this_iteration = false;
        
        for (let attempt = 0; attempt < Math.min(10, candidates.length); attempt++) {
            const cell = candidates[attempt];
            const key = hexCellKey(cell.q, cell.r);
            
            if (carved.has(key) || !inside.has(key)) continue;
            
            // Tentatively carve
            inside.delete(key);
            
            // Check if inside cells are still connected
            if (!isInsideConnected()) {
                inside.add(key);
                continue;
            }
            
            // Make sure we don't carve all cells
            if (inside.size < 3) {
                inside.add(key);
                continue;
            }
            
            carved.add(key);
            carved_this_iteration = true;
            consecutiveFailures = 0;
            break;
        }
        
        if (!carved_this_iteration) {
            consecutiveFailures++;
            if (consecutiveFailures >= maxConsecutiveFailures) break;
        }
    }
    
    console.log(\`Worker: Carved \${carved.size} cells out of \${totalCells}, \${inside.size} cells remain inside\`);
    
    // Build final edges
    const edges = buildEdges();
    
    return { edges, inside: Array.from(inside) };
}

function extractHexNumbers(cells, edges) {
    const numbers = {};
    
    for (const cell of cells) {
        const key = hexCellKey(cell.q, cell.r);
        const neighbors = getHexNeighbors(cell.q, cell.r);
        
        let count = 0;
        for (const n of neighbors) {
            const edgeKey = hexEdgeKey(cell.q, cell.r, n.q, n.r);
            if (edges[edgeKey] === 1) count++;
        }
        
        numbers[key] = count;
    }
    
    return numbers;
}

function selectHexClues(allNumbers, cells) {
    const clues = {};
    const totalCells = cells.length;
    const maxClues = Math.floor(totalCells * 0.55);
    
    // Initial selection based on number value
    for (const cell of cells) {
        const key = hexCellKey(cell.q, cell.r);
        const num = allNumbers[key];
        
        if (num === 0 || num === 5 || num === 6) {
            if (Math.random() > 0.1) clues[key] = num;
        } else if (num === 1 || num === 4) {
            if (Math.random() > 0.4) clues[key] = num;
        } else if (num === 2 || num === 3) {
            if (Math.random() > 0.5) clues[key] = num;
        }
    }
    
    // Enforce maximum clue count
    let clueCount = Object.keys(clues).length;
    if (clueCount > maxClues) {
        const clueKeys = Object.keys(clues);
        for (let i = clueKeys.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [clueKeys[i], clueKeys[j]] = [clueKeys[j], clueKeys[i]];
        }
        const toRemove = clueCount - maxClues;
        for (let i = 0; i < toRemove; i++) {
            delete clues[clueKeys[i]];
        }
    }
    
    console.log(\`Worker: Selected \${Object.keys(clues).length} clues out of \${totalCells} cells\`);
    return clues;
}
`;
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

        document.getElementById('boardSize').addEventListener('change', () => this.handleBoardSizeChange());
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

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#fafafa';
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                const x = this.padding + col * this.cellSize;
                const y = this.padding + row * this.cellSize;
                this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
            }
        }

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

    handleWorkerResponse(newPuzzle) {
        if (newPuzzle.type !== 'square') return; // Ignore hex puzzles
        
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

    checkSolution() {
        const numbersValid = this.checkNumbers();
        if (!numbersValid) {
            this.showMessage('Numbers constraint violated! Check the number of lines around each number.', 'error');
            return;
        }

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
        if (this.horizontalEdges[row][col] === 1) count++;
        if (this.horizontalEdges[row + 1][col] === 1) count++;
        if (this.verticalEdges[row][col] === 1) count++;
        if (this.verticalEdges[row][col + 1] === 1) count++;
        return count;
    }

    checkLoop() {
        const dots = new Map();
        const dotKey = (row, col) => `${row},${col}`;

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

        if (dots.size === 0) return false;

        for (const [dot, connections] of dots) {
            if (connections.length !== 2) {
                return false;
            }
        }

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


// ============================================
// HEXAGONAL SLITHERLINK
// ============================================

class HexSlitherlink {
    constructor(canvasId, worker) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Hexagon settings
        this.hexSize = 45; // Distance from center to vertex
        this.padding = 60;
        this.dotRadius = 4;
        this.lineWidth = 4;
        
        // Use the shared worker
        this.puzzleWorker = worker;
        
        // Initialize with default radius
        this.radius = 2; // 3 hexagons per side
        this.cells = [];
        this.numbers = {};
        this.edges = {}; // Edge states: 0 = empty, 1 = line, 2 = X
        this.solution = null;
        
        this.setupCanvas();
        this.generateCells();
        this.draw();
        
        // Generate initial puzzle
        this.showMessage('Generating hexagonal puzzle...', 'info');
        this.puzzleWorker.postMessage({ type: 'hexagonal', radius: this.radius });
    }
    
    getSelectedRadius() {
        const select = document.getElementById('hexBoardSize');
        return parseInt(select.value);
    }
    
    generateCells() {
        this.cells = [];
        for (let q = -this.radius; q <= this.radius; q++) {
            for (let r = -this.radius; r <= this.radius; r++) {
                if (Math.abs(q + r) <= this.radius) {
                    this.cells.push({ q, r });
                }
            }
        }
        
        // Initialize edges
        this.edges = {};
        this.numbers = {};
    }
    
    setupCanvas() {
        // Calculate canvas size based on hex grid
        const width = this.hexSize * 3.5 * (this.radius * 2 + 1) + 2 * this.padding;
        const height = this.hexSize * 2 * Math.sqrt(3) * (this.radius + 0.5) + 2 * this.padding;
        this.canvas.width = Math.max(400, width);
        this.canvas.height = Math.max(400, height);
        
        // Calculate center of canvas
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
    }
    
    setupEventListeners() {
        // Remove old listeners by cloning the canvas
        const newCanvas = this.canvas.cloneNode(true);
        this.canvas.parentNode.replaceChild(newCanvas, this.canvas);
        this.canvas = newCanvas;
        this.ctx = this.canvas.getContext('2d');
        
        this.canvas.addEventListener('click', (e) => this.handleClick(e, 'left'));
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.handleClick(e, 'right');
        });
    }
    
    // Convert axial coordinates to pixel coordinates (pointy-top hexagon)
    axialToPixel(q, r) {
        const x = this.hexSize * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
        const y = this.hexSize * (3 / 2 * r);
        return { x: this.centerX + x, y: this.centerY + y };
    }
    
    // Get the 6 vertices of a hexagon at (q, r)
    getHexVertices(q, r) {
        const center = this.axialToPixel(q, r);
        const vertices = [];
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 6 + (Math.PI / 3) * i; // Start at 30 degrees for pointy-top
            vertices.push({
                x: center.x + this.hexSize * Math.cos(angle),
                y: center.y + this.hexSize * Math.sin(angle)
            });
        }
        return vertices;
    }
    
    // Get neighbors of a hex cell
    getNeighbors(q, r) {
        // Order MUST match edge indices for pointy-top hexagons:
        // Edge i connects vertex[i] and vertex[(i+1)%6]
        // Vertex angles: 0=30°, 1=90°, 2=150°, 3=210°, 4=270°, 5=330°
        return [
            { q: q, r: r + 1, edge: 0 },      // Edge 0: Southeast
            { q: q - 1, r: r + 1, edge: 1 },  // Edge 1: Southwest
            { q: q - 1, r: r, edge: 2 },      // Edge 2: West
            { q: q, r: r - 1, edge: 3 },      // Edge 3: Northwest
            { q: q + 1, r: r - 1, edge: 4 },  // Edge 4: Northeast
            { q: q + 1, r: r, edge: 5 }       // Edge 5: East
        ];
    }
    
    // Create canonical edge key
    edgeKey(q1, r1, q2, r2) {
        if (q1 < q2 || (q1 === q2 && r1 < r2)) {
            return `${q1},${r1}|${q2},${r2}`;
        }
        return `${q2},${r2}|${q1},${r1}`;
    }
    
    cellKey(q, r) {
        return `${q},${r}`;
    }
    
    handleClick(e, button) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const edge = this.getEdgeFromPosition(x, y);
        
        if (edge) {
            const currentState = this.edges[edge.key] || 0;
            if (button === 'left') {
                this.edges[edge.key] = currentState === 1 ? 0 : 1;
            } else {
                this.edges[edge.key] = currentState === 2 ? 0 : 2;
            }
            this.draw();
        }
    }
    
    getEdgeFromPosition(x, y) {
        const threshold = 15;
        let closestEdge = null;
        let closestDist = threshold;
        
        // Check all edges
        const cellSet = new Set(this.cells.map(c => this.cellKey(c.q, c.r)));
        
        for (const cell of this.cells) {
            const vertices = this.getHexVertices(cell.q, cell.r);
            const neighbors = this.getNeighbors(cell.q, cell.r);
            
            for (let i = 0; i < 6; i++) {
                const neighbor = neighbors[i];
                const neighborKey = this.cellKey(neighbor.q, neighbor.r);
                
                // Only process edge if neighbor doesn't exist or has higher coordinates
                // This avoids processing each edge twice
                if (cellSet.has(neighborKey)) {
                    if (neighbor.q < cell.q || (neighbor.q === cell.q && neighbor.r < cell.r)) {
                        continue;
                    }
                }
                
                const v1 = vertices[i];
                const v2 = vertices[(i + 1) % 6];
                
                // Check distance from point to line segment
                const dist = this.pointToSegmentDistance(x, y, v1.x, v1.y, v2.x, v2.y);
                
                if (dist < closestDist) {
                    closestDist = dist;
                    closestEdge = {
                        key: this.edgeKey(cell.q, cell.r, neighbor.q, neighbor.r),
                        v1, v2
                    };
                }
            }
        }
        
        return closestEdge;
    }
    
    pointToSegmentDistance(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSq = dx * dx + dy * dy;
        
        if (lengthSq === 0) {
            return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
        }
        
        let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
        t = Math.max(0, Math.min(1, t));
        
        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;
        
        return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const cellSet = new Set(this.cells.map(c => this.cellKey(c.q, c.r)));
        
        // Draw hexagon fills
        this.ctx.fillStyle = '#fafafa';
        for (const cell of this.cells) {
            const vertices = this.getHexVertices(cell.q, cell.r);
            this.ctx.beginPath();
            this.ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < 6; i++) {
                this.ctx.lineTo(vertices[i].x, vertices[i].y);
            }
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        // Draw hexagon outlines (light gray)
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 1;
        for (const cell of this.cells) {
            const vertices = this.getHexVertices(cell.q, cell.r);
            this.ctx.beginPath();
            this.ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < 6; i++) {
                this.ctx.lineTo(vertices[i].x, vertices[i].y);
            }
            this.ctx.closePath();
            this.ctx.stroke();
        }
        
        // Draw numbers
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#333';
        
        for (const cell of this.cells) {
            const key = this.cellKey(cell.q, cell.r);
            const num = this.numbers[key];
            if (num !== null && num !== undefined) {
                const center = this.axialToPixel(cell.q, cell.r);
                this.ctx.fillText(num.toString(), center.x, center.y);
            }
        }
        
        // Draw edges and vertices
        const drawnEdges = new Set();
        const allVertices = new Map();
        
        for (const cell of this.cells) {
            const vertices = this.getHexVertices(cell.q, cell.r);
            const neighbors = this.getNeighbors(cell.q, cell.r);
            
            for (let i = 0; i < 6; i++) {
                const neighbor = neighbors[i];
                const key = this.edgeKey(cell.q, cell.r, neighbor.q, neighbor.r);
                
                if (!drawnEdges.has(key)) {
                    drawnEdges.add(key);
                    
                    const v1 = vertices[i];
                    const v2 = vertices[(i + 1) % 6];
                    const state = this.edges[key] || 0;
                    
                    if (state === 1) {
                        // Draw line
                        this.ctx.strokeStyle = '#000';
                        this.ctx.lineWidth = this.lineWidth;
                        this.ctx.lineCap = 'round';
                        this.ctx.beginPath();
                        this.ctx.moveTo(v1.x, v1.y);
                        this.ctx.lineTo(v2.x, v2.y);
                        this.ctx.stroke();
                    } else if (state === 2) {
                        // Draw X
                        const midX = (v1.x + v2.x) / 2;
                        const midY = (v1.y + v2.y) / 2;
                        this.drawX(midX, midY, 6);
                    }
                }
                
                // Collect vertex positions
                const v1Key = `${Math.round(vertices[i].x)},${Math.round(vertices[i].y)}`;
                allVertices.set(v1Key, vertices[i]);
            }
        }
        
        // Draw vertices (dots)
        this.ctx.fillStyle = '#000';
        for (const [key, v] of allVertices) {
            this.ctx.beginPath();
            this.ctx.arc(v.x, v.y, this.dotRadius, 0, Math.PI * 2);
            this.ctx.fill();
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
    
    handleBoardSizeChange() {
        this.radius = this.getSelectedRadius();
        this.generateCells();
        this.setupCanvas();
        this.nextPuzzle();
    }
    
    clearBoard() {
        this.edges = {};
        this.draw();
        this.showMessage('Board cleared!', 'info');
    }
    
    showSolution() {
        if (!this.solution || !this.solution.edges) {
            this.showMessage('No solution available. Generate a new puzzle first!', 'error');
            return;
        }
        
        this.edges = { ...this.solution.edges };
        this.draw();
        this.showMessage('Solution displayed!', 'success');
    }
    
    nextPuzzle() {
        this.showMessage('Generating hexagonal puzzle...', 'info');
        console.log('Starting hex puzzle generation in worker...');
        this.puzzleWorker.postMessage({ type: 'hexagonal', radius: this.radius });
    }
    
    handleWorkerResponse(puzzle) {
        if (puzzle.type !== 'hexagonal') return;
        
        console.log('Received hex puzzle from worker!');
        
        this.radius = puzzle.radius;
        this.cells = puzzle.cells;
        this.numbers = puzzle.numbers;
        this.solution = puzzle.solution;
        this.edges = {};
        
        this.setupCanvas();
        this.setupEventListeners();
        this.draw();
        this.showMessage('New hexagonal puzzle generated!', 'info');
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
        for (const cell of this.cells) {
            const key = this.cellKey(cell.q, cell.r);
            const num = this.numbers[key];
            
            if (num !== null && num !== undefined) {
                const count = this.countLinesAroundCell(cell.q, cell.r);
                if (count !== num) {
                    return false;
                }
            }
        }
        return true;
    }
    
    countLinesAroundCell(q, r) {
        const neighbors = this.getNeighbors(q, r);
        let count = 0;
        
        for (const neighbor of neighbors) {
            const edgeKey = this.edgeKey(q, r, neighbor.q, neighbor.r);
            if (this.edges[edgeKey] === 1) {
                count++;
            }
        }
        
        return count;
    }
    
    checkLoop() {
        // Build adjacency list of vertices connected by lines
        const vertices = new Map();
        const cellSet = new Set(this.cells.map(c => this.cellKey(c.q, c.r)));
        
        const vertexKey = (x, y) => `${Math.round(x * 100)},${Math.round(y * 100)}`;
        
        for (const cell of this.cells) {
            const hexVertices = this.getHexVertices(cell.q, cell.r);
            const neighbors = this.getNeighbors(cell.q, cell.r);
            
            for (let i = 0; i < 6; i++) {
                const neighbor = neighbors[i];
                const edgeKey = this.edgeKey(cell.q, cell.r, neighbor.q, neighbor.r);
                
                if (this.edges[edgeKey] === 1) {
                    const v1 = hexVertices[i];
                    const v2 = hexVertices[(i + 1) % 6];
                    
                    const v1Key = vertexKey(v1.x, v1.y);
                    const v2Key = vertexKey(v2.x, v2.y);
                    
                    if (!vertices.has(v1Key)) vertices.set(v1Key, []);
                    if (!vertices.has(v2Key)) vertices.set(v2Key, []);
                    
                    // Avoid adding duplicate connections
                    if (!vertices.get(v1Key).includes(v2Key)) {
                        vertices.get(v1Key).push(v2Key);
                    }
                    if (!vertices.get(v2Key).includes(v1Key)) {
                        vertices.get(v2Key).push(v1Key);
                    }
                }
            }
        }
        
        if (vertices.size === 0) return false;
        
        // Each vertex must have exactly 0 or 2 connections
        for (const [vertex, connections] of vertices) {
            if (connections.length !== 2) {
                return false;
            }
        }
        
        // All vertices must form a single connected component
        const visited = new Set();
        const start = vertices.keys().next().value;
        const queue = [start];
        visited.add(start);
        
        while (queue.length > 0) {
            const current = queue.shift();
            for (const neighbor of vertices.get(current)) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }
        
        return visited.size === vertices.size;
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


// ============================================
// GAME CONTROLLER
// ============================================

class GameController {
    constructor() {
        this.currentGame = null;
        this.currentType = 'square';
        this.sharedWorker = null;
        
        this.init();
    }
    
    init() {
        // Create shared worker
        this.createSharedWorker();
        
        // Initialize with square game
        this.currentGame = new SlitherlinkGame('gameCanvas');
        this.sharedWorker = this.currentGame.puzzleWorker;
        
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
    
    createSharedWorker() {
        // Worker will be created by the first game instance
    }
    
    switchBoardType(type) {
        this.currentType = type;
        
        // Show/hide appropriate size selector
        const squareSelector = document.getElementById('squareSizeSelector');
        const hexSelector = document.getElementById('hexSizeSelector');
        
        if (type === 'square') {
            squareSelector.style.display = 'flex';
            hexSelector.style.display = 'none';
            
            // Create new square game
            this.currentGame = new SlitherlinkGame('gameCanvas');
            this.sharedWorker = this.currentGame.puzzleWorker;
            
        } else if (type === 'hexagonal') {
            squareSelector.style.display = 'none';
            hexSelector.style.display = 'flex';
            
            // Create new hex game using the shared worker
            this.currentGame = new HexSlitherlink('gameCanvas', this.sharedWorker);
            
            // Setup worker response handler for hex
            this.sharedWorker.onmessage = (e) => {
                if (e.data.type === 'hexagonal') {
                    this.currentGame.handleWorkerResponse(e.data);
                }
            };
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


// Initialize game controller when page loads
window.addEventListener('DOMContentLoaded', () => {
    new GameController();
});

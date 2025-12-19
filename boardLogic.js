// ============================================
// BOARD LOGIC - Pure computation functions
// ============================================

/**
 * Get the inline worker code for puzzle generation.
 * This returns the worker code as a string to be used with Blob URLs.
 */
export function getWorkerCode() {
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
    if (q1 < q2 || (q1 === q2 && r1 < r2)) {
        return \`\${q1},\${r1}|\${q2},\${r2}\`;
    }
    return \`\${q2},\${r2}|\${q1},\${r1}\`;
}

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

function validateHexLoop(edges, cells) {
    const size = 1;
    const cellSet = new Set(cells.map(c => hexCellKey(c.q, c.r)));
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
    
    if (vertexConnections.size === 0) {
        console.log(\`Worker: Validation failed - no edges\`);
        return false;
    }
    
    for (const [vertex, connections] of vertexConnections) {
        if (connections.size !== 2) {
            console.log(\`Worker: Validation failed - vertex has \${connections.size} connections (need 2)\`);
            return false;
        }
    }
    
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
        console.log(\`Worker: Validation failed - multiple disconnected components\`);
        return false;
    }
    
    console.log(\`Worker: Loop validation passed!\`);
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
    
    const getBoundaryCells = () => {
        const boundary = [];
        for (const cell of cells) {
            const key = hexCellKey(cell.q, cell.r);
            if (!inside.has(key)) continue;
            
            const neighbors = getHexNeighbors(cell.q, cell.r);
            let isBoundary = false;
            for (const n of neighbors) {
                const nKey = hexCellKey(n.q, n.r);
                if (!cellSet.has(nKey) || carved.has(nKey)) {
                    isBoundary = true;
                    break;
                }
            }
            if (isBoundary) boundary.push(cell);
        }
        return boundary;
    };
    
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
    
    const buildEdges = () => {
        const edges = {};
        
        for (const cell of cells) {
            const key = hexCellKey(cell.q, cell.r);
            if (!inside.has(key)) continue;
            
            const neighbors = getHexNeighbors(cell.q, cell.r);
            
            for (let i = 0; i < 6; i++) {
                const neighbor = neighbors[i];
                const nKey = hexCellKey(neighbor.q, neighbor.r);
                
                if (!inside.has(nKey)) {
                    const edgeKey = hexEdgeKey(cell.q, cell.r, neighbor.q, neighbor.r);
                    edges[edgeKey] = 1;
                }
            }
        }
        
        return edges;
    };
    
    let iterations = 0;
    const maxIterations = totalCells * 5;
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 30;
    
    while (iterations < maxIterations && carved.size < targetCarve) {
        iterations++;
        
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
            
            inside.delete(key);
            
            if (!isInsideConnected()) {
                inside.add(key);
                continue;
            }
            
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
    
    console.log(\`Worker: Carved \${carved.size} cells out of \${totalCells}\`);
    
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
    
    console.log(\`Worker: Selected \${Object.keys(clues).length} clues\`);
    return clues;
}
`;
}

/**
 * Create an inline web worker from the worker code.
 * Returns { worker, workerUrl } - caller is responsible for cleanup.
 */
export function createInlineWorker() {
    const workerCode = getWorkerCode();
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    return { worker, workerUrl };
}

/**
 * Clean up worker resources.
 */
export function destroyWorker(worker, workerUrl) {
    if (worker) {
        worker.terminate();
    }
    if (workerUrl) {
        URL.revokeObjectURL(workerUrl);
    }
}

// ============================================
// SQUARE GRID VALIDATION
// ============================================

/**
 * Check if all number constraints are satisfied in a square grid.
 */
export function checkSquareNumbers(numbers, horizontalEdges, verticalEdges, gridWidth, gridHeight) {
    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            const num = numbers[row][col];
            if (num !== null) {
                const count = countSquareLinesAroundCell(horizontalEdges, verticalEdges, row, col);
                if (count !== num) {
                    return false;
                }
            }
        }
    }
    return true;
}

/**
 * Count the number of active lines around a square cell.
 */
export function countSquareLinesAroundCell(horizontalEdges, verticalEdges, row, col) {
    let count = 0;
    if (horizontalEdges[row][col] === 1) count++;
    if (horizontalEdges[row + 1][col] === 1) count++;
    if (verticalEdges[row][col] === 1) count++;
    if (verticalEdges[row][col + 1] === 1) count++;
    return count;
}

/**
 * Check if the lines form a valid single loop in a square grid.
 */
export function checkSquareLoop(horizontalEdges, verticalEdges, gridWidth, gridHeight) {
    const dots = new Map();
    const dotKey = (row, col) => `${row},${col}`;

    // Build adjacency list from horizontal edges
    for (let row = 0; row <= gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            if (horizontalEdges[row][col] === 1) {
                const dot1 = dotKey(row, col);
                const dot2 = dotKey(row, col + 1);
                if (!dots.has(dot1)) dots.set(dot1, []);
                if (!dots.has(dot2)) dots.set(dot2, []);
                dots.get(dot1).push(dot2);
                dots.get(dot2).push(dot1);
            }
        }
    }

    // Build adjacency list from vertical edges
    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col <= gridWidth; col++) {
            if (verticalEdges[row][col] === 1) {
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

    // Each vertex must have exactly 2 connections
    for (const [dot, connections] of dots) {
        if (connections.length !== 2) {
            return false;
        }
    }

    // All vertices must be in a single connected component
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

// ============================================
// HEXAGONAL GRID UTILITIES
// ============================================

/**
 * Get the 6 neighbors of a hex cell in axial coordinates.
 */
export function getHexNeighbors(q, r) {
    return [
        { q: q, r: r + 1, edge: 0 },      // Edge 0: Southeast
        { q: q - 1, r: r + 1, edge: 1 },  // Edge 1: Southwest
        { q: q - 1, r: r, edge: 2 },      // Edge 2: West
        { q: q, r: r - 1, edge: 3 },      // Edge 3: Northwest
        { q: q + 1, r: r - 1, edge: 4 },  // Edge 4: Northeast
        { q: q + 1, r: r, edge: 5 }       // Edge 5: East
    ];
}

/**
 * Create a canonical key for a hex cell.
 */
export function hexCellKey(q, r) {
    return `${q},${r}`;
}

/**
 * Create a canonical key for a hex edge (between two cells).
 */
export function hexEdgeKey(q1, r1, q2, r2) {
    if (q1 < q2 || (q1 === q2 && r1 < r2)) {
        return `${q1},${r1}|${q2},${r2}`;
    }
    return `${q2},${r2}|${q1},${r1}`;
}

/**
 * Count the number of active lines around a hex cell.
 */
export function countHexLinesAroundCell(edges, q, r) {
    const neighbors = getHexNeighbors(q, r);
    let count = 0;
    
    for (const neighbor of neighbors) {
        const edgeKey = hexEdgeKey(q, r, neighbor.q, neighbor.r);
        if (edges[edgeKey] === 1) {
            count++;
        }
    }
    
    return count;
}

/**
 * Check if all number constraints are satisfied in a hex grid.
 */
export function checkHexNumbers(cells, numbers, edges) {
    for (const cell of cells) {
        const key = hexCellKey(cell.q, cell.r);
        const num = numbers[key];
        
        if (num !== null && num !== undefined) {
            const count = countHexLinesAroundCell(edges, cell.q, cell.r);
            if (count !== num) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Check if the lines form a valid single loop in a hex grid.
 */
export function checkHexLoop(cells, edges, getHexVertices) {
    const vertices = new Map();
    const vertexKey = (x, y) => `${Math.round(x * 100)},${Math.round(y * 100)}`;
    
    for (const cell of cells) {
        const hexVertices = getHexVertices(cell.q, cell.r);
        const neighbors = getHexNeighbors(cell.q, cell.r);
        
        for (let i = 0; i < 6; i++) {
            const neighbor = neighbors[i];
            const edgeK = hexEdgeKey(cell.q, cell.r, neighbor.q, neighbor.r);
            
            if (edges[edgeK] === 1) {
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
    
    // Each vertex must have exactly 2 connections
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


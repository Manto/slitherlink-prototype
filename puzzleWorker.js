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

function generatePuzzle(width, height) {
    // Generate a valid random loop solution
    console.log('Worker: Generating random loop...');
    const solution = generateRandomLoop(width, height);

    // Extract all possible numbers from the solution
    console.log('Worker: Extracting numbers from solution...');
    const allNumbers = extractNumbersFromSolution(width, height, solution.horizontal, solution.vertical);

    // Select which numbers to reveal as clues
    console.log('Worker: Selecting clues...');
    const clueNumbers = selectClues(allNumbers, width, height);

    return {
        width: width,
        height: height,
        numbers: clueNumbers,
        solution: solution
    };
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
        console.log(`Worker: Generation attempt ${attempts}/10...`);

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

        const useWinding = Math.random() > 0.3;
        console.log(`Worker:   Using ${useWinding ? 'winding' : 'recursive'} algorithm...`);

        if (useWinding) {
            success = generateWindingLoop(width, height, horizontal, vertical);
        } else {
            success = generateRecursiveLoop(width, height, horizontal, vertical);
        }

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
        console.log('Worker: All attempts failed, using fallback rectangular loop');
        generateSimpleRectangularLoop(width, height, horizontal, vertical);
    }

    return { horizontal, vertical };
}

function validateSingleRegion(width, height, horizontal, vertical) {
    const outside = Array(height).fill(null).map(() => Array(width).fill(false));
    const queue = [];

    for (let row = 0; row < height; row++) {
        if (vertical[row][0] === 0) {
            queue.push([row, 0]);
            outside[row][0] = true;
        }
        if (vertical[row][width] === 0) {
            queue.push([row, width - 1]);
            outside[row][width - 1] = true;
        }
    }

    for (let col = 0; col < width; col++) {
        if (horizontal[0][col] === 0) {
            queue.push([0, col]);
            outside[0][col] = true;
        }
        if (horizontal[height][col] === 0) {
            queue.push([height - 1, col]);
            outside[height - 1][col] = true;
        }
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
            if (newRow >= 0 && newRow < height &&
                newCol >= 0 && newCol < width &&
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

                if (insideRegions > 1) {
                    return false;
                }

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

    return insideRegions === 1;
}

function generateWindingLoop(width, height, horizontal, vertical) {
    const path = [];
    const visited = new Set();

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

    for (let step = 0; step < 100; step++) {
        visited.add(getKey(row, col));

        let availableDirs = directions.filter(dir => {
            const newRow = row + dir.dr;
            const newCol = col + dir.dc;
            return newRow >= 0 && newRow <= height &&
                   newCol >= 0 && newCol <= width;
        });

        if (lastDir && Math.random() > 0.3) {
            const turningDirs = availableDirs.filter(dir => dir.name !== lastDir);
            if (turningDirs.length > 0) {
                availableDirs = turningDirs;
            }
        }

        if (path.length > 15) {
            const toStart = availableDirs.find(dir =>
                row + dir.dr === startRow && col + dir.dc === startCol
            );
            if (toStart && Math.random() > 0.5) {
                path.push({ row, col, newRow: startRow, newCol: startCol, dir: toStart.type });
                break;
            }
        }

        availableDirs = availableDirs.filter(dir => {
            const newKey = getKey(row + dir.dr, col + dir.dc);
            return !visited.has(newKey) ||
                   (path.length > 15 && row + dir.dr === startRow && col + dir.dc === startCol);
        });

        if (availableDirs.length === 0) {
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
            return false;
        }

        const randomDirs = shuffle([...availableDirs]);
        const chosenDir = randomDirs[0];

        const newRow = row + chosenDir.dr;
        const newCol = col + chosenDir.dc;

        path.push({ row, col, newRow, newCol, dir: chosenDir.type });
        lastDir = chosenDir.name;

        row = newRow;
        col = newCol;
    }

    if (row !== startRow || col !== startCol || path.length < 12) {
        return false;
    }

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

function generateRecursiveLoop(width, height, horizontal, vertical) {
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

function generateSimpleRectangularLoop(width, height, horizontal, vertical) {
    const margin = 1;

    if (width < 3 || height < 3) {
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

    for (let col = leftCol; col < rightCol; col++) {
        horizontal[topRow][col] = 1;
    }

    for (let col = leftCol; col < rightCol; col++) {
        horizontal[bottomRow][col] = 1;
    }

    for (let row = topRow; row < bottomRow; row++) {
        vertical[row][leftCol] = 1;
    }

    for (let row = topRow; row < bottomRow; row++) {
        vertical[row][rightCol] = 1;
    }

    const numIndents = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < numIndents; i++) {
        const side = Math.floor(Math.random() * 4);

        if (side === 0 && topRow > 0) {
            const col = leftCol + 1 + Math.floor(Math.random() * (rightCol - leftCol - 2));
            horizontal[topRow][col] = 0;
            horizontal[topRow - 1][col] = 1;
            vertical[topRow - 1][col] = 1;
            vertical[topRow - 1][col + 1] = 1;
        } else if (side === 1 && rightCol < width) {
            const row = topRow + 1 + Math.floor(Math.random() * (bottomRow - topRow - 2));
            vertical[row][rightCol] = 0;
            vertical[row][rightCol + 1] = 1;
            horizontal[row][rightCol] = 1;
            horizontal[row + 1][rightCol] = 1;
        } else if (side === 2 && bottomRow < height) {
            const col = leftCol + 1 + Math.floor(Math.random() * (rightCol - leftCol - 2));
            horizontal[bottomRow][col] = 0;
            horizontal[bottomRow + 1][col] = 1;
            vertical[bottomRow][col] = 1;
            vertical[bottomRow][col + 1] = 1;
        } else if (side === 3 && leftCol > 0) {
            const row = topRow + 1 + Math.floor(Math.random() * (bottomRow - topRow - 2));
            vertical[row][leftCol] = 0;
            vertical[row][leftCol - 1] = 1;
            horizontal[row][leftCol - 1] = 1;
            horizontal[row + 1][leftCol - 1] = 1;
        }
    }
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

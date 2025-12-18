// Web Worker for generating Slitherlink puzzles
// Runs in a separate thread to avoid blocking the UI

self.onmessage = function(e) {
    const { width, height } = e.data;
    console.log(`Worker: Starting puzzle generation for ${width}x${height}...`);

    const puzzle = generatePuzzle(width, height);

    console.log('Worker: Puzzle generation complete!');
    self.postMessage(puzzle);
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

function selectClues(allNumbers, width, height) {
    const clues = Array(height).fill(null).map(() => Array(width).fill(null));

    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const num = allNumbers[row][col];

            if (num === 0 || num === 3) {
                if (Math.random() > 0.15) {
                    clues[row][col] = num;
                }
            }
            else if (num === 4) {
                if (Math.random() > 0.25) {
                    clues[row][col] = num;
                }
            }
            else if (num === 1) {
                if (Math.random() > 0.55) {
                    clues[row][col] = num;
                }
            }
            else if (num === 2) {
                if (Math.random() > 0.60) {
                    clues[row][col] = num;
                }
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
                    if (clues[r][c] === null) {
                        clues[r][c] = allNumbers[r][c];
                    }
                }
            }
        }
    }

    return clues;
}

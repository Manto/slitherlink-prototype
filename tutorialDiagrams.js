// Tutorial diagram renderer for Slitherlink
export function initTutorialDiagrams() {
    initModal();
    drawValidExample();
    drawInvalidExamples();
}

function initModal() {
    const modal = document.getElementById('tutorialModal');
    const tutorialBtn = document.getElementById('tutorialBtn');
    const closeBtn = document.getElementById('modalCloseBtn');

    if (!modal || !tutorialBtn || !closeBtn) return;

    tutorialBtn.addEventListener('click', () => {
        modal.classList.add('active');
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

function drawValidExample() {
    const canvas = document.getElementById('tutorialValidCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const cellSize = 50;
    const padding = 25;
    const dotRadius = 4;
    const lineWidth = 3;
    const gridWidth = 3;
    const gridHeight = 2;

    // Set canvas size
    canvas.width = cellSize * gridWidth + padding * 2;
    canvas.height = cellSize * gridHeight + padding * 2;

    // Clear canvas
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Define which cells exist (L-shape: bottom-right is carved out)
    const cellExists = [
        [true, true, true],
        [true, true, false]  // bottom-right carved out
    ];

    // Draw cell backgrounds
    ctx.fillStyle = '#fafafa';
    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            if (cellExists[row][col]) {
                ctx.fillRect(
                    padding + col * cellSize,
                    padding + row * cellSize,
                    cellSize,
                    cellSize
                );
            }
        }
    }

    // Draw grid lines (light) only for existing cells
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;

    // Draw borders of existing cells
    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            if (cellExists[row][col]) {
                const x = padding + col * cellSize;
                const y = padding + row * cellSize;
                ctx.strokeRect(x, y, cellSize, cellSize);
            }
        }
    }

    // Draw numbers in cells
    // L-shape loop: numbers show how many sides are part of the loop
    const numbers = [
        [2, 1, 3],
        [2, 2, null]  // null for carved out cell
    ];

    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#333';

    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            const num = numbers[row][col];
            if (num !== null) {
                const x = padding + (col + 0.5) * cellSize;
                const y = padding + (row + 0.5) * cellSize;
                ctx.fillText(num.toString(), x, y);
            }
        }
    }

    // Draw the solution loop around the L-shape
    ctx.strokeStyle = '#333';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    // The loop traces around the L-shape:
    // Top edge (full width)
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding + gridWidth * cellSize, padding);
    ctx.stroke();

    // Right edge of top-right cell
    ctx.beginPath();
    ctx.moveTo(padding + gridWidth * cellSize, padding);
    ctx.lineTo(padding + gridWidth * cellSize, padding + cellSize);
    ctx.stroke();

    // Inner horizontal edge (between top-right and carved corner)
    ctx.beginPath();
    ctx.moveTo(padding + gridWidth * cellSize, padding + cellSize);
    ctx.lineTo(padding + 2 * cellSize, padding + cellSize);
    ctx.stroke();

    // Inner vertical edge (right side of cell [1,1])
    ctx.beginPath();
    ctx.moveTo(padding + 2 * cellSize, padding + cellSize);
    ctx.lineTo(padding + 2 * cellSize, padding + gridHeight * cellSize);
    ctx.stroke();

    // Bottom edge (2 cells wide)
    ctx.beginPath();
    ctx.moveTo(padding + 2 * cellSize, padding + gridHeight * cellSize);
    ctx.lineTo(padding, padding + gridHeight * cellSize);
    ctx.stroke();

    // Left edge (full height)
    ctx.beginPath();
    ctx.moveTo(padding, padding + gridHeight * cellSize);
    ctx.lineTo(padding, padding);
    ctx.stroke();

    // Draw vertices (dots) only for existing cell corners
    ctx.fillStyle = '#333';
    const drawnVertices = new Set();

    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            if (cellExists[row][col]) {
                // Draw all 4 corners of this cell
                const corners = [
                    [col, row], [col + 1, row],
                    [col, row + 1], [col + 1, row + 1]
                ];
                for (const [c, r] of corners) {
                    const key = `${c},${r}`;
                    if (!drawnVertices.has(key)) {
                        drawnVertices.add(key);
                        const x = padding + c * cellSize;
                        const y = padding + r * cellSize;
                        ctx.beginPath();
                        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }
    }
}

function drawInvalidExamples() {
    const canvas = document.getElementById('tutorialInvalidCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const cellSize = 50;
    const padding = 25;
    const dotRadius = 4;
    const lineWidth = 3;
    const gridSize = 2;
    const exampleWidth = cellSize * gridSize + padding * 2;
    const gap = 40;

    // Set canvas size for two examples side by side
    canvas.width = exampleWidth * 2 + gap;
    canvas.height = cellSize * gridSize + padding * 2;

    // Clear canvas
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ===== Example 1: Non-closed shape (open ends) =====
    const offset1 = 0;

    // Draw cell backgrounds
    ctx.fillStyle = '#fafafa';
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            ctx.fillRect(
                offset1 + padding + col * cellSize,
                padding + row * cellSize,
                cellSize,
                cellSize
            );
        }
    }

    // Draw grid lines (light)
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(offset1 + padding, padding + i * cellSize);
        ctx.lineTo(offset1 + padding + gridSize * cellSize, padding + i * cellSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(offset1 + padding + i * cellSize, padding);
        ctx.lineTo(offset1 + padding + i * cellSize, padding + gridSize * cellSize);
        ctx.stroke();
    }

    // Draw an open path (not closed) - an L shape with open ends
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    // Top edge
    ctx.beginPath();
    ctx.moveTo(offset1 + padding, padding);
    ctx.lineTo(offset1 + padding + gridSize * cellSize, padding);
    ctx.stroke();

    // Right edge (only top half)
    ctx.beginPath();
    ctx.moveTo(offset1 + padding + gridSize * cellSize, padding);
    ctx.lineTo(offset1 + padding + gridSize * cellSize, padding + cellSize);
    ctx.stroke();

    // Left edge (only top half)
    ctx.beginPath();
    ctx.moveTo(offset1 + padding, padding);
    ctx.lineTo(offset1 + padding, padding + cellSize);
    ctx.stroke();

    // Draw open end indicators (small circles at open ends)
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(offset1 + padding + gridSize * cellSize, padding + cellSize, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(offset1 + padding, padding + cellSize, 6, 0, Math.PI * 2);
    ctx.fill();

    // Draw vertices (dots)
    ctx.fillStyle = '#333';
    for (let row = 0; row <= gridSize; row++) {
        for (let col = 0; col <= gridSize; col++) {
            const x = offset1 + padding + col * cellSize;
            const y = padding + row * cellSize;
            ctx.beginPath();
            ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Label
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c0392b';
    ctx.fillText('Not closed', offset1 + padding + cellSize, padding + gridSize * cellSize + 15);

    // ===== Example 2: Intersecting/branching lines =====
    const offset2 = exampleWidth + gap;

    // Draw cell backgrounds
    ctx.fillStyle = '#fafafa';
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            ctx.fillRect(
                offset2 + padding + col * cellSize,
                padding + row * cellSize,
                cellSize,
                cellSize
            );
        }
    }

    // Draw grid lines (light)
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(offset2 + padding, padding + i * cellSize);
        ctx.lineTo(offset2 + padding + gridSize * cellSize, padding + i * cellSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(offset2 + padding + i * cellSize, padding);
        ctx.lineTo(offset2 + padding + i * cellSize, padding + gridSize * cellSize);
        ctx.stroke();
    }

    // Draw branching lines (3 lines meeting at one vertex)
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    // Three lines meeting at center-top vertex
    const centerX = offset2 + padding + cellSize;
    const topY = padding;

    // Line going left
    ctx.beginPath();
    ctx.moveTo(offset2 + padding, topY);
    ctx.lineTo(centerX, topY);
    ctx.stroke();

    // Line going right
    ctx.beginPath();
    ctx.moveTo(centerX, topY);
    ctx.lineTo(offset2 + padding + gridSize * cellSize, topY);
    ctx.stroke();

    // Line going down from center
    ctx.beginPath();
    ctx.moveTo(centerX, topY);
    ctx.lineTo(centerX, padding + cellSize);
    ctx.stroke();

    // Highlight the problematic vertex with a warning circle
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(centerX, topY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', centerX, topY);

    // Draw vertices (dots)
    ctx.fillStyle = '#333';
    for (let row = 0; row <= gridSize; row++) {
        for (let col = 0; col <= gridSize; col++) {
            if (!(row === 0 && col === 1)) { // Skip the problematic vertex
                const x = offset2 + padding + col * cellSize;
                const y = padding + row * cellSize;
                ctx.beginPath();
                ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // Label
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c0392b';
    ctx.fillText('Branching', offset2 + padding + cellSize, padding + gridSize * cellSize + 15);
}

// Tutorial diagram renderer for Slitherlink
export function initTutorialDiagrams() {
    drawValidExample();
    drawInvalidExamples();
}

function drawValidExample() {
    const canvas = document.getElementById('tutorialValidCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const cellSize = 50;
    const padding = 25;
    const dotRadius = 4;
    const lineWidth = 3;
    const gridSize = 2;

    // Set canvas size
    canvas.width = cellSize * gridSize + padding * 2;
    canvas.height = cellSize * gridSize + padding * 2;

    // Clear canvas
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw cell backgrounds
    ctx.fillStyle = '#fafafa';
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            ctx.fillRect(
                padding + col * cellSize,
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
        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(padding, padding + i * cellSize);
        ctx.lineTo(padding + gridSize * cellSize, padding + i * cellSize);
        ctx.stroke();
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(padding + i * cellSize, padding);
        ctx.lineTo(padding + i * cellSize, padding + gridSize * cellSize);
        ctx.stroke();
    }

    // Draw numbers in cells
    // A valid 2x2 puzzle: numbers show how many sides are part of the loop
    // Loop path: forms a rectangle around the outside
    const numbers = [
        [2, 2],
        [2, 2]
    ];

    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#333';

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const num = numbers[row][col];
            if (num !== null) {
                const x = padding + (col + 0.5) * cellSize;
                const y = padding + (row + 0.5) * cellSize;
                ctx.fillText(num.toString(), x, y);
            }
        }
    }

    // Draw the solution loop (outer rectangle)
    // The loop goes around the outside of the grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    // Top edge
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding + gridSize * cellSize, padding);
    ctx.stroke();

    // Right edge
    ctx.beginPath();
    ctx.moveTo(padding + gridSize * cellSize, padding);
    ctx.lineTo(padding + gridSize * cellSize, padding + gridSize * cellSize);
    ctx.stroke();

    // Bottom edge
    ctx.beginPath();
    ctx.moveTo(padding + gridSize * cellSize, padding + gridSize * cellSize);
    ctx.lineTo(padding, padding + gridSize * cellSize);
    ctx.stroke();

    // Left edge
    ctx.beginPath();
    ctx.moveTo(padding, padding + gridSize * cellSize);
    ctx.lineTo(padding, padding);
    ctx.stroke();

    // Draw vertices (dots)
    ctx.fillStyle = '#333';
    for (let row = 0; row <= gridSize; row++) {
        for (let col = 0; col <= gridSize; col++) {
            const x = padding + col * cellSize;
            const y = padding + row * cellSize;
            ctx.beginPath();
            ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
            ctx.fill();
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

// Tutorial diagram renderer for Slitherlink
// Track initialization to prevent duplicate event listeners
let modalInitialized = false;

export function initTutorialDiagrams() {
    initModal();
    drawZeroExample();
    drawInsideOutsideExample();
}

function initModal() {
    // Prevent duplicate initialization
    if (modalInitialized) {
        return;
    }

    const modal = document.getElementById('tutorialModal');
    const tutorialBtn = document.getElementById('tutorialBtn');
    const closeBtn = document.getElementById('modalCloseBtn');

    if (!modal || !tutorialBtn || !closeBtn) {
        console.error('Modal elements not found:', { modal, tutorialBtn, closeBtn });
        return;
    }

    function openModal() {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }

    // Ensure modal starts hidden
    closeModal();

    tutorialBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openModal();
    });

    closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Close modal on Escape key - store reference for potential cleanup
    function handleEscapeKey(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    }

    document.addEventListener('keydown', handleEscapeKey);

    // Mark as initialized to prevent duplicates
    modalInitialized = true;
}

function drawZeroExample() {
    const canvas = document.getElementById('tutorialZeroCanvas');
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

    // Draw cell backgrounds - highlight the 0 cell with a different color
    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            // Middle cell (1,0) will have 0 - highlight it
            if (row === 0 && col === 1) {
                ctx.fillStyle = '#fff3cd'; // Light yellow highlight for 0 cell
            } else {
                ctx.fillStyle = '#fafafa';
            }
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
    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            const x = padding + col * cellSize;
            const y = padding + row * cellSize;
            ctx.strokeRect(x, y, cellSize, cellSize);
        }
    }

    // Draw numbers in cells
    // The middle top cell has 0, loop goes around it
    const numbers = [
        [2, 0, 2],
        [2, 2, 2]
    ];

    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            const num = numbers[row][col];
            const x = padding + (col + 0.5) * cellSize;
            const y = padding + (row + 0.5) * cellSize;
            // Highlight 0 with a different color
            if (num === 0) {
                ctx.fillStyle = '#856404'; // Dark yellow/amber for 0
            } else {
                ctx.fillStyle = '#333';
            }
            ctx.fillText(num.toString(), x, y);
        }
    }

    // Draw the solution loop - goes around the entire grid except avoids
    // touching any edge of the 0 cell
    ctx.strokeStyle = '#333';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    // Top-left cell top edge
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding + cellSize, padding);
    ctx.stroke();

    // Top-right cell top edge
    ctx.beginPath();
    ctx.moveTo(padding + 2 * cellSize, padding);
    ctx.lineTo(padding + 3 * cellSize, padding);
    ctx.stroke();

    // Left edge (full height)
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + 2 * cellSize);
    ctx.stroke();

    // Right edge (full height)
    ctx.beginPath();
    ctx.moveTo(padding + 3 * cellSize, padding);
    ctx.lineTo(padding + 3 * cellSize, padding + 2 * cellSize);
    ctx.stroke();

    // Bottom edge (full width)
    ctx.beginPath();
    ctx.moveTo(padding, padding + 2 * cellSize);
    ctx.lineTo(padding + 3 * cellSize, padding + 2 * cellSize);
    ctx.stroke();

    // Inner edges going around the 0 cell
    // Left side of 0 cell (vertical)
    ctx.beginPath();
    ctx.moveTo(padding + cellSize, padding);
    ctx.lineTo(padding + cellSize, padding + cellSize);
    ctx.stroke();

    // Right side of 0 cell (vertical)
    ctx.beginPath();
    ctx.moveTo(padding + 2 * cellSize, padding);
    ctx.lineTo(padding + 2 * cellSize, padding + cellSize);
    ctx.stroke();

    // Bottom of 0 cell connects to bottom row
    ctx.beginPath();
    ctx.moveTo(padding + cellSize, padding + cellSize);
    ctx.lineTo(padding + 2 * cellSize, padding + cellSize);
    ctx.stroke();

    // Draw vertices (dots)
    ctx.fillStyle = '#333';
    for (let row = 0; row <= gridHeight; row++) {
        for (let col = 0; col <= gridWidth; col++) {
            const x = padding + col * cellSize;
            const y = padding + row * cellSize;
            ctx.beginPath();
            ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawInsideOutsideExample() {
    const canvas = document.getElementById('tutorialInsideOutsideCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const cellSize = 50;
    const padding = 25;
    const dotRadius = 4;
    const lineWidth = 3;
    const gridWidth = 3;
    const gridHeight = 3;

    // Set canvas size
    canvas.width = cellSize * gridWidth + padding * 2;
    canvas.height = cellSize * gridHeight + padding * 2;

    // Clear canvas
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Define cells inside vs outside the loop
    // Loop will go around the center cell, so center is "inside", edges are "outside"
    const isInside = [
        [false, false, false],
        [false, true, false],
        [false, false, false]
    ];

    // Draw cell backgrounds with different colors for inside vs outside
    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            if (isInside[row][col]) {
                ctx.fillStyle = '#d4edda'; // Light green for inside
            } else {
                ctx.fillStyle = '#e8f4fd'; // Light blue for outside
            }
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
    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            const x = padding + col * cellSize;
            const y = padding + row * cellSize;
            ctx.strokeRect(x, y, cellSize, cellSize);
        }
    }

    // Draw numbers - cells both inside and outside have numbers
    const numbers = [
        [1, 2, 1],
        [2, 4, 2],
        [1, 2, 1]
    ];

    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            const num = numbers[row][col];
            const x = padding + (col + 0.5) * cellSize;
            const y = padding + (row + 0.5) * cellSize;
            // Use different colors for inside vs outside numbers
            if (isInside[row][col]) {
                ctx.fillStyle = '#155724'; // Dark green for inside
            } else {
                ctx.fillStyle = '#004085'; // Dark blue for outside
            }
            ctx.fillText(num.toString(), x, y);
        }
    }

    // Draw the solution loop around the center cell
    ctx.strokeStyle = '#333';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    // Loop around center cell (1,1)
    // Top edge of center cell
    ctx.beginPath();
    ctx.moveTo(padding + cellSize, padding + cellSize);
    ctx.lineTo(padding + 2 * cellSize, padding + cellSize);
    ctx.stroke();

    // Right edge of center cell
    ctx.beginPath();
    ctx.moveTo(padding + 2 * cellSize, padding + cellSize);
    ctx.lineTo(padding + 2 * cellSize, padding + 2 * cellSize);
    ctx.stroke();

    // Bottom edge of center cell
    ctx.beginPath();
    ctx.moveTo(padding + 2 * cellSize, padding + 2 * cellSize);
    ctx.lineTo(padding + cellSize, padding + 2 * cellSize);
    ctx.stroke();

    // Left edge of center cell
    ctx.beginPath();
    ctx.moveTo(padding + cellSize, padding + 2 * cellSize);
    ctx.lineTo(padding + cellSize, padding + cellSize);
    ctx.stroke();

    // Draw vertices (dots)
    ctx.fillStyle = '#333';
    for (let row = 0; row <= gridHeight; row++) {
        for (let col = 0; col <= gridWidth; col++) {
            const x = padding + col * cellSize;
            const y = padding + row * cellSize;
            ctx.beginPath();
            ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Add labels
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';

    // Inside label
    ctx.fillStyle = '#155724';
    ctx.fillText('Inside', padding + 1.5 * cellSize, padding + gridHeight * cellSize + 15);

    // Outside label
    ctx.fillStyle = '#004085';
    ctx.fillText('Outside', padding + 0.5 * cellSize, padding - 10);
}

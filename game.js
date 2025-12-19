// ============================================
// BASE GAME CLASS
// ============================================

class BaseGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Grid settings (to be overridden by subclasses)
        this.cellSize = 60;
        this.dotRadius = 5;
        this.lineWidth = 4;
        this.padding = 30;

        // Game state
        this.solution = null;

        // Initialize canvas and setup
        this.setupCanvas();
        this.setupEventListeners();
        this.draw();

        // Initialize worker manager
        this.workerManager = new WorkerManager();
        this.workerManager.onPuzzleGenerated = (puzzle) => this.handleWorkerResponse(puzzle);
    }

    setupCanvas() {
        // To be implemented by subclasses
        throw new Error('setupCanvas must be implemented by subclass');
    }

    setupEventListeners() {
        // Common event listeners - subclasses can add more
        document.getElementById('clearBtn').addEventListener('click', () => this.clearBoard());
        document.getElementById('checkBtn').addEventListener('click', () => this.checkSolution());
        document.getElementById('showSolutionBtn').addEventListener('click', () => this.showSolution());
        document.getElementById('newPuzzleBtn').addEventListener('click', () => this.nextPuzzle());
    }

    draw() {
        // To be implemented by subclasses
        throw new Error('draw must be implemented by subclass');
    }

    clearBoard() {
        // To be implemented by subclasses
        throw new Error('clearBoard must be implemented by subclass');
    }

    checkSolution() {
        // To be implemented by subclasses
        throw new Error('checkSolution must be implemented by subclass');
    }

    showSolution() {
        // To be implemented by subclasses
        throw new Error('showSolution must be implemented by subclass');
    }

    nextPuzzle() {
        // To be implemented by subclasses
        throw new Error('nextPuzzle must be implemented by subclass');
    }

    handleWorkerResponse(puzzle) {
        // To be implemented by subclasses
        throw new Error('handleWorkerResponse must be implemented by subclass');
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

    destroy() {
        if (this.workerManager) {
            this.workerManager.destroy();
            this.workerManager = null;
        }
        this.canvas = null;
        this.ctx = null;
    }
}

// ============================================
// WORKER MANAGER
// ============================================

class WorkerManager {
    constructor() {
        this.worker = null;
        this.workerUrl = null;
        this.onPuzzleGenerated = null;
    }

    init() {
        this.createWorker();
    }

    createWorker() {
        // Create worker from separate file (works with file:// protocol)
        this.worker = new Worker('puzzleWorker.js');
        this.worker.onmessage = (e) => {
            if (this.onPuzzleGenerated) {
                this.onPuzzleGenerated(e.data);
            }
        };
    }

    generateSquarePuzzle(width, height) {
        if (!this.worker) this.init();
        this.worker.postMessage({ type: 'square', width: width, height: height });
    }

    generateHexPuzzle(radius) {
        if (!this.worker) this.init();
        this.worker.postMessage({ type: 'hexagonal', radius: radius });
    }

    destroy() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        if (this.workerUrl) {
            URL.revokeObjectURL(this.workerUrl);
            this.workerUrl = null;
        }
    }
}

// ============================================
// SQUARE GRID SLITHERLINK
// ============================================

class SquareGame extends BaseGame {
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
        super(canvasId);

        // Initialize with default board size (5x5)
        this.setBoardSize(5);

        // Generate initial puzzle
        this.showMessage('Generating puzzle...', 'info');
        console.log('Starting initial puzzle generation...');
        const size = this.getSelectedBoardSize();
        this.workerManager.generateSquarePuzzle(size, size);
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

}


// ============================================
// HEXAGONAL SLITHERLINK
// ============================================

class HexGame extends BaseGame {
    constructor(canvasId) {
        super(canvasId);

        // Hexagon settings
        this.hexSize = 45; // Distance from center to vertex
        this.padding = 60;
        this.dotRadius = 4;

        // Initialize with default radius
        this.radius = 2; // 3 hexagons per side
        this.cells = [];
        this.numbers = {};
        this.edges = {}; // Edge states: 0 = empty, 1 = line, 2 = X

        this.generateCells();

        // Generate initial puzzle
        this.showMessage('Generating hexagonal puzzle...', 'info');
        this.workerManager.generateHexPuzzle(this.radius);
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
        this.worker.postMessage({ type: 'hexagonal', radius: this.radius });
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
    
}


// ============================================
// GAME CONTROLLER
// ============================================

class GameController {
    constructor() {
        this.currentGame = null;
        this.currentType = 'square';
        this.sharedWorker = null;
        this.sharedWorkerUrl = null;
        
        this.init();
    }
    
    init() {
        // Initialize with square game
        this.currentGame = new SquareGame('gameCanvas');
        
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
    
    switchBoardType(type) {
        this.currentType = type;
        
        // Show/hide appropriate size selector
        const squareSelector = document.getElementById('squareSizeSelector');
        const hexSelector = document.getElementById('hexSizeSelector');
        
        // Destroy the old game instance before creating a new one
        if (this.currentGame) {
            this.currentGame.destroy();
            this.currentGame = null;
        }
        
        if (type === 'square') {
            squareSelector.style.display = 'flex';
            hexSelector.style.display = 'none';

            // Create new square game
            this.currentGame = new SquareGame('gameCanvas');

        } else if (type === 'hexagonal') {
            squareSelector.style.display = 'none';
            hexSelector.style.display = 'flex';

            // Create new hex game
            this.currentGame = new HexGame('gameCanvas');
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

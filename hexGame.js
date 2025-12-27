// ============================================
// HEXAGONAL SLITHERLINK GAME
// ============================================

import {
    createInlineWorker,
    destroyWorker,
    getHexNeighbors,
    hexCellKey,
    hexEdgeKey,
    checkHexNumbers,
    checkHexLoop
} from './boardLogic.js';

export class HexSlitherlink {
    constructor(canvasId, worker = null) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Hexagon settings
        this.hexSize = 45;
        this.padding = 60;
        this.dotRadius = 4;
        this.lineWidth = 4;
        
        // Create or use provided worker
        if (worker) {
            this.worker = worker;
            this.workerUrl = null;
        } else {
            const { worker: newWorker, workerUrl } = createInlineWorker();
            this.worker = newWorker;
            this.workerUrl = workerUrl;
            this.worker.onmessage = (e) => {
                if (e.data.type === 'hexagonal') {
                    this.handleWorkerResponse(e.data);
                }
            };
        }
        
        // Initialize with selected radius from dropdown
        this.radius = this.getSelectedRadius();
        this.cells = [];
        this.numbers = {};
        this.edges = {};
        this.solution = null;

        // Hover state for mouseover effects
        this.hoveredEdge = null;
        
        this.setupCanvas();
        this.generateCells();
        this.draw();
        
        // Generate initial puzzle
        this.showMessage('Generating hexagonal puzzle...', 'info');
        this.worker.postMessage({ type: 'hexagonal', radius: this.radius });
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
        
        this.edges = {};
        this.numbers = {};
    }
    
    destroy() {
        // Clean up canvas event listeners by cloning
        if (this.canvas && this.canvas.parentNode) {
            const newCanvas = this.canvas.cloneNode(true);
            this.canvas.parentNode.replaceChild(newCanvas, this.canvas);
        }
        
        // Terminate worker and revoke blob URL
        destroyWorker(this.worker, this.workerUrl);
        this.worker = null;
        this.workerUrl = null;
        
        // Clear references
        this.canvas = null;
        this.ctx = null;
    }

    // ============================================
    // COORDINATE CONVERSION
    // ============================================
    
    axialToPixel(q, r) {
        const x = this.hexSize * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
        const y = this.hexSize * (3 / 2 * r);
        return { x: this.centerX + x, y: this.centerY + y };
    }
    
    getHexVertices(q, r) {
        const center = this.axialToPixel(q, r);
        const vertices = [];
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 6 + (Math.PI / 3) * i;
            vertices.push({
                x: center.x + this.hexSize * Math.cos(angle),
                y: center.y + this.hexSize * Math.sin(angle)
            });
        }
        return vertices;
    }
    
    getNeighbors(q, r) {
        return getHexNeighbors(q, r);
    }
    
    edgeKey(q1, r1, q2, r2) {
        return hexEdgeKey(q1, r1, q2, r2);
    }
    
    cellKey(q, r) {
        return hexCellKey(q, r);
    }

    // ============================================
    // CANVAS SETUP & DRAWING
    // ============================================
    
    setupCanvas() {
        // Calculate tighter canvas dimensions based on actual hex grid size
        // Hex width = sqrt(3) * hexSize, hex height = 2 * hexSize
        const hexWidth = Math.sqrt(3) * this.hexSize;
        const hexHeight = 2 * this.hexSize;
        
        // Grid spans (2*radius + 1) hexes horizontally, with 3/4 overlap vertically
        const width = hexWidth * (this.radius * 2 + 1) + 2 * this.padding;
        const height = hexHeight * (this.radius * 1.5 + 1) + 2 * this.padding;
        
        this.canvas.width = Math.max(300, Math.ceil(width));
        this.canvas.height = Math.max(300, Math.ceil(height));
        
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
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
        
        // Draw hexagon outlines
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
        
        for (const cell of this.cells) {
            const key = this.cellKey(cell.q, cell.r);
            const num = this.numbers[key];
            if (num !== null && num !== undefined) {
                // Count active edges around this cell
                const edgeCount = this.countCellEdges(cell.q, cell.r);
                // Use dark green if satisfied, otherwise default color
                this.ctx.fillStyle = (edgeCount === num) ? '#2e7d32' : '#333';
                
                const center = this.axialToPixel(cell.q, cell.r);
                this.ctx.fillText(num.toString(), center.x, center.y);
            }
        }
        
        // Draw edges and collect vertices
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

                    // Draw hover highlight if this edge is being hovered and not already drawn
                    const isHovered = this.hoveredEdge && this.hoveredEdge.key === key;

                    if (isHovered && state === 0) {
                        this.ctx.strokeStyle = '#ddd';
                        this.ctx.lineWidth = this.lineWidth;
                        this.ctx.lineCap = 'round';
                        this.ctx.beginPath();
                        this.ctx.moveTo(v1.x, v1.y);
                        this.ctx.lineTo(v2.x, v2.y);
                        this.ctx.stroke();
                    }

                    if (state === 1) {
                        this.ctx.strokeStyle = '#000';
                        this.ctx.lineWidth = this.lineWidth;
                        this.ctx.lineCap = 'round';
                        this.ctx.beginPath();
                        this.ctx.moveTo(v1.x, v1.y);
                        this.ctx.lineTo(v2.x, v2.y);
                        this.ctx.stroke();
                    } else if (state === 2) {
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

    countCellEdges(q, r) {
        let count = 0;
        const neighbors = this.getNeighbors(q, r);
        for (const neighbor of neighbors) {
            const key = this.edgeKey(q, r, neighbor.q, neighbor.r);
            if (this.edges[key] === 1) count++;
        }
        return count;
    }

    // ============================================
    // EVENT HANDLING
    // ============================================
    
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
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseout', () => this.handleMouseOut());
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
            this.checkPuzzleSolved();
        }
    }
    
    getEdgeFromPosition(x, y) {
        const threshold = 15;
        let closestEdge = null;
        let closestDist = threshold;
        
        const cellSet = new Set(this.cells.map(c => this.cellKey(c.q, c.r)));
        
        for (const cell of this.cells) {
            const vertices = this.getHexVertices(cell.q, cell.r);
            const neighbors = this.getNeighbors(cell.q, cell.r);
            
            for (let i = 0; i < 6; i++) {
                const neighbor = neighbors[i];
                const neighborKey = this.cellKey(neighbor.q, neighbor.r);
                
                if (cellSet.has(neighborKey)) {
                    if (neighbor.q < cell.q || (neighbor.q === cell.q && neighbor.r < cell.r)) {
                        continue;
                    }
                }
                
                const v1 = vertices[i];
                const v2 = vertices[(i + 1) % 6];
                
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

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const edge = this.getEdgeFromPosition(x, y);
        const edgeChanged = !this.edgesEqual(this.hoveredEdge, edge);

        if (edgeChanged) {
            this.hoveredEdge = edge;
            this.draw();
        }
    }

    handleMouseOut() {
        if (this.hoveredEdge !== null) {
            this.hoveredEdge = null;
            this.draw();
        }
    }

    edgesEqual(edge1, edge2) {
        if (edge1 === null && edge2 === null) return true;
        if (edge1 === null || edge2 === null) return false;
        return edge1.key === edge2.key;
    }

    // ============================================
    // GAME ACTIONS
    // ============================================
    
    handleBoardSizeChange() {
        this.radius = this.getSelectedRadius();
        this.generateCells();
        this.setupCanvas();
        this.nextPuzzle();
    }
    
    clearBoard() {
        this.edges = {};
        this.hoveredEdge = null;
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

    // ============================================
    // PUZZLE HANDLING
    // ============================================
    
    handleWorkerResponse(puzzle) {
        if (puzzle.type !== 'hexagonal') return;
        
        console.log('Received hex puzzle from worker!');
        
        this.radius = puzzle.radius;
        this.cells = puzzle.cells;
        this.numbers = puzzle.numbers;
        this.solution = puzzle.solution;
        this.edges = {};
        this.hoveredEdge = null;

        this.setupCanvas();
        this.setupEventListeners();
        this.draw();
        this.showMessage('New hexagonal puzzle generated!', 'info');
    }

    // ============================================
    // SOLUTION VALIDATION
    // ============================================
    
    checkSolution() {
        const numbersValid = checkHexNumbers(this.cells, this.numbers, this.edges);
        if (!numbersValid) {
            this.showMessage('Numbers constraint violated! Check the number of lines around each number.', 'error');
            return;
        }

        // Pass getHexVertices as a bound method for the loop check
        const loopValid = checkHexLoop(
            this.cells,
            this.edges,
            (q, r) => this.getHexVertices(q, r)
        );
        if (!loopValid) {
            this.showMessage('Must form a single continuous loop with no branches!', 'error');
            return;
        }

        this.showMessage('Congratulations! Puzzle solved correctly! 🎉', 'success');
    }

    checkPuzzleSolved() {
        const numbersValid = checkHexNumbers(this.cells, this.numbers, this.edges);
        if (!numbersValid) {
            return;
        }

        // Pass getHexVertices as a bound method for the loop check
        const loopValid = checkHexLoop(
            this.cells,
            this.edges,
            (q, r) => this.getHexVertices(q, r)
        );

        if (loopValid) {
            // Show the solved modal
            const gameController = window.gameControllerInstance;
            if (gameController) {
                gameController.showSolvedModal();
            }
        }
    }

    // ============================================
    // UI HELPERS
    // ============================================
    
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


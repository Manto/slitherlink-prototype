class Slitherlink {
  constructor(width, height, clues) {
    this.width = width;
    this.height = height;
    this.clues = clues; // 2D array of numbers (or null for no clue)

    // Edges are represented as a 2D array
    // horizontalEdges[row][col] = edge between (row, col) and (row, col+1)
    // verticalEdges[row][col] = edge between (row, col) and (row+1, col)
    this.horizontalEdges = Array(height + 1).fill(null).map(() => Array(width).fill(false));
    this.verticalEdges = Array(height).fill(null).map(() => Array(width + 1).fill(false));
  }

  setHorizontalEdge(row, col, value) {
    if (row >= 0 && row <= this.height && col >= 0 && col < this.width) {
      this.horizontalEdges[row][col] = value;
    }
  }

  setVerticalEdge(row, col, value) {
    if (row >= 0 && row < this.height && col >= 0 && col <= this.width) {
      this.verticalEdges[row][col] = value;
    }
  }

  getHorizontalEdge(row, col) {
    if (row >= 0 && row <= this.height && col >= 0 && col < this.width) {
      return this.horizontalEdges[row][col];
    }
    return false;
  }

  getVerticalEdge(row, col) {
    if (row >= 0 && row < this.height && col >= 0 && col <= this.width) {
      return this.verticalEdges[row][col];
    }
    return false;
  }

  // Get all neighboring vertices connected to a vertex via an edge
  getNeighbors(row, col) {
    const neighbors = [];

    // Left neighbor (horizontal edge to the left)
    if (col > 0 && this.getHorizontalEdge(row, col - 1)) {
      neighbors.push({ row: row, col: col - 1 });
    }

    // Right neighbor (horizontal edge to the right)
    if (col < this.width && this.getHorizontalEdge(row, col)) {
      neighbors.push({ row: row, col: col + 1 });
    }

    // Up neighbor (vertical edge above)
    if (row > 0 && this.getVerticalEdge(row - 1, col)) {
      neighbors.push({ row: row - 1, col: col });
    }

    // Down neighbor (vertical edge below)
    if (row < this.height && this.getVerticalEdge(row, col)) {
      neighbors.push({ row: row + 1, col: col });
    }

    return neighbors;
  }

  // Detect all completed loops in the current configuration
  detectLoops() {
    const visited = new Set();
    const loops = [];

    // Try starting from each vertex that has edges
    for (let row = 0; row <= this.height; row++) {
      for (let col = 0; col <= this.width; col++) {
        const key = `${row},${col}`;
        if (visited.has(key)) continue;

        const neighbors = this.getNeighbors(row, col);
        if (neighbors.length === 0) continue;

        // Try to trace a loop from this vertex
        const loop = this.traceLoop(row, col, visited);
        if (loop && loop.length > 0) {
          loops.push(loop);
        }
      }
    }

    return loops;
  }

  // Trace a loop starting from a given vertex
  traceLoop(startRow, startCol, globalVisited) {
    let currentRow = startRow;
    let currentCol = startCol;
    let prevRow = -1;
    let prevCol = -1;
    const path = [];

    while (true) {
      const key = `${currentRow},${currentCol}`;

      // Get neighbors of current vertex
      const neighbors = this.getNeighbors(currentRow, currentCol);

      // A valid loop vertex must have exactly 2 neighbors
      if (neighbors.length !== 2) {
        return null;
      }

      // Add current vertex to path
      path.push({ row: currentRow, col: currentCol });

      // If we've returned to start, we have a complete loop
      if (path.length > 1 && currentRow === startRow && currentCol === startCol) {
        // Mark all vertices in this loop as visited
        for (const vertex of path) {
          globalVisited.add(`${vertex.row},${vertex.col}`);
        }
        return path;
      }

      // Find next vertex (the neighbor we didn't come from)
      let nextRow, nextCol;
      if (prevRow === -1 && prevCol === -1) {
        // First step - take the first neighbor
        nextRow = neighbors[0].row;
        nextCol = neighbors[0].col;
      } else {
        // Find the neighbor that is not the previous vertex
        const nextVertex = neighbors.find(n => !(n.row === prevRow && n.col === prevCol));
        if (!nextVertex) {
          return null;
        }
        nextRow = nextVertex.row;
        nextCol = nextVertex.col;
      }

      // Move to next vertex
      prevRow = currentRow;
      prevCol = currentCol;
      currentRow = nextRow;
      currentCol = nextCol;

      // Prevent infinite loops
      if (path.length > (this.width + 1) * (this.height + 1)) {
        return null;
      }
    }
  }

  // Validate that there is exactly one completed loop
  validateSingleLoop() {
    const loops = this.detectLoops();

    if (loops.length === 0) {
      return {
        valid: false,
        error: 'No completed loops found'
      };
    }

    if (loops.length > 1) {
      return {
        valid: false,
        error: `Found ${loops.length} completed loops, but there should be exactly one loop`,
        loopCount: loops.length
      };
    }

    return {
      valid: true,
      loopCount: 1
    };
  }

  // Validate that all clues are satisfied
  validateClues() {
    const errors = [];

    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const clue = this.clues[row][col];
        if (clue === null) continue;

        let edgeCount = 0;

        // Count edges around this cell
        if (this.getHorizontalEdge(row, col)) edgeCount++;
        if (this.getHorizontalEdge(row + 1, col)) edgeCount++;
        if (this.getVerticalEdge(row, col)) edgeCount++;
        if (this.getVerticalEdge(row, col + 1)) edgeCount++;

        if (edgeCount !== clue) {
          errors.push({
            row,
            col,
            expected: clue,
            actual: edgeCount
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Complete validation
  validate() {
    const loopValidation = this.validateSingleLoop();
    const clueValidation = this.validateClues();

    return {
      valid: loopValidation.valid && clueValidation.valid,
      loopValidation,
      clueValidation
    };
  }
}

module.exports = Slitherlink;

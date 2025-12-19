# Slitherlink Puzzle

A web-based implementation of the classic Slitherlink logic puzzle, supporting both square and hexagonal grids.

## How to Play

1. Start the local server: `./start-server.sh`
2. Open http://localhost:8080 in your browser
3. **Left click** to draw a line segment
4. **Right click** to mark with X (no line)
5. Create a single continuous loop that satisfies all number constraints

## File Structure

```
├── index.html          # Main HTML page
├── style.css           # Styles
├── game.js             # Entry point
├── gameController.js   # Game type switching and UI management
├── squareGame.js       # Square grid Slitherlink class
├── hexGame.js          # Hexagonal grid Slitherlink class
├── boardLogic.js       # Pure computation (worker code, validation)
└── start-server.sh     # Server launcher script
```

### Module Responsibilities

- **`boardLogic.js`**: Contains pure computation functions including:
  - Worker code generator for puzzle generation
  - Solution validation (loop checking, number constraints)
  - Coordinate utilities for both grid types

- **`squareGame.js`**: Square grid game implementation:
  - Canvas rendering
  - Click handling
  - Puzzle state management

- **`hexGame.js`**: Hexagonal grid game implementation:
  - Axial coordinate system
  - Hex-specific rendering
  - Edge detection

- **`gameController.js`**: Main controller for:
  - Switching between square/hex modes
  - Button event rebinding
  - Game lifecycle management

- **`game.js`**: Application entry point

## Requirements

- Modern browser with ES modules support
- Python 3 (for the development server)

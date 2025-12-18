const Slitherlink = require('./slitherlink');

// Create a simple 2x2 loop
const game = new Slitherlink(2, 2, [[null, null], [null, null]]);

console.log('Creating a simple 2x2 loop:\n');

// Set edges for a complete loop
// Top edge
game.setHorizontalEdge(0, 0, true);
game.setHorizontalEdge(0, 1, true);
console.log('Set horizontal edges at (0,0) and (0,1)');

// Right edge
game.setVerticalEdge(0, 2, true);
game.setVerticalEdge(1, 2, true);
console.log('Set vertical edges at (0,2) and (1,2)');

// Bottom edge
game.setHorizontalEdge(2, 0, true);
game.setHorizontalEdge(2, 1, true);
console.log('Set horizontal edges at (2,0) and (2,1)');

// Left edge
game.setVerticalEdge(0, 0, true);
game.setVerticalEdge(1, 0, true);
console.log('Set vertical edges at (0,0) and (1,0)\n');

console.log('Checking edges:');
console.log('H[0][0]:', game.getHorizontalEdge(0, 0));
console.log('H[0][1]:', game.getHorizontalEdge(0, 1));
console.log('V[0][2]:', game.getVerticalEdge(0, 2));
console.log('V[1][2]:', game.getVerticalEdge(1, 2));
console.log('H[2][0]:', game.getHorizontalEdge(2, 0));
console.log('H[2][1]:', game.getHorizontalEdge(2, 1));
console.log('V[0][0]:', game.getVerticalEdge(0, 0));
console.log('V[1][0]:', game.getVerticalEdge(1, 0));

console.log('\nChecking neighbors for vertex (0,0):');
const neighbors00 = game.getNeighbors(0, 0);
console.log('Neighbors:', neighbors00);

console.log('\nChecking neighbors for vertex (0,1):');
const neighbors01 = game.getNeighbors(0, 1);
console.log('Neighbors:', neighbors01);

console.log('\nChecking neighbors for vertex (0,2):');
const neighbors02 = game.getNeighbors(0, 2);
console.log('Neighbors:', neighbors02);

console.log('\nDetecting loops:');
const loops = game.detectLoops();
console.log('Number of loops found:', loops.length);
if (loops.length > 0) {
  console.log('Loop vertices:', loops[0].length);
}

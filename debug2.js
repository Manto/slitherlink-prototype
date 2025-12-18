const Slitherlink = require('./slitherlink');

console.log('Creating two completely separate 2x2 loops with gap between them\n');

// Width 5, Height 2 gives us enough space for two 2x2 loops with a gap
const game = new Slitherlink(5, 2, [[null, null, null, null, null], [null, null, null, null, null]]);

console.log('Loop 1 (left): columns 0-1\n');

// First loop: columns 0-1, rows 0-2
game.setHorizontalEdge(0, 0, true); // Top
game.setHorizontalEdge(0, 1, true);
game.setVerticalEdge(0, 2, true);   // Right
game.setVerticalEdge(1, 2, true);
game.setHorizontalEdge(2, 0, true); // Bottom
game.setHorizontalEdge(2, 1, true);
game.setVerticalEdge(0, 0, true);   // Left
game.setVerticalEdge(1, 0, true);

console.log('Loop 2 (right): columns 3-4 (with gap at column 2)\n');

// Second loop: columns 3-4, rows 0-2 (completely separate)
game.setHorizontalEdge(0, 3, true); // Top
game.setHorizontalEdge(0, 4, true);
game.setVerticalEdge(0, 5, true);   // Right
game.setVerticalEdge(1, 5, true);
game.setHorizontalEdge(2, 3, true); // Bottom
game.setHorizontalEdge(2, 4, true);
game.setVerticalEdge(0, 3, true);   // Left
game.setVerticalEdge(1, 3, true);

console.log('Checking that loops are separate:');
console.log('Vertex (0,2) neighbors (should be empty - no edges):', game.getNeighbors(0, 2));
console.log('Vertex (0,0) neighbors (loop 1):', game.getNeighbors(0, 0));
console.log('Vertex (0,3) neighbors (loop 2):', game.getNeighbors(0, 3));

console.log('\nDetecting loops:');
const loops = game.detectLoops();
console.log('Number of loops found:', loops.length);

if (loops.length === 0) {
  console.log('\n✗ No loops detected');
  console.log('This might be because the loops share a common edge/vertex');
} else if (loops.length === 1) {
  console.log('\n? Only 1 loop detected');
  console.log('Loop size:', loops[0].length);
} else {
  console.log('\n✓ Multiple loops detected:', loops.length);
}

const Slitherlink = require('./slitherlink');

console.log('=== Testing Multiple Separate Loops ===\n');

// Create a simple grid with two separate 2x2 loops
const clues = [
  [null, null, null, null, null],
  [null, null, null, null, null],
  [null, null, null, null, null]
];

const game = new Slitherlink(5, 3, clues);

// First loop (top-left 2x2)
game.setHorizontalEdge(0, 0, true);
game.setHorizontalEdge(0, 1, true);
game.setVerticalEdge(0, 0, true);
game.setVerticalEdge(0, 2, true);
game.setHorizontalEdge(1, 0, true);
game.setHorizontalEdge(1, 1, true);
game.setVerticalEdge(1, 0, true);
game.setVerticalEdge(1, 2, true);

// Second loop (top-right 2x2)
game.setHorizontalEdge(0, 3, true);
game.setHorizontalEdge(0, 4, true);
game.setVerticalEdge(0, 3, true);
game.setVerticalEdge(0, 5, true);
game.setHorizontalEdge(1, 3, true);
game.setHorizontalEdge(1, 4, true);
game.setVerticalEdge(1, 3, true);
game.setVerticalEdge(1, 5, true);

const result = game.validate();

console.log('Grid Setup:');
console.log('Two separate 2x2 loops');
console.log('\nValidation Result:');
console.log('Overall valid:', result.valid);
console.log('\nLoop Validation:');
console.log('  Valid:', result.loopValidation.valid);
console.log('  Error:', result.loopValidation.error || 'None');
console.log('  Loop count:', result.loopValidation.loopCount || 0);

if (!result.valid && result.loopValidation.loopCount > 1) {
  console.log('\n✓ SUCCESS: Multiple loops correctly detected!');
  console.log(`✓ Found ${result.loopValidation.loopCount} loops (expected 2)`);
} else if (!result.valid && result.loopValidation.loopCount === 0) {
  console.log('\n✗ FAILED: Loops were not detected');
} else if (result.valid) {
  console.log('\n✗ FAILED: Multiple loops should be invalid!');
} else {
  console.log('\n? UNKNOWN: Unexpected validation state');
}

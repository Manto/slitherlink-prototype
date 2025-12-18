const Slitherlink = require('./slitherlink');

// Test case based on the image provided
// This represents a 6x6 grid with multiple completed loops (INVALID)
function testMultipleLoops() {
  console.log('=== Testing Multiple Loops Validation ===\n');

  // Create a 6x6 grid with clues from the image
  const clues = [
    [null, 2, null, null, 2, null],
    [null, null, 3, null, null, 2],
    [null, null, null, null, 2, 3],
    [3, 4, null, null, 1, 1],
    [null, 2, null, null, 2, null],
    [null, null, null, null, 2, 4]
  ];

  const game = new Slitherlink(6, 6, clues);

  // Set up the edges to create multiple loops (based on the image)
  // Top-left loop
  game.setHorizontalEdge(0, 0, true);
  game.setHorizontalEdge(0, 1, true);
  game.setHorizontalEdge(0, 2, true);
  game.setHorizontalEdge(0, 3, true);
  game.setVerticalEdge(0, 0, true);
  game.setVerticalEdge(1, 0, true);
  game.setVerticalEdge(2, 0, true);
  game.setVerticalEdge(0, 4, true);
  game.setHorizontalEdge(1, 1, true);
  game.setHorizontalEdge(1, 2, true);
  game.setVerticalEdge(1, 3, true);
  game.setVerticalEdge(2, 1, true);
  game.setHorizontalEdge(2, 1, true);
  game.setHorizontalEdge(2, 2, true);
  game.setVerticalEdge(2, 3, true);
  game.setHorizontalEdge(3, 2, true);
  game.setHorizontalEdge(3, 3, true);
  game.setVerticalEdge(3, 0, true);
  game.setVerticalEdge(3, 4, true);

  // Small loop in bottom-left
  game.setHorizontalEdge(5, 1, true);
  game.setHorizontalEdge(5, 2, true);
  game.setHorizontalEdge(6, 1, true);
  game.setHorizontalEdge(6, 2, true);
  game.setVerticalEdge(5, 1, true);
  game.setVerticalEdge(5, 3, true);

  // Top-right loop
  game.setHorizontalEdge(0, 4, true);
  game.setHorizontalEdge(0, 5, true);
  game.setVerticalEdge(0, 6, true);
  game.setVerticalEdge(1, 6, true);
  game.setVerticalEdge(2, 6, true);
  game.setHorizontalEdge(2, 4, true);
  game.setHorizontalEdge(2, 5, true);
  game.setVerticalEdge(2, 4, true);

  // Middle-right loop
  game.setHorizontalEdge(3, 4, true);
  game.setHorizontalEdge(3, 5, true);
  game.setVerticalEdge(3, 6, true);
  game.setVerticalEdge(4, 6, true);
  game.setHorizontalEdge(4, 4, true);
  game.setHorizontalEdge(4, 5, true);
  game.setVerticalEdge(4, 4, true);

  // Bottom middle loop
  game.setHorizontalEdge(5, 2, true);
  game.setHorizontalEdge(5, 3, true);
  game.setHorizontalEdge(5, 4, true);
  game.setHorizontalEdge(6, 2, true);
  game.setHorizontalEdge(6, 3, true);
  game.setHorizontalEdge(6, 4, true);
  game.setVerticalEdge(5, 2, true);
  game.setVerticalEdge(5, 5, true);
  game.setVerticalEdge(6, 2, true);
  game.setVerticalEdge(6, 5, true);

  // Bottom-right loop
  game.setHorizontalEdge(6, 5, true);
  game.setVerticalEdge(6, 6, true);
  game.setVerticalEdge(7, 6, true);
  game.setHorizontalEdge(7, 5, true);
  game.setVerticalEdge(7, 5, true);

  // Validate the puzzle
  const result = game.validate();

  console.log('Validation Result:');
  console.log('Overall valid:', result.valid);
  console.log('\nLoop Validation:');
  console.log('  Valid:', result.loopValidation.valid);
  console.log('  Error:', result.loopValidation.error || 'None');
  console.log('  Loop count:', result.loopValidation.loopCount || 0);
  console.log('\nClue Validation:');
  console.log('  Valid:', result.clueValidation.valid);
  console.log('  Errors:', result.clueValidation.errors.length);

  if (!result.valid) {
    console.log('\n✓ CORRECT: The puzzle was correctly identified as INVALID');
    if (result.loopValidation.loopCount > 1) {
      console.log(`✓ CORRECT: Found ${result.loopValidation.loopCount} loops, which violates the single-loop rule`);
    }
  } else {
    console.log('\n✗ WRONG: The puzzle should be invalid due to multiple loops!');
  }
}

// Test case with a valid single loop
function testSingleLoop() {
  console.log('\n\n=== Testing Valid Single Loop ===\n');

  const clues = [
    [null, 2, null],
    [3, null, 2],
    [null, 2, null]
  ];

  const game = new Slitherlink(3, 3, clues);

  // Create a single loop around the perimeter
  // Top edge
  game.setHorizontalEdge(0, 0, true);
  game.setHorizontalEdge(0, 1, true);
  game.setHorizontalEdge(0, 2, true);

  // Right edge
  game.setVerticalEdge(0, 3, true);
  game.setVerticalEdge(1, 3, true);
  game.setVerticalEdge(2, 3, true);

  // Bottom edge
  game.setHorizontalEdge(3, 0, true);
  game.setHorizontalEdge(3, 1, true);
  game.setHorizontalEdge(3, 2, true);

  // Left edge
  game.setVerticalEdge(0, 0, true);
  game.setVerticalEdge(1, 0, true);
  game.setVerticalEdge(2, 0, true);

  const result = game.validate();

  console.log('Validation Result:');
  console.log('Overall valid:', result.valid);
  console.log('\nLoop Validation:');
  console.log('  Valid:', result.loopValidation.valid);
  console.log('  Loop count:', result.loopValidation.loopCount);

  if (result.loopValidation.valid && result.loopValidation.loopCount === 1) {
    console.log('\n✓ CORRECT: Single loop detected successfully');
  }
}

// Test case with no loops
function testNoLoops() {
  console.log('\n\n=== Testing No Loops ===\n');

  const clues = [
    [null, 2],
    [2, null]
  ];

  const game = new Slitherlink(2, 2, clues);

  // Just a few disconnected edges
  game.setHorizontalEdge(0, 0, true);
  game.setVerticalEdge(0, 1, true);

  const result = game.validate();

  console.log('Validation Result:');
  console.log('Overall valid:', result.valid);
  console.log('\nLoop Validation:');
  console.log('  Valid:', result.loopValidation.valid);
  console.log('  Error:', result.loopValidation.error);

  if (!result.loopValidation.valid) {
    console.log('\n✓ CORRECT: Correctly identified that no loops exist');
  }
}

// Run all tests
console.log('======================================');
console.log('Slitherlink Validation Tests');
console.log('======================================\n');

testMultipleLoops();
testSingleLoop();
testNoLoops();

console.log('\n======================================');
console.log('All tests completed!');
console.log('======================================');

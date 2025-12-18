const Slitherlink = require('./slitherlink');

console.log('========================================');
console.log('Slitherlink Single Loop Validation Test');
console.log('========================================\n');

// Test 1: Two separate loops (INVALID)
console.log('Test 1: Two Separate Loops (Should be INVALID)');
console.log('-----------------------------------------------');
const game1 = new Slitherlink(5, 2, [[null, null, null, null, null], [null, null, null, null, null]]);

// Loop 1
game1.setHorizontalEdge(0, 0, true);
game1.setHorizontalEdge(0, 1, true);
game1.setVerticalEdge(0, 2, true);
game1.setVerticalEdge(1, 2, true);
game1.setHorizontalEdge(2, 0, true);
game1.setHorizontalEdge(2, 1, true);
game1.setVerticalEdge(0, 0, true);
game1.setVerticalEdge(1, 0, true);

// Loop 2
game1.setHorizontalEdge(0, 3, true);
game1.setHorizontalEdge(0, 4, true);
game1.setVerticalEdge(0, 5, true);
game1.setVerticalEdge(1, 5, true);
game1.setHorizontalEdge(2, 3, true);
game1.setHorizontalEdge(2, 4, true);
game1.setVerticalEdge(0, 3, true);
game1.setVerticalEdge(1, 3, true);

const result1 = game1.validate();
console.log('Validation result:', result1.valid ? 'VALID' : 'INVALID');
console.log('Loop validation:', result1.loopValidation.valid ? 'VALID' : 'INVALID');
console.log('Error message:', result1.loopValidation.error || 'None');
console.log('Number of loops:', result1.loopValidation.loopCount || 0);

if (!result1.valid && result1.loopValidation.loopCount === 2) {
  console.log('✓ PASS: Correctly rejected two separate loops\n');
} else {
  console.log('✗ FAIL: Should have rejected two separate loops\n');
}

// Test 2: Single loop (VALID)
console.log('Test 2: Single Loop (Should be VALID)');
console.log('---------------------------------------');
const game2 = new Slitherlink(2, 2, [[null, null], [null, null]]);

game2.setHorizontalEdge(0, 0, true);
game2.setHorizontalEdge(0, 1, true);
game2.setVerticalEdge(0, 2, true);
game2.setVerticalEdge(1, 2, true);
game2.setHorizontalEdge(2, 0, true);
game2.setHorizontalEdge(2, 1, true);
game2.setVerticalEdge(0, 0, true);
game2.setVerticalEdge(1, 0, true);

const result2 = game2.validate();
console.log('Validation result:', result2.valid ? 'VALID' : 'INVALID');
console.log('Loop validation:', result2.loopValidation.valid ? 'VALID' : 'INVALID');
console.log('Number of loops:', result2.loopValidation.loopCount || 0);

if (result2.loopValidation.valid && result2.loopValidation.loopCount === 1) {
  console.log('✓ PASS: Correctly accepted single loop\n');
} else {
  console.log('✗ FAIL: Should have accepted single loop\n');
}

// Test 3: No loops (INVALID)
console.log('Test 3: No Loops (Should be INVALID)');
console.log('---------------------------------------');
const game3 = new Slitherlink(2, 2, [[null, null], [null, null]]);

game3.setHorizontalEdge(0, 0, true);
game3.setVerticalEdge(0, 1, true);

const result3 = game3.validate();
console.log('Validation result:', result3.valid ? 'VALID' : 'INVALID');
console.log('Loop validation:', result3.loopValidation.valid ? 'VALID' : 'INVALID');
console.log('Error message:', result3.loopValidation.error || 'None');

if (!result3.loopValidation.valid) {
  console.log('✓ PASS: Correctly rejected configuration with no loops\n');
} else {
  console.log('✗ FAIL: Should have rejected configuration with no loops\n');
}

// Test 4: Three loops (INVALID)
console.log('Test 4: Three Separate Loops (Should be INVALID)');
console.log('--------------------------------------------------');
const game4 = new Slitherlink(8, 2, [
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null]
]);

// Loop 1: columns 0-1
game4.setHorizontalEdge(0, 0, true);
game4.setHorizontalEdge(0, 1, true);
game4.setVerticalEdge(0, 2, true);
game4.setVerticalEdge(1, 2, true);
game4.setHorizontalEdge(2, 0, true);
game4.setHorizontalEdge(2, 1, true);
game4.setVerticalEdge(0, 0, true);
game4.setVerticalEdge(1, 0, true);

// Loop 2: columns 3-4
game4.setHorizontalEdge(0, 3, true);
game4.setHorizontalEdge(0, 4, true);
game4.setVerticalEdge(0, 5, true);
game4.setVerticalEdge(1, 5, true);
game4.setHorizontalEdge(2, 3, true);
game4.setHorizontalEdge(2, 4, true);
game4.setVerticalEdge(0, 3, true);
game4.setVerticalEdge(1, 3, true);

// Loop 3: columns 6-7
game4.setHorizontalEdge(0, 6, true);
game4.setHorizontalEdge(0, 7, true);
game4.setVerticalEdge(0, 8, true);
game4.setVerticalEdge(1, 8, true);
game4.setHorizontalEdge(2, 6, true);
game4.setHorizontalEdge(2, 7, true);
game4.setVerticalEdge(0, 6, true);
game4.setVerticalEdge(1, 6, true);

const result4 = game4.validate();
console.log('Validation result:', result4.valid ? 'VALID' : 'INVALID');
console.log('Loop validation:', result4.loopValidation.valid ? 'VALID' : 'INVALID');
console.log('Error message:', result4.loopValidation.error || 'None');
console.log('Number of loops:', result4.loopValidation.loopCount || 0);

if (!result4.valid && result4.loopValidation.loopCount === 3) {
  console.log('✓ PASS: Correctly rejected three separate loops\n');
} else {
  console.log('✗ FAIL: Should have rejected three separate loops\n');
}

console.log('========================================');
console.log('Summary');
console.log('========================================');
console.log('The validation correctly enforces the rule that');
console.log('a Slitherlink solution must have EXACTLY ONE loop.');
console.log('\nThis prevents invalid solutions like the one');
console.log('shown in the provided image with multiple loops.');

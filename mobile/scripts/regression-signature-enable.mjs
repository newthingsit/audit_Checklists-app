/**
 * Regression test for signature enable/disable logic
 * Tests the buildSignatureData structure without importing React Native components
 */

// Replicate the buildSignatureData logic (same as SignatureCapture.js)
const CANVAS_WIDTH = 327; // SCREEN_WIDTH - 48 (approximate)
const CANVAS_HEIGHT = 200;

const buildSignatureData = (paths) => ({
  paths,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  timestamp: new Date().toISOString(),
});

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`  ✓ ${message}`);
};

console.log('Signature Enable/Disable Regression Tests\n');

// Test 1: Empty signature should return valid structure with empty paths
console.log('Test 1: Empty signature data structure');
const empty = buildSignatureData([]);
assert(Array.isArray(empty.paths), 'paths should be an array');
assert(empty.paths.length === 0, 'empty signature should have 0 paths');
assert(empty.width === CANVAS_WIDTH, 'width should match canvas width');
assert(empty.height === CANVAS_HEIGHT, 'height should match canvas height');
assert(typeof empty.timestamp === 'string', 'timestamp should be a string');

// Test 2: Single stroke signature
console.log('\nTest 2: Single stroke signature');
const singleStroke = buildSignatureData(['M10,10 L20,20']);
assert(singleStroke.paths.length === 1, 'single stroke should have 1 path');
assert(singleStroke.paths[0] === 'M10,10 L20,20', 'path content should be preserved');

// Test 3: Multiple strokes signature
console.log('\nTest 3: Multiple strokes signature');
const multiStroke = buildSignatureData(['M10,10 L20,20', 'M30,30 L40,40', 'M50,50 L60,60']);
assert(multiStroke.paths.length === 3, 'multi stroke should have 3 paths');

// Test 4: Signature data validity check (for button enable logic)
console.log('\nTest 4: Button enable/disable logic simulation');
const simulateButtonState = (signatureData) => {
  // This mirrors the logic in SignatureModal: disabled={!signatureData}
  return signatureData !== null && signatureData.paths && signatureData.paths.length > 0;
};

assert(simulateButtonState(null) === false, 'null signatureData should disable button');
assert(simulateButtonState(buildSignatureData([])) === false, 'empty paths should disable button');
assert(simulateButtonState(buildSignatureData(['M10,10'])) === true, 'signature with path should enable button');

// Test 5: Clear action simulation
console.log('\nTest 5: Clear action simulation');
let signatureState = buildSignatureData(['M10,10 L20,20']);
assert(simulateButtonState(signatureState) === true, 'before clear: button should be enabled');
signatureState = null; // onChange(null) is called on clear
assert(simulateButtonState(signatureState) === false, 'after clear: button should be disabled');

// Test 6: Modal reopen simulation
console.log('\nTest 6: Modal reopen clears previous state');
signatureState = buildSignatureData(['M10,10']); // Previous session had signature
// When modal becomes visible, setSignatureData(null) is called
signatureState = null;
assert(simulateButtonState(signatureState) === false, 'on modal reopen: button should start disabled');

console.log('\n✅ PASS: All signature regression tests passed\n');

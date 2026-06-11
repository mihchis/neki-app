import { calculateSM2 } from './sm2';
import assert from 'assert';

console.log('Running SM-2 algorithm tests...');

try {
  // Test 1: Again resets repetitions and interval
  const r1 = calculateSM2(0, 10, 2.5, 5);
  assert.strictEqual(r1.repetitions, 0, 'Repetitions should be reset to 0');
  assert.strictEqual(r1.interval, 1, 'Interval should be reset to 1 day');
  assert.strictEqual(r1.easeFactor, 2.3, 'Ease factor should be decreased by 0.2');
  console.log('✓ Test 1: Again resets repetitions and interval');

  // Test 2: Good at repetitions = 0 sets interval to 1
  const r2 = calculateSM2(4, 1, 2.5, 0);
  assert.strictEqual(r2.repetitions, 1, 'Repetitions should increase to 1');
  assert.strictEqual(r2.interval, 1, 'First correct interval should be 1 day');
  assert.strictEqual(r2.easeFactor, 2.5, 'Ease factor should remain unchanged');
  console.log('✓ Test 2: Good at repetitions = 0');

  // Test 3: Good at repetitions = 1 sets interval to 6
  const r3 = calculateSM2(4, 1, 2.5, 1);
  assert.strictEqual(r3.repetitions, 2, 'Repetitions should increase to 2');
  assert.strictEqual(r3.interval, 6, 'Second correct interval should be 6 days');
  console.log('✓ Test 3: Good at repetitions = 1');

  // Test 4: Good at repetitions > 1 scales by ease factor
  const r4 = calculateSM2(4, 6, 2.5, 2);
  assert.strictEqual(r4.repetitions, 3, 'Repetitions should increase to 3');
  assert.strictEqual(r4.interval, 15, 'Interval should scale to 15 (ceil of 6 * 2.5)');
  console.log('✓ Test 4: Good at repetitions > 1');

  // Test 5: Easy increases ease factor and gives interval bonus
  const r5 = calculateSM2(5, 6, 2.5, 2);
  assert.strictEqual(r5.repetitions, 3, 'Repetitions should increase to 3');
  assert.strictEqual(r5.interval, 20, 'Interval should scale to 20 (ceil of 6 * 2.5 * 1.3 = 19.5)');
  assert.strictEqual(r5.easeFactor, 2.65, 'Ease factor should increase by 0.15');
  console.log('✓ Test 5: Easy scales and increases ease factor');

  console.log('\x1b[32mAll SM-2 tests passed successfully!\x1b[0m');
} catch (error) {
  console.error('\x1b[31mSM-2 tests failed:\x1b[0m', error);
  process.exit(1);
}

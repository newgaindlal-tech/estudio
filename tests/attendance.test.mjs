import assert from 'node:assert/strict';
import { test } from 'node:test';

// Pure logic mirror of our attendance engine
function calculateStats(attended, missed, off, targetPct = 75) {
  const totalEffective = attended + missed;
  const totalSessions = attended + missed + off;
  const T = targetPct / 100;

  if (totalEffective === 0) {
    return {
      percentage: null,
      canMiss: 0,
      neededToAttend: 0,
      status: 'NO_DATA',
    };
  }

  const currentPct = (attended / totalEffective) * 100;

  if (currentPct >= targetPct) {
    // How many can miss
    const canMiss = Math.floor(attended / T - totalEffective);
    return {
      percentage: Math.round(currentPct * 100) / 100,
      canMiss: Math.max(0, canMiss),
      neededToAttend: 0,
      status: 'SAFE',
    };
  } else {
    // Consecutive needed
    const needed = Math.ceil((T * totalEffective - attended) / (1 - T));
    return {
      percentage: Math.round(currentPct * 100) / 100,
      canMiss: 0,
      neededToAttend: Math.max(1, needed),
      status: 'SHORTAGE',
    };
  }
}

test('Verification: 10 attended / 0 missed = 100%', () => {
  const s = calculateStats(10, 0, 0, 75);
  assert.equal(s.percentage, 100);
  assert.equal(s.status, 'SAFE');
  // 10 / 0.75 - 10 = 13.33 -> 3 classes can be missed
  assert.equal(s.canMiss, 3);
});

test('Verification: 8 attended / 2 missed = 80%', () => {
  const s = calculateStats(8, 2, 0, 75);
  assert.equal(s.percentage, 80);
  assert.equal(s.status, 'SAFE');
  // 8 / 0.75 - 10 = 10.66 - 10 = 0 classes can be missed
  assert.equal(s.canMiss, 0);
});

test('Verification: 0 attended / 0 missed = no attendance yet', () => {
  const s = calculateStats(0, 0, 0, 75);
  assert.equal(s.percentage, null);
  assert.equal(s.status, 'NO_DATA');
});

test('Verification: OFF does not affect percentage', () => {
  const s1 = calculateStats(8, 2, 0, 75);
  const s2 = calculateStats(8, 2, 10, 75); // 10 cancelled/off days
  assert.equal(s1.percentage, s2.percentage);
  assert.equal(s2.percentage, 80);
});

test('Verification: Recovery calculation for low attendance', () => {
  // 6 attended / 4 missed = 60% with 75% target
  // Needed = ceil((0.75 * 10 - 6) / 0.25) = ceil(1.5 / 0.25) = 6
  const s = calculateStats(6, 4, 0, 75);
  assert.equal(s.percentage, 60);
  assert.equal(s.status, 'SHORTAGE');
  assert.equal(s.neededToAttend, 6);

  // If student attends 6 consecutive classes: 12 / 16 = 75% exactly!
  const verified = calculateStats(6 + 6, 4, 0, 75);
  assert.equal(verified.percentage, 75);
});

test('Verification: Aggregate across subjects avoids Simpson Paradox', () => {
  // Sub 1: 1 / 1 = 100%
  // Sub 2: 9 / 19 = 47.36%
  // Direct average of percentages = (100 + 47.36) / 2 = 73.68% (WRONG)
  // Aggregate from classes: (1 + 9) / (1 + 19) = 10 / 20 = 50% (CORRECT)
  const totalAttended = 1 + 9;
  const totalMissed = 0 + 10;
  const overall = (totalAttended / (totalAttended + totalMissed)) * 100;
  assert.equal(overall, 50);
});
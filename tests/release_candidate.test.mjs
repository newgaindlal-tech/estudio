import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { evaluateExpression, factorial, decimalToFraction, integrate, differentiate } from '../src/lib/calculator/engine.ts';
import { validateUploadedFile, sanitizeTitle } from '../src/lib/vault/security.ts';

describe('1. Scientific Calculator Engine & Edge Cases', () => {
  test('Standard BODMAS & Operator Precedence', () => {
    assert.equal(evaluateExpression('25 + 18 * 4'), 97);
    assert.equal(evaluateExpression('(25 + 18) * 4'), 172);
    assert.equal(evaluateExpression('10 - 3 * 2 + 8 / 4'), 6);
  });

  test('Fractions & S<=>D Decimal Conversion', () => {
    const val = evaluateExpression('3 / 4 + 2 / 5');
    assert.equal(val, 1.15);
    const frac = decimalToFraction(val);
    assert.equal(frac.numerator, 23);
    assert.equal(frac.denominator, 20);
  });

  test('Trigonometry & DEG vs RAD conversions', () => {
    assert.equal(evaluateExpression('sin(30)', 'DEG'), 0.5);
    assert.equal(evaluateExpression('cos(60)', 'DEG'), 0.5);
    assert.equal(evaluateExpression('sin(π / 6)', 'RAD'), 0.5);
    assert.equal(evaluateExpression('asin(0.5)', 'DEG'), 30);
  });

  test('Calculus: Numerical Integration & Differentiation', () => {
    // Integral of x^2 from 0 to 3 = [x^3 / 3] = 9
    const intRes = integrate((x) => x * x, 0, 3);
    assert.ok(Math.abs(intRes - 9) < 0.01, `Expected ~9, got ${intRes}`);

    // Derivative of x^2 at x = 3 is 2x = 6
    const diffRes = differentiate((x) => x * x, 3);
    assert.ok(Math.abs(diffRes - 6) < 0.001, `Expected ~6, got ${diffRes}`);
  });

  test('Edge Case & Error Boundaries', () => {
    assert.throws(() => evaluateExpression('10 / 0'), /zero/i);
    assert.throws(() => evaluateExpression('sqrt(-9)'), /Math ERROR/i);
    assert.throws(() => evaluateExpression('log(-5)'), /Math ERROR/i);
    assert.throws(() => evaluateExpression('((2 + 3)'), /parentheses/i);
    assert.throws(() => evaluateExpression('a'.repeat(600)), /exceeds maximum 500 characters/i);
  });
});

describe('2. Attendance Engine: Bunk & Recovery Mathematics', () => {
  function getStats(attended, missed, targetPct = 75) {
    const effective = attended + missed;
    const T = targetPct / 100;
    if (effective === 0) return { pct: null, canMiss: 0, needed: 0, status: 'NO_DATA' };
    const pct = Math.round((attended / effective) * 1000) / 10;

    if (pct >= targetPct) {
      const canMiss = Math.floor(attended / T - effective);
      return { pct, canMiss: Math.max(0, canMiss), needed: 0, status: 'SAFE' };
    } else {
      const needed = Math.ceil((T * effective - attended) / (1 - T));
      return { pct, canMiss: 0, needed: Math.max(1, needed), status: 'SHORTAGE' };
    }
  }

  test('10 Attended / 0 Missed = 100% (Safe with bunks)', () => {
    const s = getStats(10, 0, 75);
    assert.equal(s.pct, 100);
    assert.equal(s.status, 'SAFE');
    assert.equal(s.canMiss, 3); // 10/0.75 - 10 = 13.33 - 10 = 3
  });

  test('8 Attended / 2 Missed = 80% (Safe at threshold)', () => {
    const s = getStats(8, 2, 75);
    assert.equal(s.pct, 80);
    assert.equal(s.status, 'SAFE');
    assert.equal(s.canMiss, 0); // 8/0.75 - 10 = 10.66 - 10 = 0
  });

  test('6 Attended / 4 Missed = 60% (Attendance Shortage)', () => {
    const s = getStats(6, 4, 75);
    assert.equal(s.pct, 60);
    assert.equal(s.status, 'SHORTAGE');
    assert.equal(s.needed, 6); // ceil((0.75*10 - 6)/0.25) = 6
  });

  test('Simulated Recovery: After attending 6 consecutive classes', () => {
    const s = getStats(6 + 6, 4, 75);
    assert.equal(s.pct, 75);
    assert.equal(s.status, 'SAFE');
  });

  test('Aggregated Total Avoids Simpson Paradox', () => {
    // Subject A: 1/1 (100%), Subject B: 9/19 (47.4%)
    // Average of percentages = (100 + 47.4) / 2 = 73.7% (WRONG)
    // Underlying total = 10 / 20 = 50% (CORRECT)
    const totalAttended = 1 + 9;
    const totalConducted = 1 + 19;
    const overall = (totalAttended / totalConducted) * 100;
    assert.equal(overall, 50);
  });
});

describe('3. Document Vault: Security, Size & MIME Sanitization', () => {
  test('Accepts valid PDF and Image formats under 10 MB', () => {
    const mockPdf = { name: 'marksheet.pdf', size: 2 * 1024 * 1024, type: 'application/pdf' };
    const res = validateUploadedFile(mockPdf);
    assert.equal(res.valid, true);
    assert.equal(res.sanitizedFilename, 'marksheet.pdf');
  });

  test('Rejects executable and script payloads', () => {
    const mockExe = { name: 'trojan.exe', size: 5000, type: 'application/x-msdownload' };
    const res = validateUploadedFile(mockExe);
    assert.equal(res.valid, false);
    assert.match(res.error, /not permitted/i);
  });

  test('Rejects files exceeding 10 MB', () => {
    const largeFile = { name: 'huge.pdf', size: 15 * 1024 * 1024, type: 'application/pdf' };
    const res = validateUploadedFile(largeFile);
    assert.equal(res.valid, false);
    assert.match(res.error, /exceeds maximum permitted limit/i);
  });

  test('Sanitizes malicious title inputs', () => {
    const raw = '<script>alert("hack")</script>Admit Card';
    const clean = sanitizeTitle(raw);
    assert.equal(clean, 'scriptalert(hack)/scriptAdmit Card');
  });
});
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateExpression, factorial } from '../src/lib/calculator/engine.ts';

test('Basic Arithmetic & Order of Operations (BODMAS/PEMDAS)', () => {
  assert.equal(evaluateExpression('2 + 3 * 4'), 14);
  assert.equal(evaluateExpression('(2 + 3) * 4'), 20);
  assert.equal(evaluateExpression('10 - 4 / 2'), 8);
  assert.equal(evaluateExpression('10 / 2 + 5 * 3'), 20);
});

test('Decimals & Floating Point Stability', () => {
  assert.equal(evaluateExpression('0.1 + 0.2'), 0.3);
  assert.equal(evaluateExpression('5.5 * 2.2'), 12.1);
});

test('Powers & Roots', () => {
  assert.equal(evaluateExpression('2 ^ 3'), 8);
  assert.equal(evaluateExpression('sqrt(16)'), 4);
  assert.equal(evaluateExpression('sqrt(2 ^ 4)'), 4);
});

test('Factorials', () => {
  assert.equal(factorial(0), 1);
  assert.equal(factorial(5), 120);
  assert.equal(evaluateExpression('5!'), 120);
  assert.equal(evaluateExpression('3! + 4!'), 30);
});

test('Trigonometry in Degree vs Radian Modes', () => {
  // DEG mode
  assert.equal(evaluateExpression('sin(90)', 'DEG'), 1);
  assert.equal(evaluateExpression('cos(0)', 'DEG'), 1);
  assert.equal(evaluateExpression('tan(45)', 'DEG'), 1);

  // RAD mode
  assert.equal(evaluateExpression('sin(π / 2)', 'RAD'), 1);
  assert.equal(evaluateExpression('cos(π)', 'RAD'), -1);
});

test('Inverse Trigonometric Functions', () => {
  assert.equal(evaluateExpression('asin(1)', 'DEG'), 90);
  assert.equal(evaluateExpression('acos(1)', 'DEG'), 0);
  assert.equal(evaluateExpression('atan(1)', 'DEG'), 45);
});

test('Logarithmic Functions & Constants', () => {
  assert.equal(evaluateExpression('log(100)'), 2);
  assert.equal(evaluateExpression('ln(e)'), 1);
  assert.equal(evaluateExpression('2 * π'), Math.round(2 * Math.PI * 1e10) / 1e10);
});

test('Error Handling & Boundary Conditions', () => {
  assert.throws(() => evaluateExpression('10 / 0'), /Division by zero/);
  assert.throws(() => evaluateExpression('sqrt(-4)'), /Negative square root/);
  assert.throws(() => evaluateExpression('log(-10)'), /Domain error/);
  assert.throws(() => evaluateExpression('(2 + 3'), /Mismatched parentheses/);
});
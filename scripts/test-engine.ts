import {
  Fraction,
  floatToFraction,
  evaluateExpressionSafe,
  MatrixEngine,
  VectorEngine,
  numericalDerivative,
  numericalIntegral,
} from '../src/lib/calculator/full-engine';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`\x1b[32m✔ PASS\x1b[0m: ${testName}`);
    passed++;
  } else {
    console.error(`\x1b[31m✖ FAIL\x1b[0m: ${testName}`);
    failed++;
  }
}

console.log('--- STARTING DETERMINISTIC MATH ENGINE TESTS ---\n');

// 1. EXACT FRACTION ARITHMETIC (1/3 + 1/6 = 1/2)
const f1 = new Fraction(1n, 3n);
const f2 = new Fraction(1n, 6n);
const fSum = f1.add(f2);
assert(fSum.n === 1n && fSum.d === 2n, 'Fraction Addition: 1/3 + 1/6 = 1/2');

// 2. FLOAT TO FRACTION APPROXIMATION (0.125 = 1/8)
const fApprox = floatToFraction(0.125);
assert(fApprox.n === 1n && fApprox.d === 8n, 'Float to Fraction: 0.125 = 1/8');

// 3. TRIGONOMETRY ANGLE MODES
const sinDeg = evaluateExpressionSafe('sin(90)', {}, 'DEG');
assert(Math.abs(sinDeg - 1) < 1e-11, 'Trig DEG Mode: sin(90°) = 1');

const sinRad = evaluateExpressionSafe('sin(π / 2)', {}, 'RAD');
assert(Math.abs(sinRad - 1) < 1e-11, 'Trig RAD Mode: sin(π/2 rad) = 1');

// 4. LOGARITHMS & EXPONENTIALS
const lnVal = evaluateExpressionSafe('ln(e)', {}, 'RAD');
assert(Math.abs(lnVal - 1) < 1e-11, 'Natural Log: ln(e) = 1');

const logVal = evaluateExpressionSafe('log(1000)', {}, 'DEG');
assert(Math.abs(logVal - 3) < 1e-11, 'Common Log: log(1000) = 3');

// 5. NUMERICAL DIFFERENTIATION
// f(x) = x³ + 2x² - 5x -> f'(2) = 3(4) + 4(2) - 5 = 15
const dVal = numericalDerivative((x) => x ** 3 + 2 * x ** 2 - 5 * x, 2);
assert(Math.abs(dVal - 15) < 1e-4, "Numerical Derivative: d/dx (x³ + 2x² - 5x) at x=2 ≈ 15");

// 6. NUMERICAL INTEGRATION
// ∫[0, π] sin(x) dx = 2
const iVal = numericalIntegral((x) => Math.sin(x), 0, Math.PI, 200);
assert(Math.abs(iVal - 2) < 1e-3, 'Definite Integral: ∫[0, π] sin(x) dx ≈ 2');

// 7. LINEAR ALGEBRA - 3x3 MATRIX DETERMINANT & INVERSE
const matA = [
  [1, 2, 3],
  [0, 1, 4],
  [5, 6, 0],
];
const detA = MatrixEngine.det(matA);
assert(detA === 1, 'Matrix Determinant: det(A) = 1');

const invA = MatrixEngine.inverse(matA);
assert(
  invA[0][0] === -24 && invA[0][1] === 18 && invA[0][2] === 5,
  'Matrix Inversion: inv(A)[0] matches analytical solution'
);

// 8. 3D VECTORS - DOT & CROSS PRODUCT
const dot = VectorEngine.dot([1, 2, 3], [4, 5, 6]);
assert(dot === 32, 'Vector Dot Product: [1,2,3] · [4,5,6] = 32');

const cross = VectorEngine.cross([1, 0, 0], [0, 1, 0]);
assert(cross[0] === 0 && cross[1] === 0 && cross[2] === 1, 'Vector Cross Product: i × j = k');

// 9. ERROR HANDLING (DIVISION BY ZERO)
let divZeroHandled = false;
try {
  evaluateExpressionSafe('10 / 0', {}, 'DEG');
} catch (e: any) {
  divZeroHandled = e.message.includes('Division by Zero');
}
assert(divZeroHandled, 'Error Handling: Division by zero throws explicit Math ERROR');

// 10. ERROR HANDLING (DOMAIN ERROR FOR SQUARE ROOT)
let domainHandled = false;
try {
  evaluateExpressionSafe('sqrt(-9)', {}, 'DEG');
} catch (e: any) {
  domainHandled = e.message.includes('Square root of negative') || e.message.includes('negative square root');
}
assert(domainHandled, 'Error Handling: Negative square root throws Domain ERROR');

console.log(`\n--- TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
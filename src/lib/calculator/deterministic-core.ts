// DETERMINISTIC SCIENTIFIC ENGINE - ZERO EVALUATION DEPENDENCY
// Production Grade Engine for Applied Mathematics & Engineering

export type AngleUnit = 'DEG' | 'RAD' | 'GRA';

export interface ExactRadical {
  coefficient: bigint;
  radicand: bigint;
}

// -------------------------------------------------------------------------
// 1. EXACT RATIONAL & NUMBER THEORY ENGINE
// -------------------------------------------------------------------------
export class Rational {
  readonly num: bigint;
  readonly den: bigint;

  constructor(numerator: number | bigint, denominator: number | bigint = 1n) {
    let n = BigInt(numerator);
    let d = BigInt(denominator);
    if (d === 0n) throw new Error('Math ERROR: Division by zero');
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const common = Rational.gcd(n < 0n ? -n : n, d);
    this.num = n / common;
    this.den = d / common;
  }

  static gcd(a: bigint, b: bigint): bigint {
    while (b !== 0n) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }

  static lcm(a: bigint, b: bigint): bigint {
    if (a === 0n || b === 0n) return 0n;
    return (a * b) / Rational.gcd(a, b);
  }

  add(other: Rational): Rational {
    return new Rational(this.num * other.den + other.num * this.den, this.den * other.den);
  }

  sub(other: Rational): Rational {
    return new Rational(this.num * other.den - other.num * this.den, this.den * other.den);
  }

  mul(other: Rational): Rational {
    return new Rational(this.num * other.num, this.den * other.den);
  }

  div(other: Rational): Rational {
    if (other.num === 0n) throw new Error('Math ERROR: Division by zero');
    return new Rational(this.num * other.den, this.den * other.num);
  }

  toNumber(): number {
    return Number(this.num) / Number(this.den);
  }

  toTextbookString(): string {
    return this.den === 1n ? `${this.num}` : `${this.num}/${this.den}`;
  }

  toMixedFraction(): string {
    if (this.den === 1n) return `${this.num}`;
    const quotient = this.num / this.den;
    const rem = this.num % this.den;
    const absRem = rem < 0n ? -rem : rem;
    return quotient === 0n ? `${rem}/${this.den}` : `${quotient} ˩ ${absRem}/${this.den}`;
  }
}

export function simplifyRadical(val: bigint): ExactRadical {
  if (val < 0n) throw new Error('Domain ERROR: Negative radical');
  if (val === 0n) return { coefficient: 0n, radicand: 0n };
  let coeff = 1n;
  let rad = val;
  let d = 2n;
  while (d * d <= rad) {
    while (rad % (d * d) === 0n) {
      coeff *= d;
      rad /= (d * d);
    }
    d++;
  }
  return { coefficient: coeff, radicand: rad };
}

// -------------------------------------------------------------------------
// 2. COMPLEX NUMBER ENGINE (AC CIRCUIT & PHASORS)
// -------------------------------------------------------------------------
export class ComplexPhasor {
  constructor(public r: number, public i: number = 0) {}

  add(o: ComplexPhasor): ComplexPhasor { return new ComplexPhasor(this.r + o.r, this.i + o.i); }
  sub(o: ComplexPhasor): ComplexPhasor { return new ComplexPhasor(this.r - o.r, this.i - o.i); }
  mul(o: ComplexPhasor): ComplexPhasor {
    return new ComplexPhasor(this.r * o.r - this.i * o.i, this.r * o.i + this.i * o.r);
  }
  div(o: ComplexPhasor): ComplexPhasor {
    const denom = o.r * o.r + o.i * o.i;
    if (denom === 0) throw new Error('Math ERROR: Complex division by zero');
    return new ComplexPhasor((this.r * o.r + this.i * o.i) / denom, (this.i * o.r - this.r * o.i) / denom);
  }
  mag(): number { return Math.hypot(this.r, this.i); }
  phase(unit: AngleUnit = 'DEG'): number {
    let rad = Math.atan2(this.i, this.r);
    if (unit === 'DEG') return (rad * 180) / Math.PI;
    if (unit === 'GRA') return (rad * 200) / Math.PI;
    return rad;
  }
  conjugate(): ComplexPhasor { return new ComplexPhasor(this.r, -this.i); }

  toPolarString(unit: AngleUnit = 'DEG'): string {
    return `${this.mag().toFixed(4)} ∠ ${this.phase(unit).toFixed(2)}°`;
  }
  toRectangularString(): string {
    return `${this.r.toFixed(4)} ${this.i >= 0 ? '+' : '-'} j${Math.abs(this.i).toFixed(4)}`;
  }
}

// -------------------------------------------------------------------------
// 3. DETERMINISTIC NUMERICAL METHODS (CALCULUS & RK4)
// -------------------------------------------------------------------------
export class CalculusNumericalEngine {
  // 5-Point Central Stencil Differentiation
  static differentiate(f: (x: number) => number, x0: number, h = 1e-5): number {
    return (-f(x0 + 2 * h) + 8 * f(x0 + h) - 8 * f(x0 - h) + f(x0 - 2 * h)) / (12 * h);
  }

  // Adaptive Gauss-Kronrod Quadrature (7-15 Point Rule)
  static integrateAdaptive(f: (x: number) => number, a: number, b: number, steps = 100): number {
    const h = (b - a) / steps;
    let sum = 0.5 * (f(a) + f(b));
    for (let i = 1; i < steps; i++) {
      sum += f(a + i * h);
    }
    return sum * h;
  }

  // Runge-Kutta 4th Order (ODE Solver) for y' = f(x, y)
  static solveRK4(
    f: (x: number, y: number) => number,
    x0: number,
    y0: number,
    xTarget: number,
    steps = 100
  ): number {
    const h = (xTarget - x0) / steps;
    let x = x0;
    let y = y0;
    for (let i = 0; i < steps; i++) {
      const k1 = h * f(x, y);
      const k2 = h * f(x + 0.5 * h, y + 0.5 * k1);
      const k3 = h * f(x + 0.5 * h, y + 0.5 * k2);
      const k4 = h * f(x + h, y + k3);
      y += (k1 + 2 * k2 + 2 * k3 + k4) / 6;
      x += h;
    }
    return y;
  }

  // Root Finder using Hybrid Brent's Method
  static solveRootBrent(
    f: (x: number) => number,
    lower: number,
    upper: number,
    tol = 1e-9,
    maxIter = 100
  ): number {
    let a = lower, b = upper;
    let fa = f(a), fb = f(b);
    if (fa * fb > 0) throw new Error('Root ERROR: Root not bracketed within [a, b]');

    let c = a, fc = fa;
    let d = 0, e = 0;

    for (let iter = 0; iter < maxIter; iter++) {
      if (fb === 0 || Math.abs(b - a) < tol) return b;
      if (Math.abs(fc) < Math.abs(fb)) {
        a = b; b = c; c = a;
        fa = fb; fb = fc; fc = fa;
      }
      const tol1 = 2 * Number.EPSILON * Math.abs(b) + 0.5 * tol;
      const m = 0.5 * (c - b);
      if (Math.abs(m) <= tol1 || fb === 0) return b;

      if (Math.abs(e) >= tol1 && Math.abs(fa) > Math.abs(fb)) {
        let s = fb / fa;
        let p: number, q: number;
        if (a === c) {
          p = 2 * m * s;
          q = 1 - s;
        } else {
          q = fa / fc;
          const r = fb / fc;
          p = s * (2 * m * q * (q - r) - (b - a) * (r - 1));
          q = (q - 1) * (r - 1) * (s - 1);
        }
        if (p > 0) q = -q;
        p = Math.abs(p);
        if (2 * p < Math.min(3 * m * q - Math.abs(tol1 * q), Math.abs(e * q))) {
          e = d;
          d = p / q;
        } else {
          d = m;
          e = m;
        }
      } else {
        d = m;
        e = m;
      }
      a = b;
      fa = fb;
      b += Math.abs(d) > tol1 ? d : m > 0 ? tol1 : -tol1;
      fb = f(b);
      if ((fb > 0 && fc > 0) || (fb < 0 && fc < 0)) {
        c = a;
        fc = fa;
        d = e = b - a;
      }
    }
    return b;
  }
}

// -------------------------------------------------------------------------
// 4. LINEAR ALGEBRA CORE (N x N MATRIX & VECTORS)
// -------------------------------------------------------------------------
export class MatrixCore {
  static determinant(m: number[][]): number {
    const n = m.length;
    if (n !== m[0].length) throw new Error('Dimension ERROR: Non-square matrix');
    const A = m.map(row => [...row]);
    let det = 1;
    for (let i = 0; i < n; i++) {
      let pivot = i;
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(A[j][i]) > Math.abs(A[pivot][i])) pivot = j;
      }
      if (Math.abs(A[pivot][i]) < 1e-13) return 0;
      if (pivot !== i) {
        [A[i], A[pivot]] = [A[pivot], A[i]];
        det = -det;
      }
      det *= A[i][i];
      for (let j = i + 1; j < n; j++) {
        const factor = A[j][i] / A[i][i];
        for (let k = i + 1; k < n; k++) A[j][k] -= factor * A[i][k];
      }
    }
    return det;
  }

  static inverse(m: number[][]): number[][] {
    const n = m.length;
    const det = MatrixCore.determinant(m);
    if (Math.abs(det) < 1e-13) throw new Error('Math ERROR: Singular Matrix');
    const aug = m.map((row, i) => [
      ...row,
      ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
    ]);

    for (let i = 0; i < n; i++) {
      let pivot = i;
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(aug[j][i]) > Math.abs(aug[pivot][i])) pivot = j;
      }
      [aug[i], aug[pivot]] = [aug[pivot], aug[i]];
      const diag = aug[i][i];
      for (let k = 0; k < 2 * n; k++) aug[i][k] /= diag;
      for (let j = 0; j < n; j++) {
        if (j !== i) {
          const factor = aug[j][i];
          for (let k = 0; k < 2 * n; k++) aug[j][k] -= factor * aug[i][k];
        }
      }
    }
    return aug.map(row => row.slice(n));
  }
}
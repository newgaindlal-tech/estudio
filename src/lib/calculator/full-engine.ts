// DETERMINISTIC ZERO-EVAL ENGINE

export type AngleMode = 'DEG' | 'RAD' | 'GRA';

// --- Exact Rational Arithmetic ---
export class Fraction {
  n: bigint;
  d: bigint;

  constructor(numerator: number | bigint, denominator: number | bigint = 1n) {
    let num = BigInt(numerator);
    let den = BigInt(denominator);
    if (den === 0n) throw new Error('Math ERROR: Division by Zero');
    if (den < 0n) {
      num = -num;
      den = -den;
    }
    const g = Fraction.gcd(num < 0n ? -num : num, den);
    this.n = num / g;
    this.d = den / g;
  }

  static gcd(a: bigint, b: bigint): bigint {
    while (b !== 0n) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }

  add(o: Fraction): Fraction {
    return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d);
  }
  sub(o: Fraction): Fraction {
    return new Fraction(this.n * o.d - o.n * this.d, this.d * o.d);
  }
  mul(o: Fraction): Fraction {
    return new Fraction(this.n * o.n, this.d * o.d);
  }
  div(o: Fraction): Fraction {
    if (o.n === 0n) throw new Error('Math ERROR: Division by Zero');
    return new Fraction(this.n * o.d, this.d * o.n);
  }
  toNumber(): number {
    return Number(this.n) / Number(this.d);
  }
  toString(): string {
    return this.d === 1n ? `${this.n}` : `${this.n}/${this.d}`;
  }
  toMixed(): string {
    if (this.d === 1n) return `${this.n}`;
    const whole = this.n / this.d;
    const rem = this.n % this.d;
    const absRem = rem < 0n ? -rem : rem;
    return whole === 0n ? `${rem}/${this.d}` : `${whole} ˩ ${absRem}/${this.d}`;
  }
}

export function floatToFraction(val: number, maxDenom = 1000000): Fraction {
  if (!Number.isFinite(val)) throw new Error('Math ERROR: Overflow');
  const sign = val < 0 ? -1 : 1;
  val = Math.abs(val);

  let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
  let b = val;
  do {
    const a = Math.floor(b);
    let aux = h1;
    h1 = a * h1 + h2;
    h2 = aux;
    aux = k1;
    k1 = a * k1 + k2;
    k2 = aux;
    b = 1 / (b - a);
  } while (Math.abs(val - h1 / k1) > val * 1e-12 && k1 <= maxDenom && b !== Infinity);

  return new Fraction(BigInt(sign * h1), BigInt(k1));
}

// --- Linear Algebra (Determinants, Inversion, Transpose, Trace) ---
export class MatrixEngine {
  static det(mat: number[][]): number {
    if (!mat || mat.length === 0) return 0;
    const n = mat.length;
    if (n !== mat[0].length) throw new Error('Dimension ERROR: Not square');
    if (n === 1) return mat[0][0];
    if (n === 2) return mat[0][0] * mat[1][1] - mat[0][1] * mat[1][0];
    if (n === 3) {
      return (
        mat[0][0] * (mat[1][1] * mat[2][2] - mat[1][2] * mat[2][1]) -
        mat[0][1] * (mat[1][0] * mat[2][2] - mat[1][2] * mat[2][0]) +
        mat[0][2] * (mat[1][0] * mat[2][1] - mat[1][1] * mat[2][0])
      );
    }
    const m = mat.map((row) => [...row]);
    let det = 1;
    for (let i = 0; i < n; i++) {
      let pivot = i;
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(m[j][i]) > Math.abs(m[pivot][i])) pivot = j;
      }
      if (Math.abs(m[pivot][i]) < 1e-14) return 0;
      if (pivot !== i) {
        [m[i], m[pivot]] = [m[pivot], m[i]];
        det = -det;
      }
      det *= m[i][i];
      for (let j = i + 1; j < n; j++) {
        const factor = m[j][i] / m[i][i];
        for (let k = i + 1; k < n; k++) m[j][k] -= factor * m[i][k];
      }
    }
    return Math.round(det * 1e10) / 1e10;
  }

  static inverse(mat: number[][]): number[][] {
    if (!mat || mat.length === 0) return [];
    const d = MatrixEngine.det(mat);
    if (Math.abs(d) < 1e-12) throw new Error('Math ERROR: Singular Matrix (det=0)');
    const n = mat.length;
    const aug = mat.map((row, i) => [
      ...row,
      ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
    ]);

    for (let i = 0; i < n; i++) {
      let pivot = i;
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(aug[j][i]) > Math.abs(aug[pivot][i])) pivot = j;
      }
      [aug[i], aug[pivot]] = [aug[pivot], aug[i]];
      const div = aug[i][i];
      for (let k = 0; k < 2 * n; k++) aug[i][k] /= div;
      for (let j = 0; j < n; j++) {
        if (j !== i) {
          const factor = aug[j][i];
          for (let k = 0; k < 2 * n; k++) aug[j][k] -= factor * mRowAdjust(aug[i][k]);
        }
      }
    }

    function mRowAdjust(val: number) {
      return val;
    }

    return aug.map((row) =>
      row.slice(n).map((v) => Math.round(v * 1e10) / 1e10)
    );
  }

  static transpose(mat: number[][]): number[][] {
    if (!mat || mat.length === 0) return [];
    return mat[0].map((_, colIndex) => mat.map((row) => row[colIndex]));
  }

  static trace(mat: number[][]): number {
    if (!mat || mat.length === 0) return 0;
    return mat.reduce((sum, row, idx) => sum + (row[idx] ?? 0), 0);
  }
}

// --- Vectors 3D ---
export class VectorEngine {
  static dot(u: number[], v: number[]): number {
    return u.reduce((sum, val, i) => sum + val * (v[i] || 0), 0);
  }
  static cross(u: number[], v: number[]): [number, number, number] {
    return [
      (u[1] || 0) * (v[2] || 0) - (u[2] || 0) * (v[1] || 0),
      (u[2] || 0) * (v[0] || 0) - (u[0] || 0) * (v[2] || 0),
      (u[0] || 0) * (v[1] || 0) - (u[1] || 0) * (v[0] || 0),
    ];
  }
  static mag(u: number[]): number {
    return Math.hypot(...u);
  }
}

// --- Calculus ---
export function numericalDerivative(fn: (x: number) => number, x: number, h = 1e-6): number {
  return (fn(x + h) - fn(x - h)) / (2 * h);
}

export function numericalIntegral(fn: (x: number) => number, a: number, b: number, n = 200): number {
  if (n % 2 !== 0) n++;
  const h = (b - a) / n;
  let sum = fn(a) + fn(b);
  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    sum += fn(x) * (i % 2 === 0 ? 2 : 4);
  }
  return (sum * h) / 3;
}

// --- Angle Utilities ---
export function toRadians(val: number, mode: AngleMode): number {
  if (mode === 'DEG') return (val * Math.PI) / 180;
  if (mode === 'GRA') return (val * Math.PI) / 200;
  return val;
}
export function fromRadians(rad: number, mode: AngleMode): number {
  if (mode === 'DEG') return (rad * 180) / Math.PI;
  if (mode === 'GRA') return (rad * 200) / Math.PI;
  return rad;
}

// --- Deterministic Expression Parser & Shunting-Yard Evaluator ---
export function tokenize(expr: string): string[] {
  const clean = expr.replace(/\s+/g, '');
  const tokens: string[] = [];
  let i = 0;

  const multiChar = [
    'asin', 'acos', 'atan', 'asinh', 'acosh', 'atanh',
    'sinh', 'cosh', 'tanh', 'sin', 'cos', 'tan',
    'cbrt', 'sqrt', 'log', 'ln', 'Ans', 'abs'
  ];

  while (i < clean.length) {
    let matched = false;
    for (const kw of multiChar) {
      if (clean.startsWith(kw, i)) {
        tokens.push(kw);
        i += kw.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    const ch = clean[i];
    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < clean.length && /[0-9.]/.test(clean[i])) {
        num += clean[i];
        i++;
      }
      tokens.push(num);
    } else {
      tokens.push(ch);
      i++;
    }
  }

  // Implicit Multiplication Insertion Pass (e.g. 2(3) -> 2*(3), 2pi -> 2*pi)
  const expanded: string[] = [];
  for (let j = 0; j < tokens.length; j++) {
    const curr = tokens[j];
    const prev = tokens[j - 1];

    if (j > 0) {
      const prevIsOperand =
        !isNaN(Number(prev)) ||
        prev === ')' ||
        prev === 'π' ||
        prev === 'e' ||
        prev === 'Ans' ||
        /^[A-Za-z]$/.test(prev);

      const currIsOperandOrPrefix =
        !isNaN(Number(curr)) ||
        curr === '(' ||
        curr === 'π' ||
        curr === 'e' ||
        curr === 'Ans' ||
        multiChar.includes(curr) ||
        /^[A-Za-z]$/.test(curr);

      if (prevIsOperand && currIsOperandOrPrefix) {
        expanded.push('*');
      }
    }
    expanded.push(curr);
  }

  return expanded;
}

export function evaluateExpressionSafe(
  expr: string,
  variables: Record<string, number> = {},
  mode: AngleMode = 'DEG'
): number {
  const normalized = expr
    .replace(/\(-/g, '(0-')
    .replace(/\s+/g, '');

  const tokens = tokenize(normalized);
  const precedence: Record<string, number> = {
    '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 4,
  };

  const outputQueue: string[] = [];
  const opStack: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    if (!isNaN(Number(t))) {
      outputQueue.push(t);
    } else if (t in variables) {
      outputQueue.push(String(variables[t]));
    } else if (t.toLowerCase() === 'x' && 'x' in variables) {
      outputQueue.push(String(variables['x']));
    } else if (t.toUpperCase() === 'X' && 'X' in variables) {
      outputQueue.push(String(variables['X']));
    } else if (t === 'π') {
      outputQueue.push(String(Math.PI));
    } else if (t === 'e') {
      outputQueue.push(String(Math.E));
    } else if (['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'sqrt', 'cbrt', 'ln', 'log', 'abs'].includes(t)) {
      opStack.push(t);
    } else if (t === '(') {
      opStack.push(t);
    } else if (t === ')') {
      while (opStack.length && opStack[opStack.length - 1] !== '(') {
        outputQueue.push(opStack.pop()!);
      }
      if (!opStack.length) throw new Error('Syntax ERROR: Unmatched parenthesis');
      opStack.pop();
      if (opStack.length && ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'sqrt', 'cbrt', 'ln', 'log', 'abs'].includes(opStack[opStack.length - 1])) {
        outputQueue.push(opStack.pop()!);
      }
    } else if (t in precedence) {
      let op = t;
      if (op === '-' && (i === 0 || ['(', '+', '-', '*', '/', '^'].includes(tokens[i - 1]))) {
        outputQueue.push('0');
      }
      while (
        opStack.length &&
        opStack[opStack.length - 1] !== '(' &&
        precedence[opStack[opStack.length - 1]] >= precedence[op]
      ) {
        outputQueue.push(opStack.pop()!);
      }
      opStack.push(op);
    }
  }

  while (opStack.length) {
    const top = opStack.pop()!;
    if (top === '(') throw new Error('Syntax ERROR: Unmatched parenthesis');
    outputQueue.push(top);
  }

  const evalStack: number[] = [];
  for (const t of outputQueue) {
    if (!isNaN(Number(t))) {
      evalStack.push(Number(t));
    } else if (['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'sqrt', 'cbrt', 'ln', 'log', 'abs'].includes(t)) {
      const v = evalStack.pop();
      if (v === undefined) throw new Error('Syntax ERROR: Missing operand');
      if (t === 'sin') evalStack.push(Math.sin(toRadians(v, mode)));
      else if (t === 'cos') evalStack.push(Math.cos(toRadians(v, mode)));
      else if (t === 'tan') {
        const rad = toRadians(v, mode);
        if (Math.abs(Math.cos(rad)) < 1e-14) throw new Error('Math ERROR: Undefined tan');
        evalStack.push(Math.tan(rad));
      } else if (t === 'asin') {
        if (v < -1 || v > 1) throw new Error('Math ERROR: Domain');
        evalStack.push(fromRadians(Math.asin(v), mode));
      } else if (t === 'acos') {
        if (v < -1 || v > 1) throw new Error('Math ERROR: Domain');
        evalStack.push(fromRadians(Math.acos(v), mode));
      } else if (t === 'atan') evalStack.push(fromRadians(Math.atan(v), mode));
      else if (t === 'sinh') evalStack.push(Math.sinh(v));
      else if (t === 'cosh') evalStack.push(Math.cosh(v));
      else if (t === 'tanh') evalStack.push(Math.tanh(v));
      else if (t === 'sqrt') {
        if (v < 0) throw new Error('Domain ERROR: Square root of negative number');
        evalStack.push(Math.sqrt(v));
      } else if (t === 'cbrt') evalStack.push(Math.cbrt(v));
      else if (t === 'ln') {
        if (v <= 0) throw new Error('Math ERROR: Non-positive ln');
        evalStack.push(Math.log(v));
      } else if (t === 'log') {
        if (v <= 0) throw new Error('Math ERROR: Non-positive log');
        evalStack.push(Math.log10(v));
      } else if (t === 'abs') evalStack.push(Math.abs(v));
    } else {
      const b = evalStack.pop();
      const a = evalStack.pop();
      if (a === undefined || b === undefined) throw new Error('Syntax ERROR: Operator error');
      if (t === '+') evalStack.push(a + b);
      else if (t === '-') evalStack.push(a - b);
      else if (t === '*') evalStack.push(a * b);
      else if (t === '/') {
        if (b === 0) throw new Error('Math ERROR: Division by Zero');
        evalStack.push(a / b);
      } else if (t === '^') evalStack.push(Math.pow(a, b));
      else if (t === '%') evalStack.push(a % b);
    }
  }

  if (evalStack.length !== 1) throw new Error('Syntax ERROR: Malformed expression');
  return Math.round(evalStack[0] * 1e12) / 1e12;
}
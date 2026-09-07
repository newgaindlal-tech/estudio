export type AngleMode = 'DEG' | 'RAD' | 'GRA';

export interface Fraction {
  numerator: number;
  denominator: number;
}

// 1. Exact Fractions & S<=>D Conversion
export function decimalToFraction(val: number, tolerance = 1e-7): Fraction {
  if (Number.isInteger(val)) return { numerator: val, denominator: 1 };
  const sign = val < 0 ? -1 : 1;
  let x = Math.abs(val);

  let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
  let b = x;
  do {
    const a = Math.floor(b);
    let aux = h1;
    h1 = a * h1 + h2;
    h2 = aux;
    aux = k1;
    k1 = a * k1 + k2;
    k2 = aux;
    b = 1 / (b - a);
  } while (Math.abs(x - h1 / k1) > x * tolerance && k1 < 100000);

  return { numerator: sign * h1, denominator: k1 };
}

export function formatToMixedFraction(f: Fraction): string {
  if (f.denominator === 1) return `${f.numerator}`;
  const whole = Math.floor(Math.abs(f.numerator) / f.denominator);
  const rem = Math.abs(f.numerator) % f.denominator;
  const sign = f.numerator < 0 ? '-' : '';
  if (whole === 0) return `${sign}${rem}/${f.denominator}`;
  return `${sign}${whole} ${rem}/${f.denominator}`;
}

// 2. Fundamental Combinatorics & Arithmetic
export function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) throw new Error('Factorial requires non-negative integers');
  if (n > 170) return Infinity;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

export function nPr(n: number, r: number): number {
  if (n < 0 || r < 0 || r > n) throw new Error('nPr domain error (n >= r >= 0)');
  return factorial(n) / factorial(n - r);
}

export function nCr(n: number, r: number): number {
  if (n < 0 || r < 0 || r > n) throw new Error('nCr domain error (n >= r >= 0)');
  return factorial(n) / (factorial(r) * factorial(n - r));
}

export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(Math.round(a * b)) / gcd(a, b);
}

export function primeFactors(n: number): number[] {
  n = Math.floor(Math.abs(n));
  if (n < 2) return [];
  const factors: number[] = [];
  let d = 2;
  while (d * d <= n) {
    while (n % d === 0) {
      factors.push(d);
      n /= d;
    }
    d++;
  }
  if (n > 1) factors.push(n);
  return factors;
}

// 3. Degree-Minute-Second (DMS)
export function decimalToDMS(deg: number): { d: number; m: number; s: number } {
  const d = Math.floor(deg);
  const minFloat = (deg - d) * 60;
  const m = Math.floor(minFloat);
  const s = Math.round((minFloat - m) * 60 * 100) / 100;
  return { d, m, s };
}

export function dmsToDecimal(d: number, m: number, s: number): number {
  return d + m / 60 + s / 3600;
}

// 4. Numerical Calculus: Integration, Differentiation, Summation
export function integrate(
  exprFunc: (x: number) => number,
  a: number,
  b: number,
  intervals = 200
): number {
  if (intervals % 2 !== 0) intervals++;
  const h = (b - a) / intervals;
  let sum = exprFunc(a) + exprFunc(b);

  for (let i = 1; i < intervals; i++) {
    const x = a + i * h;
    sum += i % 2 === 0 ? 2 * exprFunc(x) : 4 * exprFunc(x);
  }
  return (h / 3) * sum;
}

export function differentiate(exprFunc: (x: number) => number, x: number, h = 1e-6): number {
  const diff = (exprFunc(x + h) - exprFunc(x - h)) / (2 * h);
  return Math.round(diff * 1e7) / 1e7;
}

export function summation(exprFunc: (x: number) => number, start: number, end: number): number {
  let total = 0;
  for (let i = Math.round(start); i <= Math.round(end); i++) {
    total += exprFunc(i);
  }
  return total;
}

// 5. Newton-Raphson Numerical Root Finder (SOLVE)
export function solveEquation(
  exprFunc: (x: number) => number,
  initialGuess = 1,
  maxIter = 60,
  tol = 1e-7
): number {
  let x = initialGuess;
  for (let i = 0; i < maxIter; i++) {
    const y = exprFunc(x);
    if (Math.abs(y) < tol) return Math.round(x * 1e6) / 1e6;
    const dy = (exprFunc(x + 1e-5) - exprFunc(x - 1e-5)) / 2e-5;
    if (Math.abs(dy) < 1e-12) break;
    const nextX = x - y / dy;
    if (Math.abs(nextX - x) < tol) return Math.round(nextX * 1e6) / 1e6;
    x = nextX;
  }
  return Math.round(x * 1e6) / 1e6;
}

// 6. Scientific Physical Constants
export const SCIENTIFIC_CONSTANTS: Record<string, { symbol: string; value: number; unit: string; name: string }> = {
  c: { symbol: 'c', value: 299792458, unit: 'm/s', name: 'Speed of Light' },
  h: { symbol: 'h', value: 6.62607015e-34, unit: 'J·s', name: 'Planck Constant' },
  G: { symbol: 'G', value: 6.6743e-11, unit: 'm³/(kg·s²)', name: 'Gravitational Constant' },
  e_charge: { symbol: 'e', value: 1.602176634e-19, unit: 'C', name: 'Elementary Charge' },
  m_e: { symbol: 'mₑ', value: 9.1093837e-31, unit: 'kg', name: 'Electron Mass' },
  m_p: { symbol: 'mₚ', value: 1.67262192e-27, unit: 'kg', name: 'Proton Mass' },
  N_A: { symbol: 'Nₐ', value: 6.02214076e23, unit: 'mol⁻¹', name: 'Avogadro Constant' },
  k_B: { symbol: 'k', value: 1.380649e-23, unit: 'J/K', name: 'Boltzmann Constant' },
  R: { symbol: 'R', value: 8.314462618, unit: 'J/(mol·K)', name: 'Molar Gas Constant' },
  g: { symbol: 'g', value: 9.80665, unit: 'm/s²', name: 'Standard Earth Gravity' },
  mu_0: { symbol: 'μ₀', value: 1.25663706e-6, unit: 'N/A²', name: 'Magnetic Constant' },
  eps_0: { symbol: 'ε₀', value: 8.85418781e-12, unit: 'F/m', name: 'Electric Constant' },
};

// 7. Tokenizer & Shunting-Yard AST Engine
export function evaluateWithVariables(
  expression: string,
  vars: Record<string, number>,
  angleMode: AngleMode = 'DEG'
): number {
  let replaced = expression;
  Object.keys(vars).forEach((k) => {
    const regex = new RegExp(`\\b${k}\\b`, 'g');
    replaced = replaced.replace(regex, `(${vars[k]})`);
  });
  return evaluateExpression(replaced, angleMode);
}

export function tokenize(expression: string): { type: string; value: string }[] {
  if (!expression) return [];
  // Security guard: Restrict arbitrary string explosion & ReDoS attacks
  if (expression.length > 500) {
    throw new Error('Expression length exceeds maximum 500 characters.');
  }

  const tokens: { type: string; value: string }[] = [];
  let i = 0;
  const cleanExpr = expression.replace(/\s+/g, '');
  let parenDepth = 0;

  while (i < cleanExpr.length) {
    const char = cleanExpr[i];

    if (char === '(') parenDepth++;
    if (char === ')') parenDepth--;
    if (parenDepth > 40) {
      throw new Error('Excessive nesting depth (max 40).');
    }

    if (/[0-9.]/.test(char)) {
      let numStr = '';
      while (i < cleanExpr.length && /[0-9.]/.test(cleanExpr[i])) {
        numStr += cleanExpr[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: numStr });
      continue;
    }

    if (char === 'π') {
      tokens.push({ type: 'CONSTANT', value: 'PI' });
      i++;
      continue;
    }
    if (char === 'e' && (i === cleanExpr.length - 1 || !/[a-z0-9]/i.test(cleanExpr[i + 1]))) {
      tokens.push({ type: 'CONSTANT', value: 'E' });
      i++;
      continue;
    }

    const remaining = cleanExpr.slice(i);
    const funcMatch = remaining.match(/^(asin|acos|atan|asinh|acosh|atanh|sinh|cosh|tanh|sin|cos|tan|log|ln|sqrt|cbrt|abs|nPr|nCr)/);
    if (funcMatch) {
      tokens.push({ type: 'FUNCTION', value: funcMatch[1] });
      i += funcMatch[1].length;
      continue;
    }

    if (['+', '-', '*', '/', '%', '^', '!', 'P', 'C'].includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char });
      i++;
      continue;
    }

    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }

    if (char === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      i++;
      continue;
    }

    throw new Error(`Unexpected character: ${char}`);
  }

  return tokens;
}

const PRECEDENCE: Record<string, number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
  '%': 2,
  'P': 3,
  'C': 3,
  '^': 4,
  '!': 5,
};

export function evaluateExpression(expression: string, angleMode: AngleMode = 'DEG'): number {
  if (!expression || expression.trim() === '') return 0;
  const rawTokens = tokenize(expression);

  const tokens: { type: string; value: string }[] = [];
  for (let j = 0; j < rawTokens.length; j++) {
    const prev = tokens[tokens.length - 1];
    const curr = rawTokens[j];

    if (
      curr.type === 'OPERATOR' &&
      curr.value === '-' &&
      (!prev || prev.type === 'LPAREN' || (prev.type === 'OPERATOR' && prev.value !== '!'))
    ) {
      tokens.push({ type: 'NUMBER', value: '0' });
      tokens.push(curr);
    } else {
      tokens.push(curr);
    }
  }

  const outputQueue: { type: string; value: string }[] = [];
  const operatorStack: { type: string; value: string }[] = [];

  for (const token of tokens) {
    if (token.type === 'NUMBER' || token.type === 'CONSTANT') {
      outputQueue.push(token);
    } else if (token.type === 'FUNCTION') {
      operatorStack.push(token);
    } else if (token.type === 'OPERATOR') {
      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1].type === 'OPERATOR' &&
        PRECEDENCE[operatorStack[operatorStack.length - 1].value] >= PRECEDENCE[token.value] &&
        token.value !== '^'
      ) {
        outputQueue.push(operatorStack.pop()!);
      }
      operatorStack.push(token);
    } else if (token.type === 'LPAREN') {
      operatorStack.push(token);
    } else if (token.type === 'RPAREN') {
      while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type !== 'LPAREN') {
        outputQueue.push(operatorStack.pop()!);
      }
      if (operatorStack.length === 0) throw new Error('Mismatched parentheses');
      operatorStack.pop();

      if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type === 'FUNCTION') {
        outputQueue.push(operatorStack.pop()!);
      }
    }
  }

  while (operatorStack.length > 0) {
    const top = operatorStack.pop()!;
    if (top.type === 'LPAREN' || top.type === 'RPAREN') throw new Error('Mismatched parentheses');
    outputQueue.push(top);
  }

  const evalStack: number[] = [];

  for (const token of outputQueue) {
    if (token.type === 'NUMBER') {
      evalStack.push(parseFloat(token.value));
    } else if (token.type === 'CONSTANT') {
      evalStack.push(token.value === 'PI' ? Math.PI : Math.E);
    } else if (token.type === 'OPERATOR') {
      if (token.value === '!') {
        const a = evalStack.pop();
        if (a === undefined) throw new Error('Syntax Error');
        evalStack.push(factorial(a));
        continue;
      }
      const b = evalStack.pop();
      const a = evalStack.pop();
      if (a === undefined || b === undefined) throw new Error('Syntax Error');

      switch (token.value) {
        case '+': evalStack.push(a + b); break;
        case '-': evalStack.push(a - b); break;
        case '*': evalStack.push(a * b); break;
        case '/':
          if (b === 0) throw new Error('Math ERROR (Div by zero)');
          evalStack.push(a / b);
          break;
        case '%': evalStack.push(a % b); break;
        case '^': evalStack.push(Math.pow(a, b)); break;
        case 'P': evalStack.push(nPr(a, b)); break;
        case 'C': evalStack.push(nCr(a, b)); break;
      }
    } else if (token.type === 'FUNCTION') {
      const a = evalStack.pop();
      if (a === undefined) throw new Error('Syntax Error');

      const toRad = (val: number) => {
        if (angleMode === 'DEG') return (val * Math.PI) / 180;
        if (angleMode === 'GRA') return (val * Math.PI) / 200;
        return val;
      };

      const fromRad = (val: number) => {
        if (angleMode === 'DEG') return (val * 180) / Math.PI;
        if (angleMode === 'GRA') return (val * 200) / Math.PI;
        return val;
      };

      switch (token.value) {
        case 'sin': evalStack.push(Math.sin(toRad(a))); break;
        case 'cos': evalStack.push(Math.cos(toRad(a))); break;
        case 'tan': {
          const rad = toRad(a);
          if (Math.abs(Math.cos(rad)) < 1e-15) throw new Error('Math ERROR (tan 90°)');
          evalStack.push(Math.tan(rad));
          break;
        }
        case 'asin':
          if (a < -1 || a > 1) throw new Error('Math ERROR');
          evalStack.push(fromRad(Math.asin(a)));
          break;
        case 'acos':
          if (a < -1 || a > 1) throw new Error('Math ERROR');
          evalStack.push(fromRad(Math.acos(a)));
          break;
        case 'atan': evalStack.push(fromRad(Math.atan(a))); break;
        case 'sinh': evalStack.push(Math.sinh(a)); break;
        case 'cosh': evalStack.push(Math.cosh(a)); break;
        case 'tanh': evalStack.push(Math.tanh(a)); break;
        case 'log':
          if (a <= 0) throw new Error('Math ERROR');
          evalStack.push(Math.log10(a));
          break;
        case 'ln':
          if (a <= 0) throw new Error('Math ERROR');
          evalStack.push(Math.log(a));
          break;
        case 'sqrt':
          if (a < 0) throw new Error('Math ERROR');
          evalStack.push(Math.sqrt(a));
          break;
        case 'cbrt': evalStack.push(Math.cbrt(a)); break;
        case 'abs': evalStack.push(Math.abs(a)); break;
      }
    }
  }

  if (evalStack.length !== 1) throw new Error('Syntax Error');
  return Math.round(evalStack[0] * 1e10) / 1e10;
}
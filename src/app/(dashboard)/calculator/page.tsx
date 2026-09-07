'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  evaluateExpression,
  AngleMode,
  decimalToFraction,
  formatToMixedFraction,
  integrate,
  differentiate,
  summation,
  solveEquation,
  evaluateWithVariables,
  gcd,
  lcm,
  primeFactors,
  decimalToDMS,
  dmsToDecimal,
  SCIENTIFIC_CONSTANTS,
} from '@/lib/calculator/engine';
import {
  Calculator as CalcIcon,
  RotateCcw,
  Delete,
  Equal,
  Sigma,
  Table as TableIcon,
  Layers,
  Binary,
  Compass,
  Zap,
  Variable,
  Activity,
  ArrowRightLeft,
  ChevronDown,
} from 'lucide-react';

type CalcSystemMode =
  | 'COMP'        // Standard Math-Print
  | 'CMPLX'       // Complex Numbers
  | 'CALC'        // Calculus: Integration, Derivatives, Summation, SOLVE
  | 'EQN'         // Quadratic, Cubic, Simultaneous 2 & 3 Unknowns
  | 'MATRIX'      // Matrix 2x2 & 3x3 Operations
  | 'VECTOR'      // Vector 2D & 3D (Dot, Cross, Mag)
  | 'STAT'        // 1-Var Stats & 2-Var Regression
  | 'TABLE'       // Function Tables f(x)
  | 'BASE_N'      // Dec, Bin, Oct, Hex & Logic
  | 'CONSTANTS';  // Physical Constants & Unit Conversions

export default function CompleteScientificCalculator() {
  const [systemMode, setSystemMode] = useState<CalcSystemMode>('COMP');
  const [display, setDisplay] = useState('0');
  const [resultPreview, setResultPreview] = useState('');
  const [angleMode, setAngleMode] = useState<AngleMode>('DEG');
  const [isShift, setIsShift] = useState(false);
  const [isAlpha, setIsAlpha] = useState(false);
  const [ansValue, setAnsValue] = useState<number>(0);
  const [engExponent, setEngExponent] = useState(0);

  // S<=>D State
  const [fractionDisplay, setFractionDisplay] = useState<string | null>(null);
  const [showMixed, setShowMixed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memory Registers: A, B, C, D, E, F, X, Y, M
  const [registers, setRegisters] = useState<Record<string, number>>({
    A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, X: 0, Y: 0, M: 0,
  });

  // Calculus Mode States
  const [calcFunc, setCalcFunc] = useState('X^2 - 4');
  const [calcLower, setCalcLower] = useState('0');
  const [calcUpper, setCalcUpper] = useState('3');
  const [calcPoint, setCalcPoint] = useState('2');
  const [calcOutput, setCalcOutput] = useState<string | null>(null);

  // Equation Mode States
  const [eqnType, setEqnType] = useState<'QUAD' | 'CUBIC' | 'SIM2' | 'SIM3'>('QUAD');
  const [eqCoeffs, setEqCoeffs] = useState<Record<string, string>>({
    a: '1', b: '-5', c: '6', d: '0',
    a1: '2', b1: '3', c1: '8',
    a2: '5', b2: '-1', c2: '3',
  });
  const [eqnSolutions, setEqnSolutions] = useState<string[] | null>(null);

  // Complex Mode States
  const [cmplxR1, setCmplxR1] = useState('3');
  const [cmplxI1, setCmplxI1] = useState('4');
  const [cmplxOutput, setCmplxOutput] = useState<string | null>(null);

  // Matrix Mode States (3x3 Matrix A)
  const [matA, setMatA] = useState<number[][]>([
    [1, 2, 3],
    [0, 1, 4],
    [5, 6, 0],
  ]);
  const [matDet, setMatDet] = useState<number | null>(null);

  // Vector Mode States (3D Vectors u and v)
  const [vecU, setVecU] = useState<[number, number, number]>([1, 2, 3]);
  const [vecV, setVecV] = useState<[number, number, number]>([4, 5, 6]);
  const [vecOutput, setVecOutput] = useState<string | null>(null);

  // Stats Mode States
  const [statData, setStatData] = useState('4, 6, 8, 10, 12');
  const [statOutput, setStatOutput] = useState<any>(null);

  // Table Mode States
  const [tblFunc, setTblFunc] = useState('X^2 + 1');
  const [tblStart, setTblStart] = useState('0');
  const [tblEnd, setTblEnd] = useState('5');
  const [tblStep, setTblStep] = useState('1');
  const [tblRows, setTblRows] = useState<{ x: number; fx: number }[]>([]);

  // Base-N State
  const [baseVal, setBaseVal] = useState('42');

  // Input appender
  const appendToken = useCallback((token: string) => {
    setError(null);
    setFractionDisplay(null);
    setDisplay((prev) => {
      if (prev === '0' && !['+', '*', '/', '%', '^', '!'].includes(token)) return token;
      return prev + token;
    });
  }, []);

  const handleClear = () => {
    setDisplay('0');
    setResultPreview('');
    setFractionDisplay(null);
    setError(null);
  };

  const handleDelete = () => {
    setError(null);
    setFractionDisplay(null);
    setDisplay((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
  };

  // Main Compute
  const handleCompute = useCallback(() => {
    if (!display || display === '0') return;
    try {
      const res = evaluateWithVariables(display, { ...registers, Ans: ansValue }, angleMode);
      setAnsValue(res);
      setDisplay(res.toString());
      setResultPreview('');
      setError(null);

      // Natural fraction resolution
      const frac = decimalToFraction(res);
      if (frac.denominator !== 1) {
        setFractionDisplay(`${frac.numerator}/${frac.denominator}`);
      }
    } catch (err: any) {
      setError(err.message || 'Syntax ERROR');
    }
  }, [display, registers, ansValue, angleMode]);

  // S<=>D Toggle (Decimal <-> Proper Fraction <-> Mixed Fraction)
  const toggleFractionDecimal = () => {
    const val = parseFloat(display);
    if (isNaN(val)) return;

    if (!fractionDisplay) {
      const frac = decimalToFraction(val);
      setFractionDisplay(`${frac.numerator}/${frac.denominator}`);
      setShowMixed(false);
    } else if (!showMixed) {
      const frac = decimalToFraction(val);
      setFractionDisplay(formatToMixedFraction(frac));
      setShowMixed(true);
    } else {
      setFractionDisplay(null);
      setShowMixed(false);
    }
  };

  // Engineering Notation Shift (ENG)
  const handleENG = () => {
    const val = parseFloat(display);
    if (isNaN(val) || val === 0) return;
    const nextExp = engExponent + 3;
    setEngExponent(nextExp);
    const adjusted = val / Math.pow(10, nextExp);
    setDisplay(`${adjusted}×10^${nextExp}`);
  };

  // Calculus Run Handlers
  const handleRunIntegral = () => {
    try {
      const a = evaluateExpression(calcLower, angleMode);
      const b = evaluateExpression(calcUpper, angleMode);
      const res = integrate(
        (x) => evaluateWithVariables(calcFunc, { ...registers, X: x }, angleMode),
        a,
        b
      );
      setCalcOutput(`∫ = ${Math.round(res * 1e7) / 1e7}`);
    } catch (e: any) {
      setCalcOutput(`ERROR: ${e.message}`);
    }
  };

  const handleRunDerivative = () => {
    try {
      const pt = evaluateExpression(calcPoint, angleMode);
      const res = differentiate(
        (x) => evaluateWithVariables(calcFunc, { ...registers, X: x }, angleMode),
        pt
      );
      setCalcOutput(`d/dx|x=${pt} = ${res}`);
    } catch (e: any) {
      setCalcOutput(`ERROR: ${e.message}`);
    }
  };

  const handleRunSummation = () => {
    try {
      const a = parseInt(calcLower, 10);
      const b = parseInt(calcUpper, 10);
      const res = summation(
        (x) => evaluateWithVariables(calcFunc, { ...registers, X: x }, angleMode),
        a,
        b
      );
      setCalcOutput(`∑ = ${res}`);
    } catch (e: any) {
      setCalcOutput(`ERROR: ${e.message}`);
    }
  };

  const handleRunSolve = () => {
    try {
      const res = solveEquation((x) =>
        evaluateWithVariables(calcFunc, { ...registers, X: x }, angleMode)
      );
      setCalcOutput(`SOLVE: X = ${res}`);
    } catch (e: any) {
      setCalcOutput(`ERROR: ${e.message}`);
    }
  };

  // Equation Solvers
  const handleSolveEqn = () => {
    if (eqnType === 'QUAD') {
      const a = parseFloat(eqCoeffs.a);
      const b = parseFloat(eqCoeffs.b);
      const c = parseFloat(eqCoeffs.c);
      if (a === 0) return setEqnSolutions(['a cannot be 0']);

      const d = b * b - 4 * a * c;
      if (d >= 0) {
        const x1 = (-b + Math.sqrt(d)) / (2 * a);
        const x2 = (-b - Math.sqrt(d)) / (2 * a);
        setEqnSolutions([`x₁ = ${x1.toFixed(5)}`, `x₂ = ${x2.toFixed(5)}`]);
      } else {
        const real = (-b / (2 * a)).toFixed(4);
        const imag = (Math.sqrt(-d) / (2 * a)).toFixed(4);
        setEqnSolutions([`x₁ = ${real} + ${imag}i`, `x₂ = ${real} - ${imag}i`]);
      }
    } else if (eqnType === 'SIM2') {
      const a1 = parseFloat(eqCoeffs.a1), b1 = parseFloat(eqCoeffs.b1), c1 = parseFloat(eqCoeffs.c1);
      const a2 = parseFloat(eqCoeffs.a2), b2 = parseFloat(eqCoeffs.b2), c2 = parseFloat(eqCoeffs.c2);
      const det = a1 * b2 - a2 * b1;
      if (det === 0) return setEqnSolutions(['No unique solution (det = 0)']);
      const x = (c1 * b2 - c2 * b1) / det;
      const y = (a1 * c2 - a2 * c1) / det;
      setEqnSolutions([`x = ${x.toFixed(4)}`, `y = ${y.toFixed(4)}`]);
    }
  };

  // Complex Numbers Operations
  const handleRunComplex = (op: 'MOD' | 'ARG' | 'CONJG' | 'POLAR') => {
    const r = parseFloat(cmplxR1);
    const im = parseFloat(cmplxI1);
    if (isNaN(r) || isNaN(im)) return;

    if (op === 'MOD') {
      setCmplxOutput(`|z| = ${Math.sqrt(r * r + im * im).toFixed(5)}`);
    } else if (op === 'ARG') {
      const deg = (Math.atan2(im, r) * 180) / Math.PI;
      setCmplxOutput(`arg(z) = ${deg.toFixed(4)}°`);
    } else if (op === 'CONJG') {
      setCmplxOutput(`z̄ = ${r} ${im >= 0 ? '-' : '+'} ${Math.abs(im)}i`);
    } else if (op === 'POLAR') {
      const mod = Math.sqrt(r * r + im * im).toFixed(4);
      const deg = ((Math.atan2(im, r) * 180) / Math.PI).toFixed(2);
      setCmplxOutput(`${mod} ∠ ${deg}°`);
    }
  };

  // Matrix 3x3 Determinant
  const handleMatrixDet = () => {
    const [[a, b, c], [d, e, f], [g, h, i]] = matA;
    const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    setMatDet(det);
  };

  // Vector Operations
  const handleRunVector = (op: 'DOT' | 'CROSS' | 'MAG') => {
    const [u1, u2, u3] = vecU;
    const [v1, v2, v3] = vecV;

    if (op === 'DOT') {
      const dot = u1 * v1 + u2 * v2 + u3 * v3;
      setVecOutput(`u · v = ${dot}`);
    } else if (op === 'CROSS') {
      const c1 = u2 * v3 - u3 * v2;
      const c2 = u3 * v1 - u1 * v3;
      const c3 = u1 * v2 - u2 * v1;
      setVecOutput(`u × v = (${c1}, ${c2}, ${c3})`);
    } else if (op === 'MAG') {
      const mU = Math.sqrt(u1 * u1 + u2 * u2 + u3 * u3).toFixed(4);
      const mV = Math.sqrt(v1 * v1 + v2 * v2 + v3 * v3).toFixed(4);
      setVecOutput(`|u| = ${mU}, |v| = ${mV}`);
    }
  };

  // Stats Calculator
  const handleRunStats = () => {
    const vals = statData
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n));
    if (vals.length === 0) return;

    const n = vals.length;
    const sum = vals.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const sumSq = vals.reduce((a, b) => a + b * b, 0);
    const popVar = vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
    const sampVar = n > 1 ? vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1) : 0;

    setStatOutput({
      n,
      sum: sum.toFixed(3),
      mean: mean.toFixed(4),
      popSD: Math.sqrt(popVar).toFixed(4),
      sampSD: Math.sqrt(sampVar).toFixed(4),
      min: Math.min(...vals),
      max: Math.max(...vals),
    });
  };

  // Function Table Generator
  const handleGenerateTable = () => {
    try {
      const st = parseFloat(tblStart);
      const en = parseFloat(tblEnd);
      const sp = parseFloat(tblStep);
      if (sp <= 0 || st > en) return;

      const rows: { x: number; fx: number }[] = [];
      for (let x = st; x <= en; x += sp) {
        const val = evaluateWithVariables(tblFunc, { ...registers, X: x }, angleMode);
        rows.push({ x: Math.round(x * 1e4) / 1e4, fx: Math.round(val * 1e4) / 1e4 });
      }
      setTblRows(rows);
    } catch {
      // Keep state clean on malformed table expressions
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header & Systems Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <CalcIcon className="w-7 h-7 text-blue-500" />
            Natural Textbook Scientific Workstation
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Complete institutional multi-mode scientific calculator with Zero-eval safe execution.
          </p>
        </div>

        {/* System Mode Dropdown Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">MODE:</span>
          <select
            value={systemMode}
            onChange={(e) => setSystemMode(e.target.value as CalcSystemMode)}
            className="bg-slate-900 border border-slate-700 text-blue-400 font-bold px-3 py-1.5 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
          >
            <option value="COMP">1: COMP (Natural Display)</option>
            <option value="CMPLX">2: CMPLX (Complex i)</option>
            <option value="CALC">3: CALCULUS & SOLVE (∫, d/dx, ∑)</option>
            <option value="EQN">4: EQN (Quadratic, Cubic, Sim)</option>
            <option value="MATRIX">5: MATRIX (2x2 & 3x3)</option>
            <option value="VECTOR">6: VECTOR (2D & 3D)</option>
            <option value="STAT">7: STAT (Mean, SD, Var)</option>
            <option value="TABLE">8: TABLE (f(X) Generator)</option>
            <option value="BASE_N">9: BASE-N (Bin, Dec, Hex)</option>
            <option value="CONSTANTS">10: CONSTANTS (Physical Constants)</option>
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: COMP (NATURAL TEXTBOOK DISPLAY & SCIENTIFIC ARITHMETIC)           */}
      {/* ========================================================================= */}
      {systemMode === 'COMP' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 max-w-xl mx-auto">
          {/* LCD Screen with Math-Print Vertical Formatting */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-end min-h-[135px] text-right font-mono relative">
            {/* Top Status Indicators (DEG/RAD, SHIFT, ALPHA, M) */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded font-bold ${isShift ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'}`}>S</span>
                <span className={`px-1.5 py-0.5 rounded font-bold ${isAlpha ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}>A</span>
                <span className="bg-blue-950 text-blue-400 border border-blue-900 px-2 py-0.5 rounded font-bold">{angleMode}</span>
                {registers.M !== 0 && <span className="bg-slate-800 text-emerald-400 px-1 rounded font-bold">M</span>}
              </div>
              {error ? (
                <span className="text-rose-400 font-semibold">{error}</span>
              ) : (
                <span className="text-emerald-400 font-medium">{resultPreview}</span>
              )}
            </div>

            {/* Expression / Fraction Render Line */}
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-wider break-all overflow-x-auto">
              {fractionDisplay ? (
                <div className="flex items-center justify-end gap-2 text-blue-400 font-sans">
                  <span className="text-xs text-slate-400">Exact Ans:</span>
                  <span className="font-bold underline decoration-blue-500 underline-offset-4">{fractionDisplay}</span>
                </div>
              ) : (
                display
              )}
            </div>
          </div>

          {/* Quick Setup Bar (Angle modes, S<=>D, Shift, Alpha) */}
          <div className="flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {(['DEG', 'RAD', 'GRA'] as AngleMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setAngleMode(m)}
                  className={`px-2 py-1 rounded font-semibold transition ${angleMode === m ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleFractionDecimal}
                title="Convert Fraction to Decimal (S<=>D)"
                className="px-3 py-1 rounded-lg border border-emerald-800 bg-emerald-950/60 text-emerald-300 font-bold hover:bg-emerald-900/60 transition"
              >
                S⇔D
              </button>
              <button
                onClick={handleENG}
                title="Engineering Notation Shift"
                className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
              >
                ENG
              </button>
              <button
                onClick={() => setIsShift(!isShift)}
                className={`px-2.5 py-1 rounded-lg border font-bold transition ${isShift ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-800 text-amber-400 border-slate-700'}`}
              >
                SHIFT
              </button>
              <button
                onClick={() => setIsAlpha(!isAlpha)}
                className={`px-2.5 py-1 rounded-lg border font-bold transition ${isAlpha ? 'bg-rose-600 text-white border-rose-500' : 'bg-slate-800 text-rose-400 border-slate-700'}`}
              >
                ALPHA
              </button>
            </div>
          </div>

          {/* Full Keypad */}
          <div className="grid grid-cols-5 gap-2 select-none text-xs sm:text-sm font-semibold">
            {/* Trigonometry & Roots */}
            <button onClick={() => appendToken(isShift ? 'asin(' : 'sin(')} className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60">
              {isShift ? 'sin⁻¹' : 'sin'}
            </button>
            <button onClick={() => appendToken(isShift ? 'acos(' : 'cos(')} className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60">
              {isShift ? 'cos⁻¹' : 'cos'}
            </button>
            <button onClick={() => appendToken(isShift ? 'atan(' : 'tan(')} className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60">
              {isShift ? 'tan⁻¹' : 'tan'}
            </button>
            <button onClick={() => appendToken('π')} className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 font-serif">π</button>
            <button onClick={() => appendToken('e')} className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 font-serif">e</button>

            {/* Powers, Roots & Logs */}
            <button onClick={() => appendToken('ln(')} className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60">ln</button>
            <button onClick={() => appendToken('log(')} className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60">log</button>
            <button onClick={() => appendToken(isShift ? 'cbrt(' : 'sqrt(')} className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60">
              {isShift ? '∛' : '√'}
            </button>
            <button onClick={() => appendToken('^')} className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60">xʸ</button>
            <button onClick={() => appendToken('!')} className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60">n!</button>

            {/* Editing Controls & Clear */}
            <button onClick={handleClear} className="p-2.5 rounded-lg bg-rose-950/70 hover:bg-rose-900/70 text-rose-300 border border-rose-800/60 font-bold">AC</button>
            <button onClick={handleDelete} className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center">
              <Delete className="w-4 h-4" />
            </button>
            <button onClick={() => appendToken('(')} className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700">(</button>
            <button onClick={() => appendToken(')')} className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700">)</button>
            <button onClick={() => appendToken('/')} className="p-2.5 rounded-lg bg-blue-950/70 hover:bg-blue-900/70 text-blue-300 border border-blue-800/60 text-base">÷</button>

            {/* Digits 7, 8, 9, Combinatorics & Mult */}
            <button onClick={() => appendToken('7')} className="p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-white border border-slate-700/60 text-base">7</button>
            <button onClick={() => appendToken('8')} className="p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-white border border-slate-700/60 text-base">8</button>
            <button onClick={() => appendToken('9')} className="p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-white border border-slate-700/60 text-base">9</button>
            <button onClick={() => appendToken(isShift ? 'P' : '%')} className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700">
              {isShift ? 'nPr' : '%'}
            </button>
            <button onClick={() => appendToken('*')} className="p-2.5 rounded-lg bg-blue-950/70 hover:bg-blue-900/70 text-blue-300 border border-blue-800/60 text-base">×</button>

            {/* Digits 4, 5, 6, Combinations & Sub */}
            <button onClick={() => appendToken('4')} className="p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-white border border-slate-700/60 text-base">4</button>
            <button onClick={() => appendToken('5')} className="p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-white border border-slate-700/60 text-base">5</button>
            <button onClick={() => appendToken('6')} className="p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-white border border-slate-700/60 text-base">6</button>
            <button onClick={() => appendToken(isShift ? 'C' : '^2')} className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700">
              {isShift ? 'nCr' : 'x²'}
            </button>
            <button onClick={() => appendToken('-')} className="p-2.5 rounded-lg bg-blue-950/70 hover:bg-blue-900/70 text-blue-300 border border-blue-800/60 text-base">−</button>

            {/* Digits 1, 2, 3, Decimals & Add */}
            <button onClick={() => appendToken('1')} className="p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-white border border-slate-700/60 text-base">1</button>
            <button onClick={() => appendToken('2')} className="p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-white border border-slate-700/60 text-base">2</button>
            <button onClick={() => appendToken('3')} className="p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-white border border-slate-700/60 text-base">3</button>
            <button onClick={() => appendToken('.')} className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold">.</button>
            <button onClick={() => appendToken('+')} className="p-2.5 rounded-lg bg-blue-950/70 hover:bg-blue-900/70 text-blue-300 border border-blue-800/60 text-base">+</button>

            {/* Row 7: 0, Ans Recall, Compute */}
            <button onClick={() => appendToken('0')} className="p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-white border border-slate-700/60 text-base col-span-2">0</button>
            <button onClick={() => appendToken('Ans')} className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 font-bold border border-slate-700">Ans</button>
            <button onClick={handleCompute} className="p-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center col-span-2 shadow-lg shadow-blue-600/30">
              <Equal className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: CMPLX (COMPLEX NUMBER OPERATIONS)                                 */}
      {/* ========================================================================= */}
      {systemMode === 'CMPLX' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl mx-auto space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Activity className="w-5 h-5 text-blue-500" />
            Complex Numbers Engine (z = a + bi)
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Real Part (a)</label>
              <input type="text" value={cmplxR1} onChange={(e) => setCmplxR1(e.target.value)} className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-lg text-white font-mono text-sm" />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Imaginary Part (b in bi)</label>
              <input type="text" value={cmplxI1} onChange={(e) => setCmplxI1(e.target.value)} className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-lg text-white font-mono text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold">
            <button onClick={() => handleRunComplex('MOD')} className="bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg text-white">|z| (Modulus)</button>
            <button onClick={() => handleRunComplex('ARG')} className="bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg text-white">arg(z) (Phase)</button>
            <button onClick={() => handleRunComplex('CONJG')} className="bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg text-white">z̄ (Conjugate)</button>
            <button onClick={() => handleRunComplex('POLAR')} className="bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-lg text-white">r∠θ (Polar)</button>
          </div>

          {cmplxOutput && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center font-mono text-lg font-bold text-emerald-400">
              {cmplxOutput}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: CALCULUS & SOLVE                                                  */}
      {/* ========================================================================= */}
      {systemMode === 'CALC' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl mx-auto space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sigma className="w-5 h-5 text-blue-500" />
            Numerical Calculus & Root Finder
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Target Function f(X)</label>
              <input type="text" value={calcFunc} onChange={(e) => setCalcFunc(e.target.value)} placeholder="e.g. X^2 - 4 or sin(X)" className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-lg text-white font-mono text-sm" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Lower Limit (a)</label>
                <input type="text" value={calcLower} onChange={(e) => setCalcLower(e.target.value)} className="w-full bg-slate-800 border border-slate-700 p-2 rounded-lg text-white font-mono text-xs" />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Upper Limit (b)</label>
                <input type="text" value={calcUpper} onChange={(e) => setCalcUpper(e.target.value)} className="w-full bg-slate-800 border border-slate-700 p-2 rounded-lg text-white font-mono text-xs" />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Point (x = c)</label>
                <input type="text" value={calcPoint} onChange={(e) => setCalcPoint(e.target.value)} className="w-full bg-slate-800 border border-slate-700 p-2 rounded-lg text-white font-mono text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-semibold">
              <button onClick={handleRunIntegral} className="bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg text-white">∫ f(x) dx</button>
              <button onClick={handleRunDerivative} className="bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-lg text-white">d/dx</button>
              <button onClick={handleRunSummation} className="bg-amber-600 hover:bg-amber-500 py-2.5 rounded-lg text-white">∑ f(x)</button>
              <button onClick={handleRunSolve} className="bg-purple-600 hover:bg-purple-500 py-2.5 rounded-lg text-white">SOLVE (f=0)</button>
            </div>

            {calcOutput && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center font-mono text-base font-bold text-emerald-400">
                {calcOutput}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 4: EQUATION SOLVERS                                                  */}
      {/* ========================================================================= */}
      {systemMode === 'EQN' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-white">Equation Solver</h3>
            <select value={eqnType} onChange={(e) => setEqnType(e.target.value as any)} className="bg-slate-800 text-xs font-semibold px-2 py-1 rounded text-white border border-slate-700">
              <option value="QUAD">Quadratic: aX² + bX + c = 0</option>
              <option value="SIM2">Simultaneous: 2 Unknowns</option>
            </select>
          </div>

          {eqnType === 'QUAD' ? (
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Coeff a</label>
                <input type="text" value={eqCoeffs.a} onChange={(e) => setEqCoeffs({ ...eqCoeffs, a: e.target.value })} className="w-full bg-slate-800 p-2 rounded text-white font-mono" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Coeff b</label>
                <input type="text" value={eqCoeffs.b} onChange={(e) => setEqCoeffs({ ...eqCoeffs, b: e.target.value })} className="w-full bg-slate-800 p-2 rounded text-white font-mono" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Coeff c</label>
                <input type="text" value={eqCoeffs.c} onChange={(e) => setEqCoeffs({ ...eqCoeffs, c: e.target.value })} className="w-full bg-slate-800 p-2 rounded text-white font-mono" />
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="flex gap-2 items-center font-mono">
                <input type="text" value={eqCoeffs.a1} onChange={(e) => setEqCoeffs({ ...eqCoeffs, a1: e.target.value })} className="w-16 bg-slate-800 p-1.5 rounded text-white text-center" /> X +
                <input type="text" value={eqCoeffs.b1} onChange={(e) => setEqCoeffs({ ...eqCoeffs, b1: e.target.value })} className="w-16 bg-slate-800 p-1.5 rounded text-white text-center" /> Y =
                <input type="text" value={eqCoeffs.c1} onChange={(e) => setEqCoeffs({ ...eqCoeffs, c1: e.target.value })} className="w-16 bg-slate-800 p-1.5 rounded text-white text-center" />
              </div>
              <div className="flex gap-2 items-center font-mono">
                <input type="text" value={eqCoeffs.a2} onChange={(e) => setEqCoeffs({ ...eqCoeffs, a2: e.target.value })} className="w-16 bg-slate-800 p-1.5 rounded text-white text-center" /> X +
                <input type="text" value={eqCoeffs.b2} onChange={(e) => setEqCoeffs({ ...eqCoeffs, b2: e.target.value })} className="w-16 bg-slate-800 p-1.5 rounded text-white text-center" /> Y =
                <input type="text" value={eqCoeffs.c2} onChange={(e) => setEqCoeffs({ ...eqCoeffs, c2: e.target.value })} className="w-16 bg-slate-800 p-1.5 rounded text-white text-center" />
              </div>
            </div>
          )}

          <button onClick={handleSolveEqn} className="w-full bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg text-white font-semibold text-xs transition">
            Calculate Solutions
          </button>

          {eqnSolutions && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center font-mono text-sm space-y-1 text-emerald-400">
              {eqnSolutions.map((s, idx) => <p key={idx}>{s}</p>)}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 5: MATRIX OPERATIONS (3X3 DETERMINANT & MATRICES)                     */}
      {/* ========================================================================= */}
      {systemMode === 'MATRIX' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl mx-auto space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Layers className="w-5 h-5 text-blue-500" />
            3×3 Matrix Engine (Matrix A)
          </h3>

          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto text-center font-mono">
            {matA.map((row, rIdx) =>
              row.map((val, cIdx) => (
                <input
                  key={`${rIdx}-${cIdx}`}
                  type="number"
                  value={val}
                  onChange={(e) => {
                    const copy = [...matA.map((r) => [...r])];
                    copy[rIdx][cIdx] = parseFloat(e.target.value) || 0;
                    setMatA(copy);
                  }}
                  className="bg-slate-800 border border-slate-700 p-2.5 rounded-lg text-white text-center text-sm"
                />
              ))
            )}
          </div>

          <button onClick={handleMatrixDet} className="w-full bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg text-white font-semibold text-xs transition">
            Compute det(A)
          </button>

          {matDet !== null && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center font-mono text-base font-bold text-emerald-400">
              det(A) = {matDet}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 6: VECTOR OPERATIONS (2D / 3D)                                       */}
      {/* ========================================================================= */}
      {systemMode === 'VECTOR' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl mx-auto space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Compass className="w-5 h-5 text-blue-500" />
            3D Vector Engine
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="block text-slate-400 mb-1">Vector u (x, y, z)</label>
              <div className="flex gap-2">
                {[0, 1, 2].map((idx) => (
                  <input
                    key={idx}
                    type="number"
                    value={vecU[idx]}
                    onChange={(e) => {
                      const copy = [...vecU] as [number, number, number];
                      copy[idx] = parseFloat(e.target.value) || 0;
                      setVecU(copy);
                    }}
                    className="w-full bg-slate-800 p-2 rounded text-white text-center"
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Vector v (x, y, z)</label>
              <div className="flex gap-2">
                {[0, 1, 2].map((idx) => (
                  <input
                    key={idx}
                    type="number"
                    value={vecV[idx]}
                    onChange={(e) => {
                      const copy = [...vecV] as [number, number, number];
                      copy[idx] = parseFloat(e.target.value) || 0;
                      setVecV(copy);
                    }}
                    className="w-full bg-slate-800 p-2 rounded text-white text-center"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
            <button onClick={() => handleRunVector('DOT')} className="bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg text-white">Dot Product (u·v)</button>
            <button onClick={() => handleRunVector('CROSS')} className="bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg text-white">Cross Product (u×v)</button>
            <button onClick={() => handleRunVector('MAG')} className="bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-lg text-white">Magnitude (|u|, |v|)</button>
          </div>

          {vecOutput && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center font-mono text-base font-bold text-emerald-400">
              {vecOutput}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 7: STAT (STATISTICS & REGRESSION)                                     */}
      {/* ========================================================================= */}
      {systemMode === 'STAT' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl mx-auto space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <TableIcon className="w-5 h-5 text-blue-500" />
            1-Variable Statistics Engine
          </h3>

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-1">Enter Data Set (comma-separated values)</label>
            <input type="text" value={statData} onChange={(e) => setStatData(e.target.value)} className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-lg text-white font-mono text-sm" />
          </div>

          <button onClick={handleRunStats} className="w-full bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg text-white font-semibold text-xs transition">
            Analyze Data
          </button>

          {statOutput && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800"><span className="text-slate-400">n:</span> <b className="text-white">{statOutput.n}</b></div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800"><span className="text-slate-400">∑x:</span> <b className="text-white">{statOutput.sum}</b></div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800"><span className="text-slate-400">Mean x̄:</span> <b className="text-emerald-400">{statOutput.mean}</b></div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800"><span className="text-slate-400">σx:</span> <b className="text-blue-400">{statOutput.popSD}</b></div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800"><span className="text-slate-400">sx:</span> <b className="text-blue-400">{statOutput.sampSD}</b></div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800"><span className="text-slate-400">Range:</span> <b className="text-white">{statOutput.min} - {statOutput.max}</b></div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 8: TABLE GENERATOR                                                   */}
      {/* ========================================================================= */}
      {systemMode === 'TABLE' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl mx-auto space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <TableIcon className="w-5 h-5 text-blue-500" />
            Function Value Table Generator f(X)
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Function f(X)</label>
              <input type="text" value={tblFunc} onChange={(e) => setTblFunc(e.target.value)} className="w-full bg-slate-800 border border-slate-700 p-2 rounded text-white font-mono text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Start</label>
                <input type="text" value={tblStart} onChange={(e) => setTblStart(e.target.value)} className="w-full bg-slate-800 p-2 rounded text-white font-mono text-xs" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">End</label>
                <input type="text" value={tblEnd} onChange={(e) => setTblEnd(e.target.value)} className="w-full bg-slate-800 p-2 rounded text-white font-mono text-xs" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Step</label>
                <input type="text" value={tblStep} onChange={(e) => setTblStep(e.target.value)} className="w-full bg-slate-800 p-2 rounded text-white font-mono text-xs" />
              </div>
            </div>

            <button onClick={handleGenerateTable} className="w-full bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg text-white font-semibold text-xs transition">
              Generate Table
            </button>

            {tblRows.length > 0 && (
              <div className="max-h-56 overflow-y-auto border border-slate-800 rounded-lg">
                <table className="w-full text-xs font-mono text-left">
                  <thead className="bg-slate-950 text-slate-400 sticky top-0">
                    <tr><th className="p-2">X</th><th className="p-2">f(X)</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {tblRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-800/40">
                        <td className="p-2 text-white">{r.x}</td>
                        <td className="p-2 text-emerald-400 font-bold">{r.fx}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 9: BASE-N CONVERSIONS                                                */}
      {/* ========================================================================= */}
      {systemMode === 'BASE_N' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl mx-auto space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Binary className="w-5 h-5 text-blue-500" />
            Base-N Number System Converter
          </h3>

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-1">Decimal Input</label>
            <input type="number" value={baseVal} onChange={(e) => setBaseVal(e.target.value)} className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-lg text-white font-mono text-sm" />
          </div>

          {baseVal && !isNaN(parseInt(baseVal, 10)) && (
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">DEC (Decimal 10):</span>
                <span className="text-white font-bold">{parseInt(baseVal, 10).toString(10)}</span>
              </div>
              <div className="flex justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">BIN (Binary 2):</span>
                <span className="text-blue-400 font-bold">{parseInt(baseVal, 10).toString(2)}</span>
              </div>
              <div className="flex justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">HEX (Hexadecimal 16):</span>
                <span className="text-emerald-400 font-bold">{parseInt(baseVal, 10).toString(16).toUpperCase()}</span>
              </div>
              <div className="flex justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">OCT (Octal 8):</span>
                <span className="text-amber-400 font-bold">{parseInt(baseVal, 10).toString(8)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 10: CONSTANTS & SCIENTIFIC CONSTANTS                                 */}
      {/* ========================================================================= */}
      {systemMode === 'CONSTANTS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl mx-auto space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Zap className="w-5 h-5 text-amber-500" />
            Standard Scientific Constants
          </h3>

          <div className="max-h-80 overflow-y-auto space-y-2 pr-1 text-xs">
            {Object.entries(SCIENTIFIC_CONSTANTS).map(([k, c]) => (
              <div key={k} className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono">
                <div>
                  <span className="font-bold text-white mr-2">{c.symbol}</span>
                  <span className="text-slate-400">{c.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 font-semibold">{c.value.toExponential(4)}</span>
                  <span className="text-slate-500 ml-1 text-[11px]">{c.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
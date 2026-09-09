'use client';

import React, { useState, useCallback, useEffect } from 'react';
import katex from 'katex';
import {
  evaluateExpressionSafe,
  AngleMode,
  floatToFraction,
  MatrixEngine,
  VectorEngine,
  numericalDerivative,
  numericalIntegral,
} from '@/lib/calculator/full-engine';
import {
  X,
  Delete,
  Equal,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  Compass,
  Sigma,
  SlidersHorizontal,
  Calculator as CalcIcon,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type ModeType = 'COMP' | 'MATRIX' | 'VECTOR' | 'EQN' | 'CALC';

export default function PhysicalCalculatorModal({ isOpen, onClose }: Props) {
  // Navigation & Core States
  const [activeMode, setActiveMode] = useState<ModeType>('COMP');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('0');
  const [exactFraction, setExactFraction] = useState<string | null>(null);
  const [angleMode, setAngleMode] = useState<AngleMode>('DEG');
  const [isShift, setIsShift] = useState(false);
  const [isAlpha, setIsAlpha] = useState(false);
  const [isHyp, setIsHyp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number | null>(null);

  // 1. Matrix State (3×3 Matrix A)
  const [matA, setMatA] = useState<number[][]>([
    [1, 2, 3],
    [0, 1, 4],
    [5, 6, 0],
  ]);
  const [matResText, setMatResText] = useState<string | null>(null);

  // 2. Vector State (Vectors U & V)
  const [vecU, setVecU] = useState<[number, number, number]>([1, 2, 3]);
  const [vecV, setVecV] = useState<[number, number, number]>([4, 5, 6]);
  const [vecResText, setVecResText] = useState<string | null>(null);

  // 3. Equation Solver State (ax² + bx + c = 0)
  const [eqCoeff, setEqCoeff] = useState({ a: '1', b: '-5', c: '6' });
  const [eqRoots, setEqRoots] = useState<string[] | null>(null);

  // 4. Calculus State (Integration & Differentiation parameters)
  const [calcFunc, setCalcFunc] = useState('x^2');
  const [calcA, setCalcA] = useState('0');
  const [calcB, setCalcB] = useState('2');
  const [calcPoint, setCalcPoint] = useState('2');
  const [calcResText, setCalcResText] = useState<string | null>(null);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showModeMenu) {
          setShowModeMenu(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showModeMenu, onClose]);

  // Keypad Helper Functions
  const handlePress = useCallback((token: string) => {
    setError(null);
    setExpr((prev) => prev + token);
    setIsShift(false);
    setIsAlpha(false);
    setIsHyp(false);
  }, []);

  const handleCompute = useCallback(() => {
    if (!expr.trim()) return;
    try {
      setError(null);
      const res = evaluateExpressionSafe(expr, {}, angleMode);
      setResult(String(res));
      setHistory((prev) => [expr, ...prev.slice(0, 49)]);

      try {
        const frac = floatToFraction(res);
        if (frac.d !== 1n && frac.d <= 100000n) {
          setExactFraction(frac.toString());
        } else {
          setExactFraction(null);
        }
      } catch {
        setExactFraction(null);
      }
    } catch (e: any) {
      setError(e.message || 'Syntax ERROR');
    }
  }, [expr, angleMode]);

  const handleBackspace = useCallback(() => {
    setError(null);
    setExpr((prev) => {
      const multi = [
        'asin(', 'acos(', 'atan(', 'sinh(', 'cosh(', 'tanh(',
        'sin(', 'cos(', 'tan(', 'cbrt(', 'sqrt(', 'ln(', 'log('
      ];
      for (const m of multi) {
        if (prev.endsWith(m)) return prev.slice(0, -m.length);
      }
      return prev.slice(0, -1);
    });
  }, []);

  const handleClear = useCallback(() => {
    setExpr('');
    setResult('0');
    setExactFraction(null);
    setError(null);
  }, []);

  const renderFormulaKaTeX = (raw: string) => {
    if (!raw) return '<span class="opacity-30">0</span>';
    const formatted = raw
      .replace(/\*/g, ' \\times ')
      .replace(/\//g, ' \\div ')
      .replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')
      .replace(/cbrt\(([^)]+)\)/g, '\\sqrt[3]{$1}')
      .replace(/\^2/g, '^{2}')
      .replace(/\^3/g, '^{3}')
      .replace(/\^/g, '^');

    try {
      return katex.renderToString(formatted, { throwOnError: false });
    } catch {
      return raw;
    }
  };

  // Matrix Solvers
  const computeMatrixDet = () => {
    try {
      const d = MatrixEngine.det(matA);
      setMatResText(`det(MatA) = ${d}`);
    } catch (e: any) {
      setMatResText(e.message);
    }
  };

  const computeMatrixInv = () => {
    try {
      const inv = MatrixEngine.inverse(matA);
      const rows = inv.map((r) => `[ ${r.join(', ')} ]`).join('\n');
      setMatResText(`MatA⁻¹:\n${rows}`);
    } catch (e: any) {
      setMatResText(e.message);
    }
  };

  // Vector Solvers
  const computeVectorDot = () => {
    const dot = VectorEngine.dot(vecU, vecV);
    setVecResText(`u · v = ${dot}`);
  };

  const computeVectorCross = () => {
    const [i, j, k] = VectorEngine.cross(vecU, vecV);
    setVecResText(`u × v = (${i}, ${j}, ${k})`);
  };

  // Equation Solver (Quadratic)
  const computeEquationRoots = () => {
    const a = parseFloat(eqCoeff.a);
    const b = parseFloat(eqCoeff.b);
    const c = parseFloat(eqCoeff.c);
    if (a === 0) {
      setEqRoots(['Coefficient "a" cannot be 0']);
      return;
    }
    const d = b * b - 4 * a * c;
    if (d >= 0) {
      const x1 = (-b + Math.sqrt(d)) / (2 * a);
      const x2 = (-b - Math.sqrt(d)) / (2 * a);
      setEqRoots([`x₁ = ${x1.toFixed(5)}`, `x₂ = ${x2.toFixed(5)}`]);
    } else {
      const r = (-b / (2 * a)).toFixed(4);
      const im = (Math.sqrt(-d) / (2 * a)).toFixed(4);
      setEqRoots([`x₁ = ${r} + ${im}i`, `x₂ = ${r} - ${im}i`]);
    }
  };

  // Calculus Runners
  const runCalculusIntegral = () => {
    try {
      const a = parseFloat(calcA);
      const b = parseFloat(calcB);
      const val = numericalIntegral((x) => evaluateExpressionSafe(calcFunc, { x }, angleMode), a, b);
      setCalcResText(`∫ = ${Math.round(val * 1e6) / 1e6}`);
    } catch (e: any) {
      setCalcResText(e.message);
    }
  };

  const runCalculusDerivative = () => {
    try {
      const pt = parseFloat(calcPoint);
      const val = numericalDerivative((x) => evaluateExpressionSafe(calcFunc, { x }, angleMode), pt);
      setCalcResText(`d/dx|x=${pt} = ${Math.round(val * 1e6) / 1e6}`);
    } catch (e: any) {
      setCalcResText(e.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Physical Scientific Calculator Modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      {/* Physical Chassis */}
      <div className="w-full max-w-sm bg-canvas-subtle border border-canvas-border rounded-[36px] shadow-elevated p-4 sm:p-5 flex flex-col gap-3 relative select-none animate-in zoom-in-95 duration-150">
        
        {/* Top Header Strip */}
        <div className="flex items-center justify-between border-b border-canvas-border pb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-2xs font-mono tracking-widest text-content-muted font-bold uppercase">
              NATURAL-V.P.A.M.
            </span>
            <span className="text-2xs font-mono font-bold px-1.5 py-0.2 rounded bg-brand-500/10 text-brand-400 border border-brand-500/25">
              {activeMode}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-content-muted hover:text-content-primary hover:bg-canvas-surface transition-colors outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
            aria-label="Close calculator modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODE SELECTION OVERLAY */}
        {showModeMenu && (
          <div
            role="menu"
            aria-label="Select System Engine Mode"
            className="absolute inset-x-4 top-14 z-30 bg-canvas-surface border border-brand-500/50 rounded-2xl p-3.5 shadow-elevated space-y-2 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-canvas-border pb-2">
              <span className="text-xs font-bold text-content-primary tracking-wide">SYSTEM ENGINE MODES</span>
              <button
                type="button"
                onClick={() => setShowModeMenu(false)}
                className="p-1 text-content-muted hover:text-content-primary"
                aria-label="Close mode menu"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1 text-xs font-semibold">
              {[
                { id: 'COMP', label: '1: COMP (Standard Natural V.P.A.M.)', icon: CalcIcon },
                { id: 'MATRIX', label: '2: MATRIX (3×3 Inversion/Det)', icon: Layers },
                { id: 'VECTOR', label: '3: VECTOR (Dot/Cross/Norm)', icon: Compass },
                { id: 'EQN', label: '4: EQN (Quadratic Solvers)', icon: Equal },
                { id: 'CALC', label: '5: CALCULUS (∫dx, d/dx)', icon: Sigma },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = activeMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setActiveMode(m.id as ModeType);
                      setShowModeMenu(false);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg text-left transition-colors border outline-none focus-visible:ring-1 focus-visible:ring-brand-500 ${
                      isSelected
                        ? 'bg-brand-500 text-white border-brand-400 shadow-sm'
                        : 'bg-canvas-subtle text-content-secondary border-canvas-border hover:bg-canvas-elevated hover:text-content-primary'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-SYSTEM 1: COMP (STANDARD NATURAL DISPLAY)                            */}
        {/* ========================================================================= */}
        {activeMode === 'COMP' && (
          <>
            {/* Multi-line Dot Matrix LCD Display */}
            <div
              aria-live="polite"
              className="bg-[#8E9F88] text-slate-950 rounded-lcd p-3 border-2 border-[#768571] shadow-inner font-mono flex flex-col justify-between min-h-[105px] relative"
            >
              <div className="flex items-center justify-between text-2xs font-bold border-b border-slate-950/10 pb-0.5">
                <div className="flex items-center gap-1.5 tracking-tighter">
                  <span className={isShift ? 'bg-slate-950 text-[#8E9F88] px-1 rounded-xs' : 'opacity-25'}>S</span>
                  <span className={isAlpha ? 'bg-slate-950 text-[#8E9F88] px-1 rounded-xs' : 'opacity-25'}>A</span>
                  <span className={isHyp ? 'bg-slate-950 text-[#8E9F88] px-1 rounded-xs' : 'opacity-25'}>HYP</span>
                  <span className="underline">{angleMode}</span>
                </div>
                {error ? (
                  <span className="font-bold text-status-danger animate-pulse">{error}</span>
                ) : (
                  <span className="opacity-40">MATH-PRINT</span>
                )}
              </div>

              <div
                className="text-sm font-semibold tracking-wide overflow-x-auto whitespace-nowrap text-left py-1 text-slate-900 min-h-[24px]"
                dangerouslySetInnerHTML={{ __html: renderFormulaKaTeX(expr) }}
              />

              <div className="flex items-baseline justify-between pt-0.5 border-t border-slate-950/10">
                <span className="text-2xs font-bold text-slate-800">
                  {exactFraction ? `[ ${exactFraction} ]` : ''}
                </span>
                <span className="text-lg font-extrabold tracking-tight truncate pl-2">{result}</span>
              </div>
            </div>

            {/* Shift & D-Pad Control Row */}
            <div className="grid grid-cols-5 items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setIsShift(!isShift)}
                className={`py-1.5 rounded-md text-2xs font-bold border transition-colors outline-none focus-visible:ring-1 focus-visible:ring-brand-500 ${
                  isShift
                    ? 'bg-status-warning text-slate-950 border-status-warning'
                    : 'bg-canvas-surface text-status-warning border-canvas-border hover:bg-canvas-elevated'
                }`}
              >
                SHIFT
              </button>
              <button
                type="button"
                onClick={() => setIsAlpha(!isAlpha)}
                className={`py-1.5 rounded-md text-2xs font-bold border transition-colors outline-none focus-visible:ring-1 focus-visible:ring-brand-500 ${
                  isAlpha
                    ? 'bg-status-danger text-white border-status-danger'
                    : 'bg-canvas-surface text-status-danger border-canvas-border hover:bg-canvas-elevated'
                }`}
              >
                ALPHA
              </button>

              {/* D-Pad */}
              <div className="col-span-2 flex items-center justify-center">
                <div className="w-20 h-10 rounded-full bg-canvas-surface border border-canvas-border flex items-center justify-around px-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => {}}
                    className="p-1 text-content-muted hover:text-content-primary transition-colors"
                    aria-label="Cursor left"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (history.length > 0) {
                          const next = histIdx === null ? 0 : Math.min(history.length - 1, histIdx + 1);
                          setHistIdx(next);
                          setExpr(history[next]);
                        }
                      }}
                      className="p-0.5 text-content-muted hover:text-content-primary transition-colors"
                      aria-label="History previous"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (histIdx !== null) {
                          const next = histIdx - 1;
                          if (next < 0) {
                            setHistIdx(null);
                            setExpr('');
                          } else {
                            setHistIdx(next);
                            setExpr(history[next]);
                          }
                        }
                      }}
                      className="p-0.5 text-content-muted hover:text-content-primary transition-colors"
                      aria-label="History next"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {}}
                    className="p-1 text-content-muted hover:text-content-primary transition-colors"
                    aria-label="Cursor right"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModeMenu(true)}
                className="py-1.5 rounded-md text-2xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center justify-center gap-1 transition-colors outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>MODE</span>
              </button>
            </div>

            {/* Function Keys Matrix */}
            <div className="grid grid-cols-5 gap-1.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => handlePress(isShift ? 'asin(' : isHyp ? 'sinh(' : 'sin(')}
                className="h-8 rounded-md bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border text-2xs transition-colors"
              >
                {isShift ? 'sin⁻¹' : isHyp ? 'sinh' : 'sin'}
              </button>
              <button
                type="button"
                onClick={() => handlePress(isShift ? 'acos(' : isHyp ? 'cosh(' : 'cos(')}
                className="h-8 rounded-md bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border text-2xs transition-colors"
              >
                {isShift ? 'cos⁻¹' : isHyp ? 'cosh' : 'cos'}
              </button>
              <button
                type="button"
                onClick={() => handlePress(isShift ? 'atan(' : isHyp ? 'tanh(' : 'tan(')}
                className="h-8 rounded-md bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border text-2xs transition-colors"
              >
                {isShift ? 'tan⁻¹' : isHyp ? 'tanh' : 'tan'}
              </button>
              <button
                type="button"
                onClick={() => handlePress('ln(')}
                className="h-8 rounded-md bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border text-2xs transition-colors"
              >
                ln
              </button>
              <button
                type="button"
                onClick={() => handlePress('log(')}
                className="h-8 rounded-md bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border text-2xs transition-colors"
              >
                log
              </button>

              <button
                type="button"
                onClick={() => handlePress(isShift ? 'cbrt(' : 'sqrt(')}
                className="h-8 rounded-md bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border text-xs transition-colors"
              >
                {isShift ? '∛' : '√'}
              </button>
              <button
                type="button"
                onClick={() => handlePress('^')}
                className="h-8 rounded-md bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border text-xs transition-colors"
              >
                xʸ
              </button>
              <button
                type="button"
                onClick={() => handlePress('(')}
                className="h-8 rounded-md bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border text-xs transition-colors"
              >
                (
              </button>
              <button
                type="button"
                onClick={() => handlePress(')')}
                className="h-8 rounded-md bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border text-xs transition-colors"
              >
                )
              </button>
              <button
                type="button"
                onClick={() => handlePress('π')}
                className="h-8 rounded-md bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border font-serif text-xs transition-colors"
              >
                π
              </button>
            </div>

            {/* Keypad Matrix */}
            <div className="grid grid-cols-5 gap-1.5 font-bold text-sm select-none">
              <button type="button" onClick={() => handlePress('7')} className="h-10 rounded-lg bg-[#1C2536] hover:bg-[#253248] text-content-primary border border-canvas-border shadow-sm active:scale-95 transition-all">7</button>
              <button type="button" onClick={() => handlePress('8')} className="h-10 rounded-lg bg-[#1C2536] hover:bg-[#253248] text-content-primary border border-canvas-border shadow-sm active:scale-95 transition-all">8</button>
              <button type="button" onClick={() => handlePress('9')} className="h-10 rounded-lg bg-[#1C2536] hover:bg-[#253248] text-content-primary border border-canvas-border shadow-sm active:scale-95 transition-all">9</button>
              <button type="button" onClick={handleBackspace} className="h-10 rounded-lg bg-status-danger-bg hover:bg-status-danger/25 text-status-danger border border-status-danger/30 flex items-center justify-center active:scale-95 transition-all" aria-label="Backspace">
                <Delete className="w-4 h-4" />
              </button>
              <button type="button" onClick={handleClear} className="h-10 rounded-lg bg-status-danger text-white hover:bg-status-danger/90 font-bold active:scale-95 transition-all text-xs">
                AC
              </button>

              <button type="button" onClick={() => handlePress('4')} className="h-10 rounded-lg bg-[#1C2536] hover:bg-[#253248] text-content-primary border border-canvas-border shadow-sm active:scale-95 transition-all">4</button>
              <button type="button" onClick={() => handlePress('5')} className="h-10 rounded-lg bg-[#1C2536] hover:bg-[#253248] text-content-primary border border-canvas-border shadow-sm active:scale-95 transition-all">5</button>
              <button type="button" onClick={() => handlePress('6')} className="h-10 rounded-lg bg-[#1C2536] hover:bg-[#253248] text-content-primary border border-canvas-border shadow-sm active:scale-95 transition-all">6</button>
              <button type="button" onClick={() => handlePress('*')} className="h-10 rounded-lg bg-canvas-surface hover:bg-canvas-elevated text-brand-400 border border-canvas-border active:scale-95 transition-all text-base">×</button>
              <button type="button" onClick={() => handlePress('/')} className="h-10 rounded-lg bg-canvas-surface hover:bg-canvas-elevated text-brand-400 border border-canvas-border active:scale-95 transition-all text-base">÷</button>

              <button type="button" onClick={() => handlePress('1')} className="h-10 rounded-lg bg-[#1C2536] hover:bg-[#253248] text-content-primary border border-canvas-border shadow-sm active:scale-95 transition-all">1</button>
              <button type="button" onClick={() => handlePress('2')} className="h-10 rounded-lg bg-[#1C2536] hover:bg-[#253248] text-content-primary border border-canvas-border shadow-sm active:scale-95 transition-all">2</button>
              <button type="button" onClick={() => handlePress('3')} className="h-10 rounded-lg bg-[#1C2536] hover:bg-[#253248] text-content-primary border border-canvas-border shadow-sm active:scale-95 transition-all">3</button>
              <button type="button" onClick={() => handlePress('+')} className="h-10 rounded-lg bg-canvas-surface hover:bg-canvas-elevated text-brand-400 border border-canvas-border active:scale-95 transition-all text-base">+</button>
              <button type="button" onClick={() => handlePress('-')} className="h-10 rounded-lg bg-canvas-surface hover:bg-canvas-elevated text-brand-400 border border-canvas-border active:scale-95 transition-all text-base">−</button>

              <button type="button" onClick={() => handlePress('0')} className="h-10 rounded-lg bg-[#1C2536] hover:bg-[#253248] text-content-primary border border-canvas-border shadow-sm active:scale-95 transition-all">0</button>
              <button type="button" onClick={() => handlePress('.')} className="h-10 rounded-lg bg-[#1C2536] hover:bg-[#253248] text-content-primary border border-canvas-border shadow-sm active:scale-95 transition-all">.</button>
              <button type="button" onClick={() => handlePress(result)} className="h-10 rounded-lg bg-canvas-surface hover:bg-canvas-elevated text-brand-400 border border-canvas-border text-xs font-mono active:scale-95 transition-all">Ans</button>
              <button
                type="button"
                onClick={handleCompute}
                className="col-span-2 h-10 rounded-lg bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center shadow-sm shadow-brand-glow active:scale-95 transition-all"
                aria-label="Calculate expression"
              >
                <Equal className="w-5 h-5" />
              </button>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* SUB-SYSTEM 2: MATRIX ENGINE                                              */}
        {/* ========================================================================= */}
        {activeMode === 'MATRIX' && (
          <div className="space-y-3 bg-canvas-surface border border-canvas-border rounded-2xl p-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-canvas-border pb-2">
              <span className="font-bold text-content-primary flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-brand-400" />
                <span>Matrix A (3×3)</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveMode('COMP')}
                className="text-2xs text-brand-400 hover:text-brand-300 font-bold"
              >
                Back to COMP
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 max-w-[240px] mx-auto py-1">
              {matA.map((row, r) =>
                row.map((val, c) => (
                  <input
                    key={`${r}-${c}`}
                    type="number"
                    value={val}
                    onChange={(e) => {
                      const cp = [...matA.map((rItem) => [...rItem])];
                      cp[r][c] = parseFloat(e.target.value) || 0;
                      setMatA(cp);
                    }}
                    className="h-9 bg-canvas-subtle border border-canvas-border focus:border-brand-400 p-1.5 text-center font-mono text-content-primary rounded-lg outline-none"
                    aria-label={`Matrix element row ${r + 1} col ${c + 1}`}
                  />
                ))
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={computeMatrixDet}
                className="h-9 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white rounded-lg font-bold transition-all shadow-sm"
              >
                det(MatA)
              </button>
              <button
                type="button"
                onClick={computeMatrixInv}
                className="h-9 bg-status-success hover:bg-status-success/90 active:scale-95 text-white rounded-lg font-bold transition-all shadow-sm"
              >
                MatA⁻¹
              </button>
            </div>

            {matResText && (
              <pre className="bg-canvas-subtle p-2.5 rounded-xl border border-canvas-border text-status-success font-mono text-2xs whitespace-pre-wrap text-center">
                {matResText}
              </pre>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-SYSTEM 3: VECTOR ENGINE                                              */}
        {/* ========================================================================= */}
        {activeMode === 'VECTOR' && (
          <div className="space-y-3 bg-canvas-surface border border-canvas-border rounded-2xl p-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-canvas-border pb-2">
              <span className="font-bold text-content-primary flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-brand-400" />
                <span>3D Vector Geometry</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveMode('COMP')}
                className="text-2xs text-brand-400 hover:text-brand-300 font-bold"
              >
                Back to COMP
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <span className="text-2xs text-content-muted block mb-1">Vector u (x, y, z):</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <input
                      key={i}
                      type="number"
                      value={vecU[i as 0 | 1 | 2]}
                      onChange={(e) => {
                        const cp = [...vecU] as [number, number, number];
                        cp[i as 0 | 1 | 2] = parseFloat(e.target.value) || 0;
                        setVecU(cp);
                      }}
                      className="h-9 bg-canvas-subtle border border-canvas-border p-1.5 rounded-lg text-center text-content-primary font-mono outline-none focus:border-brand-400"
                    />
                  ))}
                </div>
              </div>

              <div>
                <span className="text-2xs text-content-muted block mb-1">Vector v (x, y, z):</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <input
                      key={i}
                      type="number"
                      value={vecV[i as 0 | 1 | 2]}
                      onChange={(e) => {
                        const cp = [...vecV] as [number, number, number];
                        cp[i as 0 | 1 | 2] = parseFloat(e.target.value) || 0;
                        setVecV(cp);
                      }}
                      className="h-9 bg-canvas-subtle border border-canvas-border p-1.5 rounded-lg text-center text-content-primary font-mono outline-none focus:border-brand-400"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={computeVectorDot}
                className="h-9 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white rounded-lg font-bold transition-all shadow-sm"
              >
                Dot Product (u·v)
              </button>
              <button
                type="button"
                onClick={computeVectorCross}
                className="h-9 bg-status-success hover:bg-status-success/90 active:scale-95 text-white rounded-lg font-bold transition-all shadow-sm"
              >
                Cross Product (u×v)
              </button>
            </div>

            {vecResText && (
              <div className="bg-canvas-subtle p-2.5 rounded-xl border border-canvas-border text-status-success font-mono text-center font-bold text-xs">
                {vecResText}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-SYSTEM 4: EQUATION SOLVER                                            */}
        {/* ========================================================================= */}
        {activeMode === 'EQN' && (
          <div className="space-y-3 bg-canvas-surface border border-canvas-border rounded-2xl p-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-canvas-border pb-2">
              <span className="font-bold text-content-primary">ax² + bx + c = 0</span>
              <button
                type="button"
                onClick={() => setActiveMode('COMP')}
                className="text-2xs text-brand-400 hover:text-brand-300 font-bold"
              >
                Back to COMP
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-2xs text-content-muted block mb-1">a</span>
                <input
                  type="text"
                  value={eqCoeff.a}
                  onChange={(e) => setEqCoeff({ ...eqCoeff, a: e.target.value })}
                  className="h-9 w-full bg-canvas-subtle border border-canvas-border p-1.5 rounded-lg text-center text-content-primary font-mono outline-none focus:border-brand-400"
                />
              </div>
              <div>
                <span className="text-2xs text-content-muted block mb-1">b</span>
                <input
                  type="text"
                  value={eqCoeff.b}
                  onChange={(e) => setEqCoeff({ ...eqCoeff, b: e.target.value })}
                  className="h-9 w-full bg-canvas-subtle border border-canvas-border p-1.5 rounded-lg text-center text-content-primary font-mono outline-none focus:border-brand-400"
                />
              </div>
              <div>
                <span className="text-2xs text-content-muted block mb-1">c</span>
                <input
                  type="text"
                  value={eqCoeff.c}
                  onChange={(e) => setEqCoeff({ ...eqCoeff, c: e.target.value })}
                  className="h-9 w-full bg-canvas-subtle border border-canvas-border p-1.5 rounded-lg text-center text-content-primary font-mono outline-none focus:border-brand-400"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={computeEquationRoots}
              className="h-9 w-full bg-brand-500 hover:bg-brand-600 active:scale-95 text-white rounded-lg font-bold transition-all shadow-sm"
            >
              Solve Quadratic Roots
            </button>

            {eqRoots && (
              <div className="bg-canvas-subtle p-2.5 rounded-xl border border-canvas-border text-status-success font-mono text-center space-y-0.5 text-xs">
                {eqRoots.map((r, i) => (
                  <div key={i}>{r}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-SYSTEM 5: CALCULUS ENGINE                                            */}
        {/* ========================================================================= */}
        {activeMode === 'CALC' && (
          <div className="space-y-3 bg-canvas-surface border border-canvas-border rounded-2xl p-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-canvas-border pb-2">
              <span className="font-bold text-content-primary flex items-center gap-1.5">
                <Sigma className="w-4 h-4 text-brand-400" />
                <span>Numerical Calculus</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveMode('COMP')}
                className="text-2xs text-brand-400 hover:text-brand-300 font-bold"
              >
                Back to COMP
              </button>
            </div>

            <div>
              <span className="text-2xs text-content-muted block mb-1">Function f(x):</span>
              <input
                type="text"
                value={calcFunc}
                onChange={(e) => setCalcFunc(e.target.value)}
                placeholder="e.g. x^2 - 4"
                className="h-9 w-full bg-canvas-subtle border border-canvas-border p-2 rounded-lg text-content-primary font-mono text-xs outline-none focus:border-brand-400"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-2xs text-content-muted block mb-1">Lower (a)</span>
                <input
                  type="text"
                  value={calcA}
                  onChange={(e) => setCalcA(e.target.value)}
                  className="h-9 w-full bg-canvas-subtle border border-canvas-border p-1 rounded-lg text-center text-content-primary font-mono outline-none focus:border-brand-400"
                />
              </div>
              <div>
                <span className="text-2xs text-content-muted block mb-1">Upper (b)</span>
                <input
                  type="text"
                  value={calcB}
                  onChange={(e) => setCalcB(e.target.value)}
                  className="h-9 w-full bg-canvas-subtle border border-canvas-border p-1 rounded-lg text-center text-content-primary font-mono outline-none focus:border-brand-400"
                />
              </div>
              <div>
                <span className="text-2xs text-content-muted block mb-1">x = c (d/dx)</span>
                <input
                  type="text"
                  value={calcPoint}
                  onChange={(e) => setCalcPoint(e.target.value)}
                  className="h-9 w-full bg-canvas-subtle border border-canvas-border p-1 rounded-lg text-center text-content-primary font-mono outline-none focus:border-brand-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={runCalculusIntegral}
                className="h-9 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white rounded-lg font-bold transition-all shadow-sm"
              >
                ∫ f(x) dx
              </button>
              <button
                type="button"
                onClick={runCalculusDerivative}
                className="h-9 bg-status-success hover:bg-status-success/90 active:scale-95 text-white rounded-lg font-bold transition-all shadow-sm"
              >
                d/dx|x=c
              </button>
            </div>

            {calcResText && (
              <div className="bg-canvas-subtle p-2.5 rounded-xl border border-canvas-border text-status-success font-mono text-center font-bold text-xs">
                {calcResText}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
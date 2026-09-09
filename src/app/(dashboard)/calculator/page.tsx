'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import katex from 'katex';
import {
  Fraction,
  floatToFraction,
  evaluateExpressionSafe,
  AngleMode,
} from '@/lib/calculator/full-engine';
import {
  Delete,
  Equal,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  X,
  SlidersHorizontal,
  ArrowUpRight,
  Database,
  Layers,
  Compass,
  Sigma,
  Activity,
  Binary,
  Zap,
  Table as TableIcon,
  Calculator as CalcIcon,
} from 'lucide-react';

type ActiveOverlay = 'NONE' | 'MODE' | 'VARS';

export default function ScientificCalculatorPage() {
  const router = useRouter();

  // Overlay state exclusivity
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>('NONE');

  // Expression Buffer & Display State
  const [displayExpr, setDisplayExpr] = useState('0');
  const [resultText, setResultText] = useState('0');
  const [exactFraction, setExactFraction] = useState<string | null>(null);
  const [showMixed, setShowMixed] = useState(false);
  const [cursorPos, setCursorPos] = useState(1);
  const [angleMode, setAngleMode] = useState<AngleMode>('DEG');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Shift & Modifier States
  const [isShift, setIsShift] = useState(false);
  const [isAlpha, setIsAlpha] = useState(false);
  const [isHyp, setIsHyp] = useState(false);
  const [engExponent, setEngExponent] = useState(0);

  // Memory Registers & Calculation History
  const [ansValue, setAnsValue] = useState<number>(0);
  const [registers, setRegisters] = useState<Record<string, number>>({
    A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, X: 0, Y: 0, M: 0,
  });
  const [history, setHistory] = useState<{ expr: string; res: string }[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);

  // Keypad Token Insertion with Cursor Support
  const appendToken = useCallback((token: string) => {
    setErrorMessage(null);
    setExactFraction(null);
    setDisplayExpr((prev) => {
      if (prev === '0' && !['+', '*', '/', '%', '^', '!'].includes(token)) {
        setCursorPos(token.length);
        return token;
      }
      const before = prev.slice(0, cursorPos);
      const after = prev.slice(cursorPos);
      const next = before + token + after;
      setCursorPos(before.length + token.length);
      return next;
    });

    if (isShift) setIsShift(false);
    if (isAlpha) setIsAlpha(false);
    if (isHyp) setIsHyp(false);
  }, [cursorPos, isShift, isAlpha, isHyp]);

  // Smart Context-Aware Deletion
  const handleDelete = useCallback(() => {
    setErrorMessage(null);
    setExactFraction(null);
    setDisplayExpr((prev) => {
      if (prev.length <= 1 || prev === '0' || cursorPos === 0) {
        setCursorPos(0);
        return '0';
      }

      const before = prev.slice(0, cursorPos);
      const after = prev.slice(cursorPos);

      const atomicTokens = [
        'asin(', 'acos(', 'atan(', 'asinh(', 'acosh(', 'atanh(',
        'sinh(', 'cosh(', 'tanh(', 'sin(', 'cos(', 'tan(',
        'cbrt(', 'sqrt(', 'log(', 'ln(', 'Ans', '×10^'
      ];

      for (const token of atomicTokens) {
        if (before.endsWith(token)) {
          const cut = before.slice(0, -token.length);
          const next = cut + after;
          setCursorPos(cut.length);
          return next.length === 0 ? '0' : next;
        }
      }

      const cut = before.slice(0, -1);
      const next = cut + after;
      setCursorPos(cut.length);
      return next.length === 0 ? '0' : next;
    });
  }, [cursorPos]);

  const handleClear = useCallback(() => {
    setDisplayExpr('0');
    setResultText('0');
    setExactFraction(null);
    setErrorMessage(null);
    setCursorPos(1);
  }, []);

  // Primary Deterministic Calculation Engine
  const handleCompute = useCallback(() => {
    if (!displayExpr || displayExpr === '0') return;
    try {
      setErrorMessage(null);

      const res = evaluateExpressionSafe(displayExpr, { ...registers, Ans: ansValue }, angleMode);
      setResultText(String(res));
      setAnsValue(res);
      setHistory((prev) => [{ expr: displayExpr, res: String(res) }, ...prev.slice(0, 49)]);

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
    } catch (err: any) {
      setErrorMessage(err.message || 'Syntax ERROR');
    }
  }, [displayExpr, registers, ansValue, angleMode]);

  // Physical Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (activeOverlay !== 'NONE') {
          setActiveOverlay('NONE');
        } else {
          handleClear();
        }
        return;
      }

      if (activeOverlay !== 'NONE') return;

      if (e.key >= '0' && e.key <= '9') appendToken(e.key);
      else if (['+', '-', '*', '/'].includes(e.key)) appendToken(e.key);
      else if (e.key === '.') appendToken('.');
      else if (e.key === '(' || e.key === ')') appendToken(e.key);
      else if (e.key === '^') appendToken('^');
      else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleCompute();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCursorPos((p) => Math.max(0, p - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCursorPos((p) => Math.min(displayExpr.length, p + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appendToken, handleCompute, handleDelete, handleClear, displayExpr.length, activeOverlay]);

  // S<=>D Fraction Toggle
  const toggleFractionDecimal = () => {
    const val = parseFloat(resultText);
    if (isNaN(val)) return;

    try {
      if (!exactFraction) {
        const frac = floatToFraction(val);
        setExactFraction(frac.toString());
        setShowMixed(false);
      } else if (!showMixed) {
        const frac = floatToFraction(val);
        setExactFraction(frac.toMixed());
        setShowMixed(true);
      } else {
        setExactFraction(null);
        setShowMixed(false);
      }
    } catch {
      setExactFraction(null);
    }
  };

  const storeToRegister = (reg: string) => {
    const val = parseFloat(resultText);
    if (!isNaN(val)) {
      setRegisters((prev) => ({ ...prev, [reg]: val }));
      setActiveOverlay('NONE');
    }
  };

  const renderFormulaKaTeX = (raw: string) => {
    if (!raw || raw === '0') return '<span class="text-slate-600 font-mono">0</span>';
    const formatted = raw
      .replace(/\*/g, ' \\times ')
      .replace(/\//g, ' \\div ')
      .replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')
      .replace(/cbrt\(([^)]+)\)/g, '\\sqrt[3]{$1}')
      .replace(/\^2/g, '^{2}')
      .replace(/\^3/g, '^{3}')
      .replace(/\^/g, '^');

    try {
      return katex.renderToString(formatted, { throwOnError: false, displayMode: false });
    } catch {
      return raw;
    }
  };

  // Structured System Modes Directory
  const engineeringModes = [
    {
      id: 'COMP',
      badge: '01',
      title: 'Standard V.P.A.M.',
      desc: 'Natural display textbook arithmetic & trigonometry',
      href: '/calculator',
      icon: CalcIcon,
    },
    {
      id: 'MATRIX',
      badge: '02',
      title: 'Matrix Algebra',
      desc: 'Up to 3×3 Inversion, Determinants & Transpositions',
      href: '/calculator/matrix',
      icon: Layers,
    },
    {
      id: 'VECTOR',
      badge: '03',
      title: '3D Vector Mechanics',
      desc: 'Dot product, Cross product & Modulus analysis',
      href: '/calculator/vector',
      icon: Compass,
    },
    {
      id: 'EQN',
      badge: '04',
      title: 'Equation Solver',
      desc: 'Quadratic curves & 2-Variable linear systems',
      href: '/calculator/equations',
      icon: Equal,
    },
    {
      id: 'CALC',
      badge: '05',
      title: 'Numerical Calculus',
      desc: 'Adaptive Gauss definite integrals & point derivatives',
      href: '/calculator/calculus',
      icon: Sigma,
    },
    {
      id: 'CMPLX',
      badge: '06',
      title: 'Complex Numbers',
      desc: 'Rectangular a+bi, Polar r∠θ & Phasor transformations',
      href: '/calculator/complex',
      icon: Activity,
    },
    {
      id: 'STAT',
      badge: '07',
      title: 'Statistics & Dispersion',
      desc: 'Mean x̄, Population σ, Sample s & Data range',
      href: '/calculator/statistics',
      icon: TableIcon,
    },
    {
      id: 'TABLE',
      badge: '08',
      title: 'Function Table',
      desc: 'Interval stepped evaluations for function f(X)',
      href: '/calculator/table',
      icon: TableIcon,
    },
    {
      id: 'BASE_N',
      badge: '09',
      title: 'Base-N Digital Logic',
      desc: 'Real-time Hex, Binary, Octal & Decimal converters',
      href: '/calculator/base-n',
      icon: Binary,
    },
    {
      id: 'CONSTANTS',
      badge: '10',
      title: 'Constants & Physics',
      desc: 'CODATA standardized physical & engineering constants',
      href: '/calculator/constants',
      icon: Zap,
    },
  ];

  return (
    <div className="max-w-md mx-auto space-y-3 pb-24 md:pb-10 px-2 sm:px-0 select-none">
      
      {/* Workstation Top Navigation Bar */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-content-primary flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
            Scientific Workstation
          </h2>
          <p className="text-2xs text-content-muted">Deterministic Offline VPAM Core</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveOverlay((prev) => (prev === 'VARS' ? 'NONE' : 'VARS'))}
            className={`btn-secondary px-2.5 py-1.5 text-xs font-semibold ${
              activeOverlay === 'VARS'
                ? '!bg-status-success !text-white !border-transparent shadow-sm'
                : ''
            }`}
            aria-expanded={activeOverlay === 'VARS'}
            aria-label="Toggle variable memory registers"
          >
            <Database className="w-3.5 h-3.5" />
            VARS
          </button>
          <button
            onClick={() => setActiveOverlay((prev) => (prev === 'MODE' ? 'NONE' : 'MODE'))}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              activeOverlay === 'MODE'
                ? 'bg-brand-500 text-white border-brand-400 shadow-sm shadow-brand-glow font-bold'
                : 'bg-canvas-subtle text-brand-400 border-canvas-border hover:bg-canvas-surface hover:text-brand-300'
            }`}
            aria-expanded={activeOverlay === 'MODE'}
            aria-label="Open mode switcher"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            MODE
          </button>
        </div>
      </div>

      {/* Hardware Casing Chassis */}
      <div className="bg-canvas-subtle border border-canvas-border rounded-3xl shadow-elevated p-4 sm:p-5 flex flex-col gap-3 relative overflow-hidden">
        
        {/* Soft Modal Dismissal Backdrop */}
        {activeOverlay !== 'NONE' && (
          <div
            onClick={() => setActiveOverlay('NONE')}
            className="absolute inset-0 bg-[#030712]/95 backdrop-blur-md z-20 transition-all animate-in fade-in duration-150"
            aria-hidden="true"
          />
        )}

        {/* ========================================================================= */}
        {/* 1. SYSTEM MODE SELECTION OVERLAY                                         */}
        {/* ========================================================================= */}
        {activeOverlay === 'MODE' && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Select System Engine Mode"
            className="absolute inset-x-3.5 top-3.5 z-30 bg-canvas-subtle border-2 border-brand-500/60 rounded-2xl p-4 shadow-elevated space-y-3 animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-canvas-border pb-2.5 px-0.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-content-primary tracking-wide">SYSTEM ENGINE MODES</h4>
                  <p className="text-2xs text-content-secondary">Select dedicated calculation pipeline</p>
                </div>
              </div>
              <button
                onClick={() => setActiveOverlay('NONE')}
                className="w-7 h-7 rounded-lg bg-canvas-surface hover:bg-canvas-elevated border border-canvas-border flex items-center justify-center text-content-muted hover:text-content-primary transition-colors"
                aria-label="Close mode menu"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scrollable Navigation List */}
            <div className="grid grid-cols-1 gap-1.5 max-h-[350px] overflow-y-auto pr-1 select-none scrollbar-thin scrollbar-thumb-canvas-border">
              {engineeringModes.map((m) => {
                const Icon = m.icon;
                const isCurrent = m.id === 'COMP';
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setActiveOverlay('NONE');
                      if (!isCurrent) router.push(m.href);
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-150 outline-none active:scale-[0.98] ${
                      isCurrent
                        ? 'bg-canvas-elevated text-content-primary border-2 border-brand-500 shadow-[0_0_20px_-4px_rgba(59,130,246,0.35)] font-bold'
                        : 'bg-canvas-surface text-content-secondary border-canvas-border hover:bg-canvas-elevated hover:text-content-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border shrink-0 transition-colors ${
                            isCurrent
                              ? 'bg-brand-500 text-white border-brand-400 shadow-sm'
                              : 'bg-canvas-subtle text-content-secondary border-canvas-border'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-mono font-bold text-brand-400">[{m.badge}] {m.title}</span>
                      </div>
                      <span className={`text-2xs px-2.5 py-1 rounded-xl font-bold ${isCurrent ? 'bg-brand-500 text-white shadow-sm' : 'bg-canvas-subtle text-content-muted'}`}>
                        {isCurrent ? 'ACTIVE' : 'SELECT'}
                      </span>
                    </div>
                    <p className="text-xs text-content-secondary mt-1 truncate">{m.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. VARIABLE REGISTERS OVERLAY (STO / RCL)                                 */}
        {/* ========================================================================= */}
        {activeOverlay === 'VARS' && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Variable Memory Registers"
            className="absolute inset-x-3.5 top-3.5 z-30 bg-canvas-subtle border-2 border-status-success/60 rounded-2xl p-4 shadow-elevated space-y-3 animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-canvas-border pb-2.5 px-0.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-status-success-bg border border-status-success/30 flex items-center justify-center text-status-success">
                  <Database className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-content-primary tracking-wide">VARIABLE REGISTERS</h4>
                  <p className="text-2xs text-content-secondary">Store (STO) or Recall (RCL) values</p>
                </div>
              </div>
              <button
                onClick={() => setActiveOverlay('NONE')}
                className="w-7 h-7 rounded-lg bg-canvas-surface hover:bg-canvas-elevated border border-canvas-border flex items-center justify-center text-content-muted hover:text-content-primary transition-colors"
                aria-label="Close variable registers"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Registers Matrix Grid */}
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(registers).map(([k, v]) => (
                <div
                  key={k}
                  className="bg-canvas-surface border border-canvas-border p-2.5 rounded-xl flex flex-col justify-between shadow-inner"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-canvas-border">
                    <span className="w-5 h-5 rounded bg-canvas-subtle text-content-primary font-mono font-bold text-xs flex items-center justify-center border border-canvas-border">
                      {k}
                    </span>
                    <span className="text-2xs font-mono font-semibold text-status-success truncate max-w-[50px]">
                      {v}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-2">
                    <button
                      type="button"
                      onClick={() => storeToRegister(k)}
                      className="py-1.5 rounded-lg bg-status-success-bg hover:bg-status-success/25 border border-status-success/40 text-emerald-300 font-bold text-2xs transition-colors active:scale-95 shadow-sm"
                      title={`Store current answer into ${k}`}
                    >
                      STO
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        appendToken(k);
                        setActiveOverlay('NONE');
                      }}
                      className="py-1.5 rounded-lg bg-canvas-subtle hover:bg-canvas-elevated border border-canvas-border text-content-primary font-bold text-2xs transition-colors active:scale-95 shadow-sm"
                      title={`Recall variable ${k}`}
                    >
                      RCL
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DUAL-LINE NATURAL LCD SCREEN (Tactile Texture)                            */}
        {/* ========================================================================= */}
        <div
          aria-live="polite"
          className="bg-[#8E9F88] text-slate-950 rounded-lcd p-3 border-2 border-[#768571] shadow-inner font-mono flex flex-col justify-between min-h-[110px] relative overflow-hidden"
        >
          {/* Status Header Strip */}
          <div className="flex items-center justify-between text-2xs font-bold border-b border-slate-950/10 pb-0.5">
            <div className="flex items-center gap-1.5 tracking-tighter">
              <span className={isShift ? 'bg-slate-950 text-[#8E9F88] px-1 rounded-xs' : 'opacity-25'}>S</span>
              <span className={isAlpha ? 'bg-slate-950 text-[#8E9F88] px-1 rounded-xs' : 'opacity-25'}>A</span>
              <span className={isHyp ? 'bg-slate-950 text-[#8E9F88] px-1 rounded-xs' : 'opacity-25'}>HYP</span>
              <span className="underline">{angleMode}</span>
              {registers.M !== 0 && <span className="bg-slate-950 text-[#8E9F88] px-1 rounded-xs">M</span>}
            </div>
            {errorMessage ? (
              <span className="text-status-danger font-extrabold">{errorMessage}</span>
            ) : (
              <span className="opacity-40">MATH-PRINT</span>
            )}
          </div>

          {/* Upper Math-Print Buffer (KaTeX Typesetting) */}
          <div
            className="text-sm font-semibold tracking-wide py-1 text-slate-900 overflow-x-auto whitespace-nowrap scrollbar-none text-left min-h-[28px]"
            dangerouslySetInnerHTML={{ __html: renderFormulaKaTeX(displayExpr) }}
          />

          {/* Lower Numeric Result Output */}
          <div className="flex items-baseline justify-between pt-0.5 border-t border-slate-950/10">
            <span className="text-2xs font-bold text-slate-800">
              {exactFraction ? `[ ${exactFraction} ]` : ''}
            </span>
            <span className="text-xl font-bold tracking-tight text-right font-mono truncate pl-2">
              {resultText}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* REPLAY NAVIGATION D-PAD & SHIFT CONTROLS                                  */}
        {/* ========================================================================= */}
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

          {/* Integrated Physical Hardware D-Pad */}
          <div className="col-span-2 flex items-center justify-center">
            <div className="w-20 h-10 rounded-full bg-canvas-surface border border-canvas-border flex items-center justify-around px-1 shadow-sm">
              <button
                type="button"
                onClick={() => setCursorPos((p) => Math.max(0, p - 1))}
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
                      const next = historyIndex === null ? 0 : Math.min(history.length - 1, historyIndex + 1);
                      setHistoryIndex(next);
                      setDisplayExpr(history[next].expr);
                      setCursorPos(history[next].expr.length);
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
                    if (historyIndex !== null) {
                      const next = historyIndex - 1;
                      if (next < 0) {
                        setHistoryIndex(null);
                        setDisplayExpr('0');
                        setCursorPos(1);
                      } else {
                        setHistoryIndex(next);
                        setDisplayExpr(history[next].expr);
                        setCursorPos(history[next].expr.length);
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
                onClick={() => setCursorPos((p) => Math.min(displayExpr.length, p + 1))}
                className="p-1 text-content-muted hover:text-content-primary transition-colors"
                aria-label="Cursor right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAngleMode((prev) => (prev === 'DEG' ? 'RAD' : prev === 'RAD' ? 'GRA' : 'DEG'))}
            className="py-1.5 rounded-md text-2xs font-semibold bg-canvas-surface text-content-secondary border border-canvas-border hover:text-content-primary transition-colors outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
            aria-label={`Cycle angle units, currently ${angleMode}`}
          >
            {angleMode}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* FUNCTION ROW KEYS (Trig, Log & Powers)                                    */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-5 gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => appendToken(isShift ? 'asin(' : isHyp ? 'sinh(' : 'sin(')}
            className="h-9 rounded-md bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border font-medium text-2xs transition-colors"
          >
            {isShift ? 'sin⁻¹' : isHyp ? 'sinh' : 'sin'}
          </button>
          <button
            type="button"
            onClick={() => appendToken(isShift ? 'acos(' : isHyp ? 'cosh(' : 'cos(')}
            className="h-9 rounded-md bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border font-medium text-2xs transition-colors"
          >
            {isShift ? 'cos⁻¹' : isHyp ? 'cosh' : 'cos'}
          </button>
          <button
            type="button"
            onClick={() => appendToken(isShift ? 'atan(' : isHyp ? 'tanh(' : 'tan(')}
            className="h-9 rounded-md bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border font-medium text-2xs transition-colors"
          >
            {isShift ? 'tan⁻¹' : isHyp ? 'tanh' : 'tan'}
          </button>
          <button
            type="button"
            onClick={() => appendToken('ln(')}
            className="h-9 rounded-md bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border font-medium text-2xs transition-colors"
          >
            ln
          </button>
          <button
            type="button"
            onClick={() => appendToken('log(')}
            className="h-9 rounded-md bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border font-medium text-2xs transition-colors"
          >
            log
          </button>

          <button
            type="button"
            onClick={() => appendToken(isShift ? 'cbrt(' : 'sqrt(')}
            className="h-9 rounded-md bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border font-medium text-xs transition-colors"
          >
            {isShift ? '∛' : '√'}
          </button>
          <button
            type="button"
            onClick={() => appendToken('^')}
            className="h-9 rounded-md bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border font-medium text-xs transition-colors"
          >
            xʸ
          </button>
          <button
            type="button"
            onClick={() => appendToken('(')}
            className="h-9 rounded-md bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border font-medium text-xs transition-colors"
          >
            (
          </button>
          <button
            type="button"
            onClick={() => appendToken(')')}
            className="h-9 rounded-md bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border font-medium text-xs transition-colors"
          >
            )
          </button>
          <button
            type="button"
            onClick={() => appendToken(isAlpha ? 'X' : 'π')}
            className="h-9 rounded-md bg-canvas-surface hover:bg-canvas-elevated text-content-secondary hover:text-content-primary border border-canvas-border font-serif text-xs transition-colors"
          >
            {isAlpha ? 'X' : 'π'}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* PRIMARY KEYPAD MATRIX (High Contrast Numeric Grid)                        */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-5 gap-1.5 text-sm font-semibold">
          {/* Row 1 */}
          <button type="button" onClick={() => appendToken('7')} className="h-11 rounded-lg bg-[#1C2536] hover:bg-[#253248] active:scale-[0.97] text-content-primary border border-canvas-border shadow-sm transition-all">7</button>
          <button type="button" onClick={() => appendToken('8')} className="h-11 rounded-lg bg-[#1C2536] hover:bg-[#253248] active:scale-[0.97] text-content-primary border border-canvas-border shadow-sm transition-all">8</button>
          <button type="button" onClick={() => appendToken('9')} className="h-11 rounded-lg bg-[#1C2536] hover:bg-[#253248] active:scale-[0.97] text-content-primary border border-canvas-border shadow-sm transition-all">9</button>
          <button type="button" onClick={handleDelete} className="h-11 rounded-lg bg-status-danger-bg hover:bg-status-danger/25 active:scale-[0.97] text-status-danger border border-status-danger/30 flex items-center justify-center transition-all" aria-label="Delete character">
            <Delete className="w-4 h-4" />
          </button>
          <button type="button" onClick={handleClear} className="h-11 rounded-lg bg-status-danger text-white hover:bg-status-danger/90 active:scale-[0.97] font-bold shadow-sm transition-all">
            AC
          </button>

          {/* Row 2 */}
          <button type="button" onClick={() => appendToken('4')} className="h-11 rounded-lg bg-[#1C2536] hover:bg-[#253248] active:scale-[0.97] text-content-primary border border-canvas-border shadow-sm transition-all">4</button>
          <button type="button" onClick={() => appendToken('5')} className="h-11 rounded-lg bg-[#1C2536] hover:bg-[#253248] active:scale-[0.97] text-content-primary border border-canvas-border shadow-sm transition-all">5</button>
          <button type="button" onClick={() => appendToken('6')} className="h-11 rounded-lg bg-[#1C2536] hover:bg-[#253248] active:scale-[0.97] text-content-primary border border-canvas-border shadow-sm transition-all">6</button>
          <button type="button" onClick={() => appendToken('*')} className="h-11 rounded-lg bg-canvas-surface hover:bg-canvas-elevated active:scale-[0.97] text-brand-400 border border-canvas-border text-base transition-all">×</button>
          <button type="button" onClick={() => appendToken('/')} className="h-11 rounded-lg bg-canvas-surface hover:bg-canvas-elevated active:scale-[0.97] text-brand-400 border border-canvas-border text-base transition-all">÷</button>

          {/* Row 3 */}
          <button type="button" onClick={() => appendToken('1')} className="h-11 rounded-lg bg-[#1C2536] hover:bg-[#253248] active:scale-[0.97] text-content-primary border border-canvas-border shadow-sm transition-all">1</button>
          <button type="button" onClick={() => appendToken('2')} className="h-11 rounded-lg bg-[#1C2536] hover:bg-[#253248] active:scale-[0.97] text-content-primary border border-canvas-border shadow-sm transition-all">2</button>
          <button type="button" onClick={() => appendToken('3')} className="h-11 rounded-lg bg-[#1C2536] hover:bg-[#253248] active:scale-[0.97] text-content-primary border border-canvas-border shadow-sm transition-all">3</button>
          <button type="button" onClick={() => appendToken('+')} className="h-11 rounded-lg bg-canvas-surface hover:bg-canvas-elevated active:scale-[0.97] text-brand-400 border border-canvas-border text-base transition-all">+</button>
          <button type="button" onClick={() => appendToken('-')} className="h-11 rounded-lg bg-canvas-surface hover:bg-canvas-elevated active:scale-[0.97] text-brand-400 border border-canvas-border text-base transition-all">−</button>

          {/* Row 4 */}
          <button type="button" onClick={() => appendToken('0')} className="h-11 rounded-lg bg-[#1C2536] hover:bg-[#253248] active:scale-[0.97] text-content-primary border border-canvas-border shadow-sm transition-all">0</button>
          <button type="button" onClick={() => appendToken('.')} className="h-11 rounded-lg bg-[#1C2536] hover:bg-[#253248] active:scale-[0.97] text-content-primary border border-canvas-border shadow-sm transition-all">.</button>
          <button type="button" onClick={() => appendToken(String(ansValue))} className="h-11 rounded-lg bg-canvas-surface hover:bg-canvas-elevated active:scale-[0.97] text-brand-400 border border-canvas-border text-xs font-mono transition-all">
            Ans
          </button>
          <button
            type="button"
            onClick={toggleFractionDecimal}
            className="h-11 rounded-lg bg-status-success-bg hover:bg-status-success/20 active:scale-[0.97] text-status-success border border-status-success/30 font-bold text-xs transition-all"
            title="Toggle between fraction and decimal"
          >
            S⇔D
          </button>
          <button
            type="button"
            onClick={handleCompute}
            className="btn-primary h-11 text-base font-extrabold shadow-brand-glow"
            aria-label="Calculate result"
          >
            <Equal className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
}
'use client';

import React, { useState, useId } from 'react';
import Link from 'next/link';
import katex from 'katex';
import {
  ArrowLeft,
  Equal,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';

type EqnType = 'QUAD' | 'SIM2';

interface SolutionPayload {
  title: string;
  discriminant?: number;
  rootType?: 'REAL_DISTINCT' | 'REAL_DOUBLE' | 'COMPLEX';
  roots: { label: string; value: string; latex: string }[];
  summaryLatex: string;
}

export default function EquationSolverPage() {
  const [type, setType] = useState<EqnType>('QUAD');
  const [coeffs, setCoeffs] = useState<Record<string, string>>({
    a: '',
    b: '',
    c: '',
    a1: '',
    b1: '',
    c1: '',
    a2: '',
    b2: '',
    c2: '',
  });

  const [solutionData, setSolutionData] = useState<SolutionPayload | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function solveQuadratic(a: number, b: number, c: number): SolutionPayload {
    if (a === 0) {
      throw new Error('Coefficient "a" cannot be 0 in a quadratic equation (ax² + bx + c = 0).');
    }

    const d = b * b - 4 * a * c;
    const roundedD = Math.round(d * 1e5) / 1e5;

    if (d > 0) {
      const x1 = (-b + Math.sqrt(d)) / (2 * a);
      const x2 = (-b - Math.sqrt(d)) / (2 * a);
      const r1 = Math.round(x1 * 1e5) / 1e5;
      const r2 = Math.round(x2 * 1e5) / 1e5;

      return {
        title: 'Quadratic Equation (Distinct Real Roots)',
        discriminant: roundedD,
        rootType: 'REAL_DISTINCT',
        roots: [
          { label: 'x₁', value: String(r1), latex: `x_1 = ${r1}` },
          { label: 'x₂', value: String(r2), latex: `x_2 = ${r2}` },
        ],
        summaryLatex: `x_1 = ${r1},\\quad x_2 = ${r2}`,
      };
    } else if (d === 0) {
      const x = -b / (2 * a);
      const r = Math.round(x * 1e5) / 1e5;

      return {
        title: 'Quadratic Equation (Repeated Real Root)',
        discriminant: 0,
        rootType: 'REAL_DOUBLE',
        roots: [
          { label: 'x₁ = x₂', value: String(r), latex: `x_1 = x_2 = ${r}` },
        ],
        summaryLatex: `x = ${r}`,
      };
    } else {
      const real = -b / (2 * a);
      const imag = Math.sqrt(-d) / (2 * a);
      const r = Math.round(real * 1e4) / 1e4;
      const im = Math.round(Math.abs(imag) * 1e4) / 1e4;

      return {
        title: 'Quadratic Equation (Complex Conjugate Roots)',
        discriminant: roundedD,
        rootType: 'COMPLEX',
        roots: [
          { label: 'x₁', value: `${r} + ${im}i`, latex: `x_1 = ${r} + ${im}i` },
          { label: 'x₂', value: `${r} - ${im}i`, latex: `x_2 = ${r} - ${im}i` },
        ],
        summaryLatex: `x = ${r} \\pm ${im}i`,
      };
    }
  }

  function solveSimultaneous(
    a1: number, b1: number, c1: number,
    a2: number, b2: number, c2: number
  ): SolutionPayload {
    const det = a1 * b2 - a2 * b1;
    if (det === 0) {
      throw new Error('System has no unique solution (determinant = 0). Lines are parallel or coincident.');
    }

    const x = (c1 * b2 - c2 * b1) / det;
    const y = (a1 * c2 - a2 * c1) / det;

    const roundX = Math.round(x * 1e5) / 1e5;
    const roundY = Math.round(y * 1e5) / 1e5;

    return {
      title: 'Simultaneous Linear System (Unique Solution)',
      roots: [
        { label: 'x', value: String(roundX), latex: `x = ${roundX}` },
        { label: 'y', value: String(roundY), latex: `y = ${roundY}` },
      ],
      summaryLatex: `x = ${roundX},\\quad y = ${roundY}`,
    };
  }

  const handleSolve = () => {
    setErrorMsg(null);
    try {
      if (type === 'QUAD') {
        const a = parseFloat(coeffs.a);
        const b = parseFloat(coeffs.b);
        const c = parseFloat(coeffs.c);

        if (isNaN(a) || isNaN(b) || isNaN(c)) {
          throw new Error('All quadratic coefficients (a, b, c) must be valid numeric values.');
        }

        const res = solveQuadratic(a, b, c);
        setSolutionData(res);
      } else {
        const a1 = parseFloat(coeffs.a1);
        const b1 = parseFloat(coeffs.b1);
        const c1 = parseFloat(coeffs.c1);
        const a2 = parseFloat(coeffs.a2);
        const b2 = parseFloat(coeffs.b2);
        const c2 = parseFloat(coeffs.c2);

        if ([a1, b1, c1, a2, b2, c2].some((v) => isNaN(v))) {
          throw new Error('All 6 system coefficients must be valid numeric values.');
        }

        const res = solveSimultaneous(a1, b1, c1, a2, b2, c2);
        setSolutionData(res);
      }
    } catch (e: any) {
      setSolutionData(null);
      setErrorMsg(e.message || 'Error computing equation solution.');
    }
  };

  const renderKaTeX = (latexStr: string, isDisplay = false) => {
    try {
      return katex.renderToString(latexStr, {
        throwOnError: false,
        displayMode: isDisplay,
      });
    } catch {
      return latexStr;
    }
  };

  const copyResultsToClipboard = () => {
    if (!solutionData) return;
    const text = solutionData.roots.map((r) => `${r.label} = ${r.value}`).join(', ');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-12 select-none">
      {/* Top Navigation Strip */}
      <div className="flex items-center justify-between border-b border-canvas-border pb-3">
        <Link
          href="/calculator"
          className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1.5 font-medium outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded px-1 py-0.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Standard Calculator</span>
        </Link>
        <span className="text-2xs font-mono font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded-md">
          MODE: 04 / EQN
        </span>
      </div>

      {/* Main Engineering Container */}
      <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-4 sm:p-6 space-y-4 shadow-elevated">
        {/* Title and Mode Switcher Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-canvas-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/25 flex items-center justify-center text-brand-400">
              <Equal className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-content-primary">
                Equation Solver
              </h1>
              <p className="text-2xs text-content-secondary">
                Exact polynomial roots & simultaneous determinant solutions
              </p>
            </div>
          </div>

          {/* Type Switcher Tabs */}
          <div className="flex items-center bg-canvas-surface border border-canvas-border p-0.5 rounded-lg text-2xs font-semibold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setType('QUAD');
                setErrorMsg(null);
                setSolutionData(null);
              }}
              className={`px-2.5 py-1.5 rounded transition-colors ${
                type === 'QUAD'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-content-secondary hover:text-content-primary'
              }`}
            >
              Quadratic (ax² + bx + c)
            </button>
            <button
              type="button"
              onClick={() => {
                setType('SIM2');
                setErrorMsg(null);
                setSolutionData(null);
              }}
              className={`px-2.5 py-1.5 rounded transition-colors ${
                type === 'SIM2'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-content-secondary hover:text-content-primary'
              }`}
            >
              Simultaneous (2 Vars)
            </button>
          </div>
        </div>

        {/* Input Parameters: Quadratic Form */}
        {type === 'QUAD' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-2xs text-content-muted">
              <span>Standard form: <code className="text-content-primary font-mono">ax² + bx + c = 0</code></span>
              <span>Degree 2</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-2xs font-semibold text-content-secondary mb-1 block">
                  Coeff <span className="font-mono text-brand-400">a</span> (x²)
                </label>
                <input
                  type="text"
                  value={coeffs.a}
                  onChange={(e) => setCoeffs({ ...coeffs, a: e.target.value })}
                  placeholder="0"
                  className="w-full h-11 bg-canvas-surface border border-canvas-border rounded-lg text-center font-mono text-sm text-content-primary outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-2xs font-semibold text-content-secondary mb-1 block">
                  Coeff <span className="font-mono text-brand-400">b</span> (x)
                </label>
                <input
                  type="text"
                  value={coeffs.b}
                  onChange={(e) => setCoeffs({ ...coeffs, b: e.target.value })}
                  placeholder="0"
                  className="w-full h-11 bg-canvas-surface border border-canvas-border rounded-lg text-center font-mono text-sm text-content-primary outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-2xs font-semibold text-content-secondary mb-1 block">
                  Constant <span className="font-mono text-brand-400">c</span>
                </label>
                <input
                  type="text"
                  value={coeffs.c}
                  onChange={(e) => setCoeffs({ ...coeffs, c: e.target.value })}
                  placeholder="0"
                  className="w-full h-11 bg-canvas-surface border border-canvas-border rounded-lg text-center font-mono text-sm text-content-primary outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* Input Parameters: 2-Variable Simultaneous Form */}
        {type === 'SIM2' && (
          <div className="space-y-3">
            <div className="text-2xs text-content-muted">
              Standard matrix form: <code className="text-content-primary font-mono">aX + bY = c</code>
            </div>

            <div className="space-y-2 font-mono text-xs">
              {/* Equation 1 */}
              <div className="flex items-center gap-2 bg-canvas-surface p-2 rounded-lg border border-canvas-border">
                <span className="text-content-muted text-2xs w-6">Eq 1:</span>
                <input
                  type="text"
                  value={coeffs.a1}
                  onChange={(e) => setCoeffs({ ...coeffs, a1: e.target.value })}
                  placeholder="0"
                  className="w-14 h-9 bg-canvas-subtle border border-canvas-border rounded-md text-center text-content-primary outline-none focus:border-brand-500"
                />
                <span className="text-content-secondary">x +</span>
                <input
                  type="text"
                  value={coeffs.b1}
                  onChange={(e) => setCoeffs({ ...coeffs, b1: e.target.value })}
                  placeholder="0"
                  className="w-14 h-9 bg-canvas-subtle border border-canvas-border rounded-md text-center text-content-primary outline-none focus:border-brand-500"
                />
                <span className="text-content-secondary">y =</span>
                <input
                  type="text"
                  value={coeffs.c1}
                  onChange={(e) => setCoeffs({ ...coeffs, c1: e.target.value })}
                  placeholder="0"
                  className="w-14 h-9 bg-canvas-subtle border border-canvas-border rounded-md text-center text-content-primary outline-none focus:border-brand-500"
                />
              </div>

              {/* Equation 2 */}
              <div className="flex items-center gap-2 bg-canvas-surface p-2 rounded-lg border border-canvas-border">
                <span className="text-content-muted text-2xs w-6">Eq 2:</span>
                <input
                  type="text"
                  value={coeffs.a2}
                  onChange={(e) => setCoeffs({ ...coeffs, a2: e.target.value })}
                  placeholder="0"
                  className="w-14 h-9 bg-canvas-subtle border border-canvas-border rounded-md text-center text-content-primary outline-none focus:border-brand-500"
                />
                <span className="text-content-secondary">x +</span>
                <input
                  type="text"
                  value={coeffs.b2}
                  onChange={(e) => setCoeffs({ ...coeffs, b2: e.target.value })}
                  placeholder="0"
                  className="w-14 h-9 bg-canvas-subtle border border-canvas-border rounded-md text-center text-content-primary outline-none focus:border-brand-500"
                />
                <span className="text-content-secondary">y =</span>
                <input
                  type="text"
                  value={coeffs.c2}
                  onChange={(e) => setCoeffs({ ...coeffs, c2: e.target.value })}
                  placeholder="0"
                  className="w-14 h-9 bg-canvas-subtle border border-canvas-border rounded-md text-center text-content-primary outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Solve Action Button */}
        <button
          type="button"
          onClick={handleSolve}
          className="w-full h-11 rounded-lg bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-xs transition-colors shadow-sm flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas-subtle"
        >
          <Equal className="w-4 h-4" />
          <span>Solve System Roots</span>
        </button>

        {/* Error Alert */}
        {errorMsg && (
          <div
            role="alert"
            className="bg-status-danger-bg border border-status-danger/30 text-status-danger px-3.5 py-2.5 rounded-lg text-xs flex items-start gap-2 animate-in fade-in duration-150"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-snug">{errorMsg}</div>
          </div>
        )}

        {/* Structured Solution Output */}
        {solutionData ? (
          <div className="space-y-3 pt-1 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Telemetry */}
            <div className="flex items-center justify-between border-b border-canvas-border pb-2">
              <span className="text-2xs font-bold text-status-success uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {solutionData.title}
              </span>

              {solutionData.discriminant !== undefined && (
                <span className="text-2xs font-mono text-content-muted bg-canvas-surface px-2 py-0.5 rounded border border-canvas-border">
                  Δ = {solutionData.discriminant}
                </span>
              )}
            </div>

            {/* Roots Grid Display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {solutionData.roots.map((root, idx) => (
                <div
                  key={idx}
                  className="bg-canvas-surface border border-canvas-border p-3 rounded-xl flex items-center justify-between"
                >
                  <span className="text-xs font-mono font-bold text-content-secondary">
                    {root.label} =
                  </span>
                  <span className="text-sm font-mono font-bold text-brand-400">
                    {root.value}
                  </span>
                </div>
              ))}
            </div>

            {/* LaTeX Mathematical Formula Representation */}
            <div className="bg-canvas-surface border border-canvas-border rounded-xl p-3 text-center overflow-x-auto whitespace-nowrap scrollbar-none">
              <div
                className="text-xs sm:text-sm font-semibold text-content-primary"
                dangerouslySetInnerHTML={{ __html: renderKaTeX(solutionData.summaryLatex, true) }}
              />
            </div>

            {/* Copy Action Footer */}
            <div className="flex items-center justify-between pt-1 border-t border-canvas-border text-2xs text-content-muted">
              <span>Deterministic exact floating point</span>
              <button
                type="button"
                onClick={copyResultsToClipboard}
                className="inline-flex items-center gap-1 text-content-secondary hover:text-content-primary transition-colors focus-visible:outline-none"
              >
                {copied ? <Check className="w-3 h-3 text-status-success" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied Roots' : 'Copy Roots'}</span>
              </button>
            </div>
          </div>
        ) : (
          !errorMsg && (
            <div className="border border-dashed border-canvas-border rounded-xl p-5 text-center space-y-1.5 bg-canvas-surface/40">
              <Sparkles className="w-4 h-4 text-content-muted mx-auto" />
              <p className="text-xs font-medium text-content-secondary">
                Awaiting coefficients
              </p>
              <p className="text-2xs text-content-muted max-w-xs mx-auto">
                Enter numerical coefficients above and press Solve to evaluate polynomial roots.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
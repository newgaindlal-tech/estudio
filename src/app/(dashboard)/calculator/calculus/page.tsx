'use client';

import React, { useState, useId } from 'react';
import Link from 'next/link';
import katex from 'katex';
import { numericalDerivative, numericalIntegral } from '@/lib/calculator/full-engine';
import { evaluateWithVariables } from '@/lib/calculator/engine';
import {
  ArrowLeft,
  Sigma,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';

export default function CalculusCalculatorPage() {
  const [func, setFunc] = useState('');
  const [lower, setLower] = useState('');
  const [upper, setUpper] = useState('');
  const [point, setPoint] = useState('');
  const [copied, setCopied] = useState(false);

  // Result & Execution States
  const [resultData, setResultData] = useState<{
    type: 'INTEGRAL' | 'DERIVATIVE';
    title: string;
    latex: string;
    value: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const funcInputId = useId();
  const lowerInputId = useId();
  const upperInputId = useId();
  const pointInputId = useId();

  const renderFormulaKaTeX = (latexStr: string, isDisplay = false) => {
    try {
      return katex.renderToString(latexStr, {
        throwOnError: false,
        displayMode: isDisplay,
      });
    } catch {
      return latexStr;
    }
  };

  const handleIntegral = () => {
    setErrorMsg(null);
    try {
      const a = parseFloat(lower);
      const b = parseFloat(upper);

      if (isNaN(a) || isNaN(b)) {
        throw new Error('Integration limits (a and b) must be valid numbers.');
      }

      const val = numericalIntegral((x) => evaluateWithVariables(func, { X: x }), a, b);

      if (isNaN(val) || !isFinite(val)) {
        throw new Error('Integral evaluation diverged or is undefined on this interval.');
      }

      const rounded = Math.round(val * 1e6) / 1e6;
      setResultData({
        type: 'INTEGRAL',
        title: 'Definite Integral',
        latex: `\\int_{${a}}^{${b}} \\left(${func}\\right) dx = ${rounded}`,
        value: String(rounded),
      });
    } catch (e: any) {
      setResultData(null);
      setErrorMsg(e.message || 'Syntax or evaluation error in function f(X).');
    }
  };

  const handleDerivative = () => {
    setErrorMsg(null);
    try {
      const pt = parseFloat(point);

      if (isNaN(pt)) {
        throw new Error('Evaluation point (x = c) must be a valid number.');
      }

      const val = numericalDerivative((x) => evaluateWithVariables(func, { X: x }), pt);

      if (isNaN(val) || !isFinite(val)) {
        throw new Error('Derivative undefined or discontinuous at this point.');
      }

      const rounded = Math.round(val * 1e6) / 1e6;
      setResultData({
        type: 'DERIVATIVE',
        title: 'Point Derivative',
        latex: `\\left. \\frac{d}{dx} \\left(${func}\\right) \\right|_{x=${pt}} = ${rounded}`,
        value: String(rounded),
      });
    } catch (e: any) {
      setResultData(null);
      setErrorMsg(e.message || 'Syntax or evaluation error in function f(X).');
    }
  };

  const copyResult = () => {
    if (!resultData) return;
    navigator.clipboard.writeText(resultData.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-12 select-none">
      {/* Top Wayfinding & Mode Header */}
      <div className="flex items-center justify-between border-b border-canvas-border pb-3">
        <Link
          href="/calculator"
          className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1.5 font-medium outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded px-1 py-0.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Standard Calculator</span>
        </Link>
        <span className="text-2xs font-mono font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded-md">
          MODE: 05 / CALCULUS
        </span>
      </div>

      {/* Main Engineering Workstation Surface */}
      <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-4 sm:p-6 space-y-4 shadow-elevated">
        {/* Title and Purpose */}
        <div className="flex items-center justify-between border-b border-canvas-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/25 flex items-center justify-center text-brand-400">
              <Sigma className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-content-primary">
                Numerical Calculus Engine
              </h1>
              <p className="text-2xs text-content-secondary">
                Gauss-Legendre quadrature integrals & central difference derivatives
              </p>
            </div>
          </div>
        </div>

        {/* Input: Function Expression f(X) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor={funcInputId} className="text-xs font-semibold text-content-secondary">
              Function Target <span className="font-mono text-brand-400">f(X)</span>
            </label>
            <span className="text-2xs text-content-muted">Use uppercase or lowercase X</span>
          </div>

          <div className="relative">
            <input
              id={funcInputId}
              type="text"
              value={func}
              onChange={(e) => setFunc(e.target.value)}
              placeholder="e.g. X^2 - 4"
              className="w-full h-11 px-3.5 rounded-lg bg-canvas-surface border border-canvas-border text-content-primary font-mono text-sm placeholder:text-content-muted outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>
        </div>

        {/* Evaluation Parameters Grid */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <div>
            <label htmlFor={lowerInputId} className="text-2xs font-medium text-content-secondary mb-1 block">
              Lower Bound (a)
            </label>
            <input
              id={lowerInputId}
              type="text"
              value={lower}
              onChange={(e) => setLower(e.target.value)}
              placeholder="0"
              className="w-full h-10 bg-canvas-surface border border-canvas-border rounded-lg text-center font-mono text-xs text-content-primary outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label htmlFor={upperInputId} className="text-2xs font-medium text-content-secondary mb-1 block">
              Upper Bound (b)
            </label>
            <input
              id={upperInputId}
              type="text"
              value={upper}
              onChange={(e) => setUpper(e.target.value)}
              placeholder="0"
              className="w-full h-10 bg-canvas-surface border border-canvas-border rounded-lg text-center font-mono text-xs text-content-primary outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label htmlFor={pointInputId} className="text-2xs font-medium text-content-secondary mb-1 block">
              Deriv Point (x = c)
            </label>
            <input
              id={pointInputId}
              type="text"
              value={point}
              onChange={(e) => setPoint(e.target.value)}
              placeholder="0"
              className="w-full h-10 bg-canvas-surface border border-canvas-border rounded-lg text-center font-mono text-xs text-content-primary outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Action Trigger Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleIntegral}
            className="h-11 rounded-lg bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas-subtle"
          >
            <Sigma className="w-4 h-4" />
            <span>Integrate [a, b]</span>
          </button>
          <button
            type="button"
            onClick={handleDerivative}
            className="h-11 rounded-lg bg-canvas-surface hover:bg-canvas-elevated active:bg-canvas-border border border-canvas-border text-content-primary font-semibold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <span>Differentiate at c</span>
          </button>
        </div>

        {/* Error Alert View */}
        {errorMsg && (
          <div
            role="alert"
            className="bg-status-danger-bg border border-status-danger/30 text-status-danger px-3.5 py-2.5 rounded-lg text-xs flex items-start gap-2 animate-in fade-in duration-150"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-snug">{errorMsg}</div>
          </div>
        )}

        {/* Dynamic Display Zone: Calculated Result vs Guidance Placeholder */}
        {resultData ? (
          <div className="bg-canvas-surface border border-canvas-border rounded-xl p-4 space-y-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-canvas-border/60 pb-2">
              <span className="text-2xs font-bold text-status-success uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {resultData.title} Solved
              </span>
              <button
                type="button"
                onClick={copyResult}
                className="inline-flex items-center gap-1 text-2xs text-content-secondary hover:text-content-primary transition-colors focus-visible:outline-none"
              >
                {copied ? <Check className="w-3 h-3 text-status-success" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Val'}</span>
              </button>
            </div>

            {/* Formatted KaTeX Display */}
            <div
              className="py-2 text-center text-sm sm:text-base font-semibold text-content-primary overflow-x-auto whitespace-nowrap scrollbar-none"
              dangerouslySetInnerHTML={{ __html: renderFormulaKaTeX(resultData.latex, true) }}
            />

            <div className="text-center pt-1 border-t border-canvas-border/40">
              <span className="text-2xs text-content-muted font-mono">
                Numerical Approximation: <b className="text-content-primary">{resultData.value}</b>
              </span>
            </div>
          </div>
        ) : (
          !errorMsg && (
            <div className="border border-dashed border-canvas-border rounded-xl p-5 text-center space-y-1.5 bg-canvas-surface/40">
              <Sparkles className="w-4 h-4 text-content-muted mx-auto" />
              <p className="text-xs font-medium text-content-secondary">
                Ready for computation
              </p>
              <p className="text-2xs text-content-muted max-w-xs mx-auto">
                Set upper/lower limits for definite integration, or pick a point x=c to calculate instantaneous slope.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
'use client';

import React, { useState, useId } from 'react';
import Link from 'next/link';
import katex from 'katex';
import {
  ArrowLeft,
  Activity,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Compass,
} from 'lucide-react';

type AngleUnit = 'DEG' | 'RAD';
type ComplexOperation = 'ALL' | 'MOD' | 'ARG' | 'CONJG' | 'POLAR';

interface ComplexResult {
  modulus: number;
  phaseDeg: number;
  phaseRad: number;
  conjugateStr: string;
  polarStr: string;
  exponentialStr: string;
  latex: string;
}

export default function ComplexCalculatorPage() {
  const [real, setReal] = useState('');
  const [imag, setImag] = useState('');
  const [angleUnit, setAngleUnit] = useState<AngleUnit>('DEG');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<ComplexResult | null>(null);

  const realInputId = useId();
  const imagInputId = useId();

  function calculateComplex(r: number, im: number, unit: AngleUnit): ComplexResult {
    const mod = Math.sqrt(r * r + im * im);
    const rad = Math.atan2(im, r);
    const deg = (rad * 180) / Math.PI;

    const roundMod = Math.round(mod * 1e5) / 1e5;
    const roundDeg = Math.round(deg * 1e4) / 1e4;
    const roundRad = Math.round(rad * 1e4) / 1e4;

    const sign = im >= 0 ? '+' : '-';
    const conjSign = im >= 0 ? '-' : '+';
    const absIm = Math.abs(im);

    const conjugate = `${r} ${conjSign} ${absIm}i`;
    const polar = `${roundMod} \\angle ${unit === 'DEG' ? `${roundDeg}^\\circ` : `${roundRad}\\text{ rad}`}`;
    const exponential = `${roundMod} e^{${roundRad}i}`;

    return {
      modulus: roundMod,
      phaseDeg: roundDeg,
      phaseRad: roundRad,
      conjugateStr: conjugate,
      polarStr: polar,
      exponentialStr: exponential,
      latex: `z = ${r} ${sign} ${absIm}i \\implies |z| = ${roundMod},\\; \\theta = ${unit === 'DEG' ? `${roundDeg}^\\circ` : `${roundRad}\\text{ rad}`}`,
    };
  }

  const handleCompute = (op: ComplexOperation = 'ALL') => {
    setErrorMsg(null);
    const r = parseFloat(real);
    const im = parseFloat(imag);

    if (isNaN(r) || isNaN(im)) {
      setErrorMsg('Both Real (a) and Imaginary (b) parts must be valid numeric values.');
      setResult(null);
      return;
    }

    try {
      const res = calculateComplex(r, im, angleUnit);
      setResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Numerical error evaluating complex parameters.');
      setResult(null);
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-12 select-none">
      {/* Top Wayfinding & Mode Status */}
      <div className="flex items-center justify-between border-b border-canvas-border pb-3">
        <Link
          href="/calculator"
          className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1.5 font-medium outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded px-1 py-0.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Standard Calculator</span>
        </Link>
        <span className="text-2xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-md">
          MODE: 06 / COMPLEX
        </span>
      </div>

      {/* Main Engineering Container */}
      <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-4 sm:p-6 space-y-4 shadow-elevated">
        {/* Title and Controls Header */}
        <div className="flex items-center justify-between border-b border-canvas-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-content-primary">
                Complex Phasor & Vector Engine
              </h1>
              <p className="text-2xs text-content-secondary">
                Rectangular (a + bi) to Polar (θ) & Euler conversions
              </p>
            </div>
          </div>

          {/* Angle Unit Switcher */}
          <div className="flex items-center bg-canvas-surface border border-canvas-border p-0.5 rounded-lg text-2xs font-semibold">
            {(['DEG', 'RAD'] as AngleUnit[]).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => {
                  setAngleUnit(unit);
                  const r = parseFloat(real);
                  const im = parseFloat(imag);
                  if (!isNaN(r) && !isNaN(im)) {
                    setResult(calculateComplex(r, im, unit));
                  }
                }}
                className={`px-2 py-1 rounded transition-colors ${
                  angleUnit === unit
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-content-secondary hover:text-content-primary'
                }`}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>

        {/* Input Coefficients Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor={realInputId} className="text-xs font-semibold text-content-secondary block">
              Real Component <span className="font-mono text-cyan-400">(a)</span>
            </label>
            <input
              id={realInputId}
              type="text"
              value={real}
              onChange={(e) => {
                setReal(e.target.value);
                const r = parseFloat(e.target.value);
                const im = parseFloat(imag);
                if (!isNaN(r) && !isNaN(im)) setResult(calculateComplex(r, im, angleUnit));
                else setResult(null);
              }}
              placeholder="e.g. 3"
              className="w-full h-11 px-3.5 rounded-lg bg-canvas-surface border border-canvas-border text-content-primary font-mono text-sm placeholder:text-content-muted outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor={imagInputId} className="text-xs font-semibold text-content-secondary block">
              Imaginary Part <span className="font-mono text-cyan-400">(b in bi)</span>
            </label>
            <input
              id={imagInputId}
              type="text"
              value={imag}
              onChange={(e) => {
                setImag(e.target.value);
                const r = parseFloat(real);
                const im = parseFloat(e.target.value);
                if (!isNaN(r) && !isNaN(im)) setResult(calculateComplex(r, im, angleUnit));
                else setResult(null);
              }}
              placeholder="e.g. 4"
              className="w-full h-11 px-3.5 rounded-lg bg-canvas-surface border border-canvas-border text-content-primary font-mono text-sm placeholder:text-content-muted outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
            />
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div
            role="alert"
            className="bg-status-danger-bg border border-status-danger/30 text-status-danger px-3.5 py-2.5 rounded-lg text-xs flex items-start gap-2 animate-in fade-in duration-150"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-snug">{errorMsg}</div>
          </div>
        )}

        {/* Structured Multi-Format Telemetry View */}
        {result && (
          <div className="space-y-3 pt-1">
            {/* Live KaTeX Representation */}
            <div className="bg-canvas-surface border border-canvas-border rounded-xl p-3 text-center overflow-x-auto whitespace-nowrap scrollbar-none">
              <div
                className="text-xs sm:text-sm font-semibold text-content-primary"
                dangerouslySetInnerHTML={{ __html: renderKaTeX(result.latex, false) }}
              />
            </div>

            {/* Metrics Inspection Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              {/* Modulus */}
              <div className="bg-canvas-surface border border-canvas-border p-2.5 rounded-xl flex flex-col justify-between">
                <span className="text-2xs font-bold text-content-muted uppercase tracking-wider block">
                  |z| Modulus
                </span>
                <span className="text-base font-bold text-cyan-400 font-mono mt-1">
                  {result.modulus}
                </span>
                <span className="text-2xs text-content-muted mt-0.5">Magnitude</span>
              </div>

              {/* Argument */}
              <div className="bg-canvas-surface border border-canvas-border p-2.5 rounded-xl flex flex-col justify-between">
                <span className="text-2xs font-bold text-content-muted uppercase tracking-wider block">
                  arg(z) Phase
                </span>
                <span className="text-base font-bold text-cyan-400 font-mono mt-1">
                  {angleUnit === 'DEG' ? `${result.phaseDeg}°` : `${result.phaseRad} rad`}
                </span>
                <span className="text-2xs text-content-muted mt-0.5">Angle θ</span>
              </div>

              {/* Conjugate */}
              <div className="bg-canvas-surface border border-canvas-border p-2.5 rounded-xl flex flex-col justify-between">
                <span className="text-2xs font-bold text-content-muted uppercase tracking-wider block">
                  z̄ Conjugate
                </span>
                <span className="text-sm font-bold text-content-primary font-mono mt-1 truncate">
                  {result.conjugateStr}
                </span>
                <span className="text-2xs text-content-muted mt-0.5">Reflection</span>
              </div>

              {/* Polar Phasor */}
              <div className="bg-canvas-surface border border-canvas-border p-2.5 rounded-xl flex flex-col justify-between">
                <span className="text-2xs font-bold text-content-muted uppercase tracking-wider block">
                  Euler / Polar
                </span>
                <span className="text-xs font-bold text-emerald-400 font-mono mt-1 truncate">
                  {result.exponentialStr}
                </span>
                <span className="text-2xs text-content-muted mt-0.5">Exponential</span>
              </div>
            </div>

            {/* Quick Action Copy Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-canvas-border text-2xs text-content-muted">
              <span>Phasor format: <code className="text-content-primary">{result.modulus} ∠ {angleUnit === 'DEG' ? `${result.phaseDeg}°` : `${result.phaseRad} rad`}</code></span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `${result.modulus} ∠ ${angleUnit === 'DEG' ? `${result.phaseDeg} deg` : `${result.phaseRad} rad`}`
                  )
                }
                className="inline-flex items-center gap-1 text-content-secondary hover:text-content-primary transition-colors focus-visible:outline-none"
              >
                {copied ? <Check className="w-3 h-3 text-status-success" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied Phasor' : 'Copy Phasor'}</span>
              </button>
            </div>
          </div>
        )}

        {!result && !errorMsg && (
          <div className="border border-dashed border-canvas-border rounded-xl p-5 text-center space-y-1.5 bg-canvas-surface/40">
            <Compass className="w-4 h-4 text-content-muted mx-auto" />
            <p className="text-xs font-medium text-content-secondary">
              Awaiting coefficients
            </p>
            <p className="text-2xs text-content-muted max-w-xs mx-auto">
              Supply Real (a) and Imaginary (b) coordinates to evaluate modulus, argument, and conjugate forms.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

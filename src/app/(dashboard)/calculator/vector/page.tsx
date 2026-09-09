'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import katex from 'katex';
import { VectorEngine } from '@/lib/calculator/full-engine';
import {
  ArrowLeft,
  Compass,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface VectorResultPayload {
  title: string;
  latex: string;
  rawText: string;
  isScalar: boolean;
}

export default function VectorCalculatorPage() {
  const [vecU, setVecU] = useState<[number, number, number]>([0, 0, 0]);
  const [vecV, setVecV] = useState<[number, number, number]>([0, 0, 0]);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultData, setResultData] = useState<VectorResultPayload | null>(null);

  const handleCoordinateChange = (
    target: 'U' | 'V',
    idx: 0 | 1 | 2,
    valStr: string
  ) => {
    const val = parseFloat(valStr) || 0;
    if (target === 'U') {
      const next: [number, number, number] = [...vecU];
      next[idx] = val;
      setVecU(next);
    } else {
      const next: [number, number, number] = [...vecV];
      next[idx] = val;
      setVecV(next);
    }
  };

  const vectorToLatex = (v: [number, number, number]): string => {
    const [x, y, z] = v.map((n) => Math.round(n * 1e4) / 1e4);
    const signY = y >= 0 ? '+' : '-';
    const signZ = z >= 0 ? '+' : '-';
    return `${x}\\mathbf{\\hat{i}} ${signY} ${Math.abs(y)}\\mathbf{\\hat{j}} ${signZ} ${Math.abs(z)}\\mathbf{\\hat{k}}`;
  };

  const handleDot = () => {
    setErrorMsg(null);
    try {
      const res = VectorEngine.dot(vecU, vecV);
      const rounded = Math.round(res * 1e5) / 1e5;
      setResultData({
        title: 'Dot Product (u · v)',
        latex: `\\mathbf{u} \\cdot \\mathbf{v} = ${rounded}`,
        rawText: `u · v = ${rounded}`,
        isScalar: true,
      });
    } catch (e: any) {
      setResultData(null);
      setErrorMsg(e.message || 'Error evaluating dot product.');
    }
  };

  const handleCross = () => {
    setErrorMsg(null);
    try {
      const [x, y, z] = VectorEngine.cross(vecU, vecV);
      const crossVec: [number, number, number] = [
        Math.round(x * 1e5) / 1e5,
        Math.round(y * 1e5) / 1e5,
        Math.round(z * 1e5) / 1e5,
      ];
      setResultData({
        title: 'Cross Product (u × v)',
        latex: `\\mathbf{u} \\times \\mathbf{v} = ${vectorToLatex(crossVec)}`,
        rawText: `u × v = (${crossVec.join(', ')})`,
        isScalar: false,
      });
    } catch (e: any) {
      setResultData(null);
      setErrorMsg(e.message || 'Error evaluating cross product.');
    }
  };

  const handleMagnitude = () => {
    setErrorMsg(null);
    try {
      const mU = Math.round(VectorEngine.mag(vecU) * 1e5) / 1e5;
      const mV = Math.round(VectorEngine.mag(vecV) * 1e5) / 1e5;
      setResultData({
        title: 'Vector Magnitudes',
        latex: `|\\mathbf{u}| = ${mU},\\quad |\\mathbf{v}| = ${mV}`,
        rawText: `|u| = ${mU}, |v| = ${mV}`,
        isScalar: true,
      });
    } catch (e: any) {
      setResultData(null);
      setErrorMsg(e.message || 'Error evaluating magnitudes.');
    }
  };

  const handleAngle = () => {
    setErrorMsg(null);
    try {
      const mU = VectorEngine.mag(vecU);
      const mV = VectorEngine.mag(vecV);
      if (mU === 0 || mV === 0) {
        throw new Error('Cannot calculate angle with a zero vector (magnitude = 0).');
      }
      const dot = VectorEngine.dot(vecU, vecV);
      const cosTheta = Math.min(1, Math.max(-1, dot / (mU * mV)));
      const rad = Math.acos(cosTheta);
      const deg = Math.round(((rad * 180) / Math.PI) * 1e4) / 1e4;
      const roundedRad = Math.round(rad * 1e4) / 1e4;

      setResultData({
        title: 'Angle Between Vectors (θ)',
        latex: `\\theta = ${deg}^\\circ \\; (${roundedRad}\\text{ rad})`,
        rawText: `θ = ${deg}° (${roundedRad} rad)`,
        isScalar: true,
      });
    } catch (e: any) {
      setResultData(null);
      setErrorMsg(e.message || 'Error evaluating angle.');
    }
  };

  const handleUnitVectors = () => {
    setErrorMsg(null);
    try {
      const mU = VectorEngine.mag(vecU);
      const mV = VectorEngine.mag(vecV);
      if (mU === 0 || mV === 0) {
        throw new Error('Zero vectors do not possess a defined unit vector direction.');
      }
      const uHat: [number, number, number] = [vecU[0] / mU, vecU[1] / mU, vecU[2] / mU];
      const vHat: [number, number, number] = [vecV[0] / mV, vecV[1] / mV, vecV[2] / mV];

      setResultData({
        title: 'Normalized Unit Vectors (û, v̂)',
        latex: `\\mathbf{\\hat{u}} = ${vectorToLatex(uHat)}\\\\\\mathbf{\\hat{v}} = ${vectorToLatex(vHat)}`,
        rawText: `u_hat = (${uHat.map((n) => n.toFixed(3)).join(', ')}), v_hat = (${vHat.map((n) => n.toFixed(3)).join(', ')})`,
        isScalar: false,
      });
    } catch (e: any) {
      setResultData(null);
      setErrorMsg(e.message || 'Error generating unit vectors.');
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

  const copyResults = () => {
    if (!resultData) return;
    navigator.clipboard.writeText(resultData.rawText);
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
        <span className="text-2xs font-mono font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-md">
          MODE: 03 / VECTOR
        </span>
      </div>

      {/* Main Engineering Container */}
      <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-4 sm:p-6 space-y-4 shadow-elevated">
        {/* Title and Purpose */}
        <div className="flex items-center justify-between border-b border-canvas-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-content-primary">
                3D Vector Geometry Engine
              </h1>
              <p className="text-2xs text-content-secondary">
                Orthogonal projections, dot & cross products, and angular separation
              </p>
            </div>
          </div>
        </div>

        {/* Vector Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Vector U */}
          <div className="space-y-1.5 bg-canvas-surface/60 p-3 rounded-xl border border-canvas-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-content-secondary">
                Vector <b className="text-violet-400 font-mono">u</b> (x, y, z)
              </span>
              <span className="text-2xs font-mono text-content-muted">|u| = {VectorEngine.mag(vecU).toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['x', 'y', 'z'] as const).map((axis, i) => (
                <div key={axis} className="relative">
                  <input
                    type="number"
                    step="any"
                    value={vecU[i as 0 | 1 | 2]}
                    onChange={(e) => handleCoordinateChange('U', i as 0 | 1 | 2, e.target.value)}
                    placeholder="0"
                    className="h-10 w-full bg-canvas-subtle border border-canvas-border focus:border-violet-400 focus:ring-1 focus:ring-violet-400 rounded-lg text-center font-mono text-xs text-content-primary outline-none transition-all"
                    aria-label={`Vector u coordinate ${axis}`}
                  />
                  <span className="absolute bottom-1 right-1 text-2xs text-content-muted font-mono pointer-events-none">
                    {axis}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Vector V */}
          <div className="space-y-1.5 bg-canvas-surface/60 p-3 rounded-xl border border-canvas-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-content-secondary">
                Vector <b className="text-brand-400 font-mono">v</b> (x, y, z)
              </span>
              <span className="text-2xs font-mono text-content-muted">|v| = {VectorEngine.mag(vecV).toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['x', 'y', 'z'] as const).map((axis, i) => (
                <div key={axis} className="relative">
                  <input
                    type="number"
                    step="any"
                    value={vecV[i as 0 | 1 | 2]}
                    onChange={(e) => handleCoordinateChange('V', i as 0 | 1 | 2, e.target.value)}
                    placeholder="0"
                    className="h-10 w-full bg-canvas-subtle border border-canvas-border focus:border-brand-400 focus:ring-1 focus:ring-brand-400 rounded-lg text-center font-mono text-xs text-content-primary outline-none transition-all"
                    aria-label={`Vector v coordinate ${axis}`}
                  />
                  <span className="absolute bottom-1 right-1 text-2xs text-content-muted font-mono pointer-events-none">
                    {axis}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vector Operations Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDot}
            className="h-10 rounded-lg bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-xs transition-colors shadow-sm flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            u · v (Dot)
          </button>
          <button
            type="button"
            onClick={handleCross}
            className="h-10 rounded-lg bg-canvas-surface hover:bg-canvas-elevated active:bg-canvas-border border border-canvas-border text-content-primary font-semibold text-xs transition-colors shadow-sm flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            u × v (Cross)
          </button>
          <button
            type="button"
            onClick={handleMagnitude}
            className="h-10 rounded-lg bg-canvas-surface hover:bg-canvas-elevated active:bg-canvas-border border border-canvas-border text-content-primary font-semibold text-xs transition-colors shadow-sm flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            |u|, |v| (Norm)
          </button>
          <button
            type="button"
            onClick={handleAngle}
            className="h-10 rounded-lg bg-canvas-surface hover:bg-canvas-elevated active:bg-canvas-border border border-canvas-border text-content-primary font-semibold text-xs transition-colors shadow-sm flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Angle θ
          </button>
          <button
            type="button"
            onClick={handleUnitVectors}
            className="h-10 col-span-2 sm:col-span-1 rounded-lg bg-canvas-surface hover:bg-canvas-elevated active:bg-canvas-border border border-canvas-border text-content-primary font-semibold text-xs transition-colors shadow-sm flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            û, v̂ (Units)
          </button>
        </div>

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

        {/* Output Telemetry Card */}
        {resultData ? (
          <div className="bg-canvas-surface border border-canvas-border rounded-xl p-4 space-y-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-canvas-border/60 pb-2">
              <span className="text-2xs font-bold text-status-success uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {resultData.title}
              </span>
              <button
                type="button"
                onClick={copyResults}
                className="inline-flex items-center gap-1 text-2xs text-content-secondary hover:text-content-primary transition-colors focus-visible:outline-none"
              >
                {copied ? <Check className="w-3 h-3 text-status-success" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Rendered Mathematical Solution */}
            <div
              className="py-2 text-center text-sm sm:text-base font-semibold text-content-primary overflow-x-auto whitespace-nowrap scrollbar-none"
              dangerouslySetInnerHTML={{ __html: renderKaTeX(resultData.latex, true) }}
            />

            <div className="pt-2 border-t border-canvas-border/40 text-center">
              <span className="text-2xs font-mono text-content-muted">
                3D Cartesian Basis Euclidean Vector Space (ℝ³)
              </span>
            </div>
          </div>
        ) : (
          !errorMsg && (
            <div className="border border-dashed border-canvas-border rounded-xl p-5 text-center space-y-1.5 bg-canvas-surface/40">
              <Sparkles className="w-4 h-4 text-content-muted mx-auto" />
              <p className="text-xs font-medium text-content-secondary">
                Vectors u & v configured
              </p>
              <p className="text-2xs text-content-muted max-w-xs mx-auto">
                Select an operation above to evaluate the scalar dot product, vector cross product, angular separation, or unit norms.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
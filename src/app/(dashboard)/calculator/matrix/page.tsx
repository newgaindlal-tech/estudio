'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import katex from 'katex';
import { MatrixEngine, floatToFraction } from '@/lib/calculator/full-engine';
import {
  ArrowLeft,
  Layers,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

type MatrixDimension = 2 | 3;

interface MatrixResultPayload {
  title: string;
  latex: string;
  rawText: string;
  isScalar?: boolean;
}

export default function MatrixCalculatorPage() {
  const [dimension, setDimension] = useState<MatrixDimension>(3);
  const [mat, setMat] = useState<number[][]>([
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]);
  const [showFractions, setShowFractions] = useState(false);
  const [resultData, setResultData] = useState<MatrixResultPayload | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Input refs grid for arrow-key navigation
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ]);

  const handleCellChange = (r: number, c: number, valueStr: string) => {
    const val = parseFloat(valueStr) || 0;
    setMat((prev) =>
      prev.map((row, rowIdx) =>
        row.map((cell, colIdx) => (rowIdx === r && colIdx === c ? val : cell))
      )
    );
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    r: number,
    c: number
  ) => {
    if (e.key === 'ArrowRight' && c < dimension - 1) {
      inputRefs.current[r][c + 1]?.focus();
    } else if (e.key === 'ArrowLeft' && c > 0) {
      inputRefs.current[r][c - 1]?.focus();
    } else if (e.key === 'ArrowDown' && r < dimension - 1) {
      inputRefs.current[r + 1][c]?.focus();
    } else if (e.key === 'ArrowUp' && r > 0) {
      inputRefs.current[r - 1][c]?.focus();
    }
  };

  const handleDimensionChange = (dim: MatrixDimension) => {
    setDimension(dim);
    setErrorMsg(null);
    setResultData(null);
    if (dim === 2) {
      setMat([
        [mat[0][0] ?? 0, mat[0][1] ?? 0],
        [mat[1][0] ?? 0, mat[1][1] ?? 0],
      ]);
    } else {
      setMat([
        [mat[0][0] ?? 0, mat[0][1] ?? 0, 0],
        [mat[1][0] ?? 0, mat[1][1] ?? 0, 0],
        [0, 0, 0],
      ]);
    }
  };

  const resetToZero = () => {
    setMat(
      Array.from({ length: dimension }, () =>
        Array.from({ length: dimension }, () => 0)
      )
    );
    setResultData(null);
    setErrorMsg(null);
  };

  const formatCellValue = (val: number, fractions = false): string => {
    if (!fractions) return `${Math.round(val * 1e4) / 1e4}`;
    try {
      const f = floatToFraction(val, 1000);
      return f.d === 1n ? `${f.n}` : `\\frac{${f.n}}{${f.d}}`;
    } catch {
      return `${Math.round(val * 1e4) / 1e4}`;
    }
  };

  const matrixToLatex = (matrix: number[][], fractions = false) => {
    const rows = matrix
      .map((row) => row.map((v) => formatCellValue(v, fractions)).join(' & '))
      .join(' \\\\ ');
    return `\\begin{bmatrix} ${rows} \\end{bmatrix}`;
  };

  const matrixToRawString = (matrix: number[][]) => {
    return matrix
      .map((row) => `[ ${row.map((v) => Math.round(v * 1e4) / 1e4).join(', ')} ]`)
      .join('\n');
  };

  const safeTranspose = (m: number[][]): number[][] => {
    if (typeof MatrixEngine.transpose === 'function') {
      return MatrixEngine.transpose(m);
    }
    return m[0].map((_, colIndex) => m.map((row) => row[colIndex]));
  };

  const handleDeterminant = () => {
    setErrorMsg(null);
    try {
      const activeMat = dimension === 2 ? mat.slice(0, 2).map((r) => r.slice(0, 2)) : mat;
      const d = MatrixEngine.det(activeMat);
      const rounded = Math.round(d * 1e5) / 1e5;
      setResultData({
        title: 'Determinant det(A)',
        latex: `\\det(A) = ${rounded}`,
        rawText: `det(A) = ${rounded}`,
        isScalar: true,
      });
    } catch (e: any) {
      setResultData(null);
      setErrorMsg(e.message || 'Error computing matrix determinant.');
    }
  };

  const handleInverse = () => {
    setErrorMsg(null);
    try {
      const activeMat = dimension === 2 ? mat.slice(0, 2).map((r) => r.slice(0, 2)) : mat;
      const d = MatrixEngine.det(activeMat);
      if (Math.abs(d) < 1e-12) {
        throw new Error('Matrix is singular (det = 0). An inverse does not exist.');
      }
      const inv = MatrixEngine.inverse(activeMat);
      setResultData({
        title: 'Inverse Matrix A⁻¹',
        latex: `A^{-1} = ${matrixToLatex(inv, showFractions)}`,
        rawText: matrixToRawString(inv),
        isScalar: false,
      });
    } catch (e: any) {
      setResultData(null);
      setErrorMsg(e.message || 'Matrix cannot be inverted.');
    }
  };

  const handleTranspose = () => {
    setErrorMsg(null);
    try {
      const activeMat = dimension === 2 ? mat.slice(0, 2).map((r) => r.slice(0, 2)) : mat;
      const tr = safeTranspose(activeMat);
      setResultData({
        title: 'Transpose Matrix Aᵀ',
        latex: `A^T = ${matrixToLatex(tr, false)}`,
        rawText: matrixToRawString(tr),
        isScalar: false,
      });
    } catch (e: any) {
      setResultData(null);
      setErrorMsg(e.message || 'Error transposing matrix.');
    }
  };

  const handleTrace = () => {
    setErrorMsg(null);
    try {
      const activeMat = dimension === 2 ? mat.slice(0, 2).map((r) => r.slice(0, 2)) : mat;
      const tr =
        typeof MatrixEngine.trace === 'function'
          ? MatrixEngine.trace(activeMat)
          : activeMat.reduce((sum, row, idx) => sum + row[idx], 0);
      const rounded = Math.round(tr * 1e5) / 1e5;
      setResultData({
        title: 'Matrix Trace tr(A)',
        latex: `\\text{tr}(A) = ${rounded}`,
        rawText: `tr(A) = ${rounded}`,
        isScalar: true,
      });
    } catch (e: any) {
      setResultData(null);
      setErrorMsg(e.message || 'Error evaluating trace.');
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
    if (!resultData) return;
    navigator.clipboard.writeText(resultData.rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const activeRows = mat.slice(0, dimension);

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
        <span className="text-2xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md">
          MODE: 02 / MATRIX
        </span>
      </div>

      {/* Main Engineering Container */}
      <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-4 sm:p-6 space-y-4 shadow-elevated">
        {/* Title and Dimension Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-canvas-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-content-primary">
                Matrix Algebra Engine
              </h1>
              <p className="text-2xs text-content-secondary">
                Determinants, adjugate inversion, and structural transformations
              </p>
            </div>
          </div>

          {/* Dimension Selector Tabs */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center bg-canvas-surface border border-canvas-border p-0.5 rounded-lg text-2xs font-semibold">
              <button
                type="button"
                onClick={() => handleDimensionChange(2)}
                className={`px-3 py-1.5 rounded transition-colors ${
                  dimension === 2
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-content-secondary hover:text-content-primary'
                }`}
              >
                2×2
              </button>
              <button
                type="button"
                onClick={() => handleDimensionChange(3)}
                className={`px-3 py-1.5 rounded transition-colors ${
                  dimension === 3
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-content-secondary hover:text-content-primary'
                }`}
              >
                3×3
              </button>
            </div>

            <button
              type="button"
              onClick={resetToZero}
              title="Reset matrix to zeros"
              className="p-1.5 rounded-lg bg-canvas-surface border border-canvas-border text-content-muted hover:text-content-primary transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Matrix Grid Input Area with Bracket Accents */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-2xs text-content-muted">
            <span>Matrix A ({dimension}×{dimension})</span>
            <span>Use Arrow Keys or Tab to navigate</span>
          </div>

          <div className="relative py-2 px-3 bg-canvas-surface/70 rounded-xl border border-canvas-border">
            {/* Left Bracket Stroke */}
            <div className="absolute left-2 top-3 bottom-3 w-1.5 border-l-2 border-t-2 border-b-2 border-indigo-400/60 rounded-l-sm" />

            <div
              className="grid gap-2 max-w-[280px] mx-auto"
              style={{
                gridTemplateColumns: `repeat(${dimension}, minmax(0, 1fr))`,
              }}
            >
              {activeRows.map((row, r) =>
                row.slice(0, dimension).map((val, c) => (
                  <input
                    key={`${r}-${c}`}
                    ref={(el) => {
                      inputRefs.current[r][c] = el;
                    }}
                    type="number"
                    step="any"
                    value={val}
                    onChange={(e) => handleCellChange(r, c, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, r, c)}
                    className="h-11 w-full bg-canvas-subtle border border-canvas-border focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-lg text-center font-mono text-sm text-content-primary outline-none transition-all"
                    aria-label={`Matrix element A row ${r + 1} column ${c + 1}`}
                  />
                ))
              )}
            </div>

            {/* Right Bracket Stroke */}
            <div className="absolute right-2 top-3 bottom-3 w-1.5 border-r-2 border-t-2 border-b-2 border-indigo-400/60 rounded-r-sm" />
          </div>
        </div>

        {/* Matrix Operations Button Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDeterminant}
            className="h-10 rounded-lg bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            det(A)
          </button>
          <button
            type="button"
            onClick={handleInverse}
            className="h-10 rounded-lg bg-canvas-surface hover:bg-canvas-elevated active:bg-canvas-border border border-canvas-border text-content-primary font-semibold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            A⁻¹ (Inverse)
          </button>
          <button
            type="button"
            onClick={handleTranspose}
            className="h-10 rounded-lg bg-canvas-surface hover:bg-canvas-elevated active:bg-canvas-border border border-canvas-border text-content-primary font-semibold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Aᵀ (Transpose)
          </button>
          <button
            type="button"
            onClick={handleTrace}
            className="h-10 rounded-lg bg-canvas-surface hover:bg-canvas-elevated active:bg-canvas-border border border-canvas-border text-content-primary font-semibold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            tr(A) (Trace)
          </button>
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

        {/* Output Presentation Screen */}
        {resultData ? (
          <div className="bg-canvas-surface border border-canvas-border rounded-xl p-4 space-y-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-canvas-border/60 pb-2">
              <span className="text-2xs font-bold text-status-success uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {resultData.title}
              </span>

              <div className="flex items-center gap-2">
                {!resultData.isScalar && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowFractions(!showFractions);
                      handleInverse();
                    }}
                    className="text-2xs font-mono px-2 py-0.5 rounded border border-canvas-border bg-canvas-subtle hover:text-content-primary text-content-secondary transition-colors"
                  >
                    {showFractions ? 'Fractions: ON' : 'Fractions: OFF'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={copyResultsToClipboard}
                  className="inline-flex items-center gap-1 text-2xs text-content-secondary hover:text-content-primary transition-colors focus-visible:outline-none"
                >
                  {copied ? <Check className="w-3 h-3 text-status-success" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* LaTeX Rendered Result */}
            <div
              className="py-2 text-center text-sm sm:text-base font-semibold text-content-primary overflow-x-auto whitespace-nowrap scrollbar-none"
              dangerouslySetInnerHTML={{ __html: renderKaTeX(resultData.latex, true) }}
            />

            {!resultData.isScalar && (
              <div className="pt-2 border-t border-canvas-border/40 text-center">
                <span className="text-2xs font-mono text-content-muted">
                  Double-precision IEEE 754 matrix output
                </span>
              </div>
            )}
          </div>
        ) : (
          !errorMsg && (
            <div className="border border-dashed border-canvas-border rounded-xl p-5 text-center space-y-1.5 bg-canvas-surface/40">
              <Sparkles className="w-4 h-4 text-content-muted mx-auto" />
              <p className="text-xs font-medium text-content-secondary">
                Matrix A configured
              </p>
              <p className="text-2xs text-content-muted max-w-xs mx-auto">
                Click an operation button above to calculate the determinant, inverse, transpose, or trace.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
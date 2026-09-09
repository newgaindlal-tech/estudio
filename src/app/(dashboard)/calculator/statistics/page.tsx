'use client';

import React, { useState, useMemo, useId } from 'react';
import Link from 'next/link';
import katex from 'katex';
import {
  ArrowLeft,
  Table as TableIcon,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ArrowDownUp,
  BarChart3,
} from 'lucide-react';

interface StatsResult {
  n: number;
  sum: number;
  sumSq: number;
  mean: number;
  popVar: number;
  popSD: number;
  sampVar: number;
  sampSD: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  iqr: number;
  range: number;
}

export default function StatisticsCalculatorPage() {
  const [dataInput, setDataInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputId = useId();

  // Helper for computing quartiles (Method: Type 7 standard)
  const computeQuartile = (sorted: number[], q: 0.25 | 0.5 | 0.75): number => {
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    }
    return sorted[base];
  };

  const calculateStats = (rawString: string): StatsResult => {
    const vals = rawString
      .split(/[\s,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map(Number)
      .filter((n) => !isNaN(n));

    if (vals.length === 0) {
      throw new Error('Please provide at least one valid numeric data point.');
    }

    const n = vals.length;
    const sum = vals.reduce((a, b) => a + b, 0);
    const sumSq = vals.reduce((a, b) => a + b * b, 0);
    const mean = sum / n;

    const popVar = vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
    const sampVar = n > 1 ? vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1) : 0;

    const sorted = [...vals].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const range = max - min;

    const median = computeQuartile(sorted, 0.5);
    const q1 = computeQuartile(sorted, 0.25);
    const q3 = computeQuartile(sorted, 0.75);
    const iqr = q3 - q1;

    return {
      n,
      sum: Math.round(sum * 1e5) / 1e5,
      sumSq: Math.round(sumSq * 1e5) / 1e5,
      mean: Math.round(mean * 1e5) / 1e5,
      popVar: Math.round(popVar * 1e5) / 1e5,
      popSD: Math.round(Math.sqrt(popVar) * 1e5) / 1e5,
      sampVar: Math.round(sampVar * 1e5) / 1e5,
      sampSD: Math.round(Math.sqrt(sampVar) * 1e5) / 1e5,
      min,
      q1: Math.round(q1 * 1e5) / 1e5,
      median: Math.round(median * 1e5) / 1e5,
      q3: Math.round(q3 * 1e5) / 1e5,
      max,
      iqr: Math.round(iqr * 1e5) / 1e5,
      range: Math.round(range * 1e5) / 1e5,
    };
  };

  const [output, setOutput] = useState<StatsResult | null>(null);

  const parsedCount = useMemo(() => {
    return dataInput
      .split(/[\s,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !isNaN(Number(s))).length;
  }, [dataInput]);

  const handleAnalyze = () => {
    setErrorMsg(null);
    try {
      const res = calculateStats(dataInput);
      setOutput(res);
    } catch (e: any) {
      setOutput(null);
      setErrorMsg(e.message || 'Error processing dataset.');
    }
  };

  const handleSort = (order: 'asc' | 'desc') => {
    const vals = dataInput
      .split(/[\s,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map(Number)
      .filter((n) => !isNaN(n));

    if (vals.length === 0) return;
    vals.sort((a, b) => (order === 'asc' ? a - b : b - a));
    const sortedStr = vals.join(', ');
    setDataInput(sortedStr);
    try {
      setOutput(calculateStats(sortedStr));
    } catch {}
  };

  const renderKaTeX = (latexStr: string) => {
    try {
      return katex.renderToString(latexStr, { throwOnError: false });
    } catch {
      return latexStr;
    }
  };

  const copyResultsToClipboard = () => {
    if (!output) return;
    const summary = [
      `1-Variable Statistics:`,
      `Sample Size (n): ${output.n}`,
      `Mean (x̄): ${output.mean}`,
      `Sum (∑x): ${output.sum}`,
      `Sum of Squares (∑x²): ${output.sumSq}`,
      `Sample SD (sx): ${output.sampSD}`,
      `Population SD (σx): ${output.popSD}`,
      `Min: ${output.min}, Q1: ${output.q1}, Median: ${output.median}, Q3: ${output.q3}, Max: ${output.max}`,
      `IQR: ${output.iqr}, Range: ${output.range}`,
    ].join('\n');

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-12 select-none">
      {/* Top Wayfinding Header */}
      <div className="flex items-center justify-between border-b border-canvas-border pb-3">
        <Link
          href="/calculator"
          className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1.5 font-medium outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded px-1 py-0.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Standard Calculator</span>
        </Link>
        <span className="text-2xs font-mono font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded-md">
          MODE: 07 / STAT
        </span>
      </div>

      {/* Main Container Card */}
      <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-4 sm:p-6 space-y-4 shadow-elevated">
        {/* Title and Telemetry Header */}
        <div className="flex items-center justify-between border-b border-canvas-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-teal-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-content-primary">
                1-Variable Statistical Engine
              </h1>
              <p className="text-2xs text-content-secondary">
                Dispersion metrics, sample variance, and five-number summary
              </p>
            </div>
          </div>

          <span className="text-2xs font-mono text-content-muted bg-canvas-surface border border-canvas-border px-2 py-1 rounded-md">
            {parsedCount} items
          </span>
        </div>

        {/* Dataset Input Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor={inputId} className="text-xs font-semibold text-content-secondary">
              Input Dataset <span className="text-content-muted font-normal">(comma, space, or newline separated)</span>
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleSort('asc')}
                className="text-2xs text-content-secondary hover:text-content-primary px-1.5 py-0.5 rounded bg-canvas-surface border border-canvas-border flex items-center gap-1"
                title="Sort ascending"
              >
                <ArrowDownUp className="w-2.5 h-2.5" />
                Sort Asc
              </button>
            </div>
          </div>

          <textarea
            id={inputId}
            rows={3}
            value={dataInput}
            onChange={(e) => setDataInput(e.target.value)}
            placeholder="e.g. 4, 6, 8, 10, 12, 14, 16"
            className="w-full p-3 rounded-lg bg-canvas-surface border border-canvas-border text-content-primary font-mono text-xs placeholder:text-content-muted outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors resize-none"
          />
        </div>

        {/* Compute Action Button */}
        <button
          type="button"
          onClick={handleAnalyze}
          className="w-full h-11 rounded-lg bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-xs transition-colors shadow-sm flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Compute Statistical Telemetry</span>
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

        {/* Results Presentation Grid */}
        {output ? (
          <div className="space-y-3 pt-1 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Telemetry */}
            <div className="flex items-center justify-between border-b border-canvas-border pb-2">
              <span className="text-2xs font-bold text-status-success uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Distribution Evaluated (n = {output.n})
              </span>
              <button
                type="button"
                onClick={copyResultsToClipboard}
                className="inline-flex items-center gap-1 text-2xs text-content-secondary hover:text-content-primary transition-colors focus-visible:outline-none"
              >
                {copied ? <Check className="w-3 h-3 text-status-success" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied Summary' : 'Copy All'}</span>
              </button>
            </div>

            {/* Central Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Mean */}
              <div className="bg-canvas-surface border border-canvas-border p-2.5 rounded-xl flex flex-col justify-between text-center">
                <span
                  className="text-2xs font-semibold text-content-muted"
                  dangerouslySetInnerHTML={{ __html: renderKaTeX('\\text{Mean } \\bar{x}') }}
                />
                <span className="text-base font-bold text-teal-400 font-mono mt-1">
                  {output.mean}
                </span>
                <span className="text-2xs text-content-muted">Average</span>
              </div>

              {/* Sample SD */}
              <div className="bg-canvas-surface border border-canvas-border p-2.5 rounded-xl flex flex-col justify-between text-center">
                <span
                  className="text-2xs font-semibold text-content-muted"
                  dangerouslySetInnerHTML={{ __html: renderKaTeX('\\text{Sample } s_x') }}
                />
                <span className="text-base font-bold text-brand-400 font-mono mt-1">
                  {output.sampSD}
                </span>
                <span className="text-2xs text-content-muted">n-1 Weight</span>
              </div>

              {/* Population SD */}
              <div className="bg-canvas-surface border border-canvas-border p-2.5 rounded-xl flex flex-col justify-between text-center">
                <span
                  className="text-2xs font-semibold text-content-muted"
                  dangerouslySetInnerHTML={{ __html: renderKaTeX('\\text{Pop } \\sigma_x') }}
                />
                <span className="text-base font-bold text-brand-400 font-mono mt-1">
                  {output.popSD}
                </span>
                <span className="text-2xs text-content-muted">N Weight</span>
              </div>

              {/* Sum of Values */}
              <div className="bg-canvas-surface border border-canvas-border p-2.5 rounded-xl flex flex-col justify-between text-center">
                <span
                  className="text-2xs font-semibold text-content-muted"
                  dangerouslySetInnerHTML={{ __html: renderKaTeX('\\sum x') }}
                />
                <span className="text-base font-bold text-content-primary font-mono mt-1">
                  {output.sum}
                </span>
                <span className="text-2xs text-content-muted">Total Sum</span>
              </div>
            </div>

            {/* Five-Number Summary Sub-Section */}
            <div className="bg-canvas-surface border border-canvas-border rounded-xl p-3 space-y-2">
              <span className="text-2xs font-bold text-content-muted uppercase tracking-wider block">
                Five-Number Boxplot Summary
              </span>
              <div className="grid grid-cols-5 gap-1 text-center font-mono">
                <div className="p-1 rounded bg-canvas-subtle">
                  <span className="text-2xs text-content-muted block font-sans">Min</span>
                  <span className="text-xs font-bold text-content-primary">{output.min}</span>
                </div>
                <div className="p-1 rounded bg-canvas-subtle">
                  <span className="text-2xs text-content-muted block font-sans">Q1 (25%)</span>
                  <span className="text-xs font-bold text-content-primary">{output.q1}</span>
                </div>
                <div className="p-1 rounded bg-teal-500/10 border border-teal-500/20">
                  <span className="text-2xs text-teal-400 block font-sans font-bold">Med (Q2)</span>
                  <span className="text-xs font-bold text-teal-300">{output.median}</span>
                </div>
                <div className="p-1 rounded bg-canvas-subtle">
                  <span className="text-2xs text-content-muted block font-sans">Q3 (75%)</span>
                  <span className="text-xs font-bold text-content-primary">{output.q3}</span>
                </div>
                <div className="p-1 rounded bg-canvas-subtle">
                  <span className="text-2xs text-content-muted block font-sans">Max</span>
                  <span className="text-xs font-bold text-content-primary">{output.max}</span>
                </div>
              </div>

              {/* Extended Row */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-canvas-border/50 text-2xs text-content-muted font-mono">
                <div>Sample Var <span className="text-content-primary font-bold">s² = {output.sampVar}</span></div>
                <div>Pop Var <span className="text-content-primary font-bold">σ² = {output.popVar}</span></div>
                <div>Sum of Squares <span className="text-content-primary font-bold">∑x² = {output.sumSq}</span></div>
              </div>
            </div>
          </div>
        ) : (
          !errorMsg && (
            <div className="border border-dashed border-canvas-border rounded-xl p-5 text-center space-y-1.5 bg-canvas-surface/40">
              <Sparkles className="w-4 h-4 text-content-muted mx-auto" />
              <p className="text-xs font-medium text-content-secondary">
                Awaiting sample dataset
              </p>
              <p className="text-2xs text-content-muted max-w-xs mx-auto">
                Enter numerical observations above to evaluate mean, standard deviation, and five-number boxplot summary.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
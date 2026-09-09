'use client';

import React, { useState, useId } from 'react';
import Link from 'next/link';
import katex from 'katex';
import { evaluateWithVariables } from '@/lib/calculator/engine';
import {
  ArrowLeft,
  Table as TableIcon,
  AlertCircle,
  Copy,
  Check,
  Download,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface TableRow {
  x: number;
  fx: number;
  gx?: number | null;
}

export default function TableCalculatorPage() {
  const [funcF, setFuncF] = useState('');
  const [funcG, setFuncG] = useState('');
  const [enableG, setEnableG] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [step, setStep] = useState('');
  const [rows, setRows] = useState<TableRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fInputId = useId();
  const gInputId = useId();
  const startId = useId();
  const endId = useId();
  const stepId = useId();

  const normalizeExpression = (expr: string) => expr.replace(/\bx\b/g, 'X');

  const handleGenerate = () => {
    setErrorMsg(null);
    try {
      const st = parseFloat(start);
      const en = parseFloat(end);
      const sp = parseFloat(step);

      if (isNaN(st) || isNaN(en) || isNaN(sp)) {
        throw new Error('Start, End, and Step interval must all be valid numbers.');
      }
      if (sp <= 0) {
        throw new Error('Step value must be strictly greater than 0.');
      }
      if (st > en) {
        throw new Error('Start value must be less than or equal to End value.');
      }

      const totalSteps = Math.floor((en - st) / sp) + 1;
      if (totalSteps > 1000) {
        throw new Error(`Interval generates ${totalSteps} rows (maximum permitted is 1,000). Increase the step size.`);
      }

      const normalizedF = normalizeExpression(funcF);
      const normalizedG = normalizeExpression(funcG);

      const generated: TableRow[] = [];
      for (let i = 0; i < totalSteps; i++) {
        const x = Math.round((st + i * sp) * 1e6) / 1e6;
        const fxVal = evaluateWithVariables(normalizedF, { X: x });
        const gxVal = enableG ? evaluateWithVariables(normalizedG, { X: x }) : null;

        generated.push({
          x,
          fx: Math.round(fxVal * 1e4) / 1e4,
          gx: gxVal !== null ? Math.round(gxVal * 1e4) / 1e4 : undefined,
        });
      }

      setRows(generated);
    } catch (e: any) {
      setRows([]);
      setErrorMsg(e.message || 'Error generating table values.');
    }
  };

  const renderKaTeX = (latexStr: string) => {
    try {
      return katex.renderToString(latexStr, { throwOnError: false });
    } catch {
      return latexStr;
    }
  };

  const copyToClipboard = () => {
    if (rows.length === 0) return;
    const header = enableG ? 'X\tf(X)\tg(X)' : 'X\tf(X)';
    const body = rows
      .map((r) => (enableG ? `${r.x}\t${r.fx}\t${r.gx}` : `${r.x}\t${r.fx}`))
      .join('\n');
    navigator.clipboard.writeText(`${header}\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadCSV = () => {
    if (rows.length === 0) return;
    const header = enableG ? 'x,f(x),g(x)' : 'x,f(x)';
    const body = rows
      .map((r) => (enableG ? `${r.x},${r.fx},${r.gx}` : `${r.x},${r.fx}`))
      .join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `table_${funcF.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-12 select-none">
      {/* Wayfinding Header */}
      <div className="flex items-center justify-between border-b border-canvas-border pb-3">
        <Link
          href="/calculator"
          className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1.5 font-medium outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded px-1 py-0.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Standard Calculator</span>
        </Link>
        <span className="text-2xs font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-md">
          MODE: 08 / TABLE
        </span>
      </div>

      {/* Main Engineering Container */}
      <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-4 sm:p-6 space-y-4 shadow-elevated">
        {/* Title Header */}
        <div className="flex items-center justify-between border-b border-canvas-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400">
              <TableIcon className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-content-primary">
                Function Table Generator
              </h1>
              <p className="text-2xs text-content-secondary">
                Stepwise evaluation for algebraic, trig, log & exponential functions
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEnableG(!enableG)}
            className="flex items-center gap-1.5 text-2xs font-semibold px-2.5 py-1 rounded-lg bg-canvas-surface border border-canvas-border text-content-secondary hover:text-content-primary transition-colors"
          >
            {enableG ? (
              <ToggleRight className="w-4 h-4 text-brand-400" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-content-muted" />
            )}
            <span>Dual Function g(X)</span>
          </button>
        </div>

        {/* Function Inputs */}
        <div className="space-y-3">
          {/* f(X) Target */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor={fInputId} className="text-xs font-semibold text-content-secondary">
                Primary Function <span className="font-mono text-sky-400">f(X) or f(x)</span>
              </label>
              <span
                className="text-2xs text-content-muted"
                dangerouslySetInnerHTML={{
                  __html: renderKaTeX(`f(X) = ${funcF || '0'}`),
                }}
              />
            </div>
            <input
              id={fInputId}
              type="text"
              value={funcF}
              onChange={(e) => setFuncF(e.target.value)}
              placeholder="e.g. sin(x) + log(X)"
              className="w-full h-11 px-3.5 rounded-lg bg-canvas-surface border border-canvas-border text-content-primary font-mono text-sm placeholder:text-content-muted outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
            />
          </div>

          {/* Optional g(X) Target */}
          {enableG && (
            <div className="space-y-1 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <label htmlFor={gInputId} className="text-xs font-semibold text-content-secondary">
                  Secondary Function <span className="font-mono text-emerald-400">g(X) or g(x)</span>
                </label>
                <span
                  className="text-2xs text-content-muted"
                  dangerouslySetInnerHTML={{
                    __html: renderKaTeX(`g(X) = ${funcG || '0'}`),
                  }}
                />
              </div>
              <input
                id={gInputId}
                type="text"
                value={funcG}
                onChange={(e) => setFuncG(e.target.value)}
                placeholder="e.g. e^x"
                className="w-full h-11 px-3.5 rounded-lg bg-canvas-surface border border-canvas-border text-content-primary font-mono text-sm placeholder:text-content-muted outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Range and Step Grid */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <div>
            <label htmlFor={startId} className="text-2xs font-medium text-content-secondary mb-1 block">
              Range Start
            </label>
            <input
              id={startId}
              type="text"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              placeholder="0"
              className="w-full h-10 bg-canvas-surface border border-canvas-border rounded-lg text-center font-mono text-xs text-content-primary outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div>
            <label htmlFor={endId} className="text-2xs font-medium text-content-secondary mb-1 block">
              Range End
            </label>
            <input
              id={endId}
              type="text"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              placeholder="10"
              className="w-full h-10 bg-canvas-surface border border-canvas-border rounded-lg text-center font-mono text-xs text-content-primary outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div>
            <label htmlFor={stepId} className="text-2xs font-medium text-content-secondary mb-1 block">
              Step Size (Δx)
            </label>
            <input
              id={stepId}
              type="text"
              value={step}
              onChange={(e) => setStep(e.target.value)}
              placeholder="1"
              className="w-full h-10 bg-canvas-surface border border-canvas-border rounded-lg text-center font-mono text-xs text-content-primary outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Execution Trigger */}
        <button
          type="button"
          onClick={handleGenerate}
          className="w-full h-11 rounded-lg bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-xs transition-colors shadow-sm flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <TableIcon className="w-4 h-4" />
          <span>Generate Evaluation Table</span>
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

        {/* Rendered Data Table */}
        {rows.length > 0 ? (
          <div className="space-y-2 pt-1 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-canvas-border pb-2">
              <span className="text-2xs font-mono text-content-secondary">
                {rows.length} rows evaluated (x ∈ [{start}, {end}])
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="inline-flex items-center gap-1 text-2xs px-2 py-1 rounded-md bg-canvas-surface border border-canvas-border text-content-secondary hover:text-content-primary transition-colors focus-visible:outline-none"
                  title="Copy table to clipboard"
                >
                  {copied ? <Check className="w-3 h-3 text-status-success" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  type="button"
                  onClick={downloadCSV}
                  className="inline-flex items-center gap-1 text-2xs px-2 py-1 rounded-md bg-canvas-surface border border-canvas-border text-content-secondary hover:text-content-primary transition-colors focus-visible:outline-none"
                  title="Download CSV"
                >
                  <Download className="w-3 h-3" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-xl border border-canvas-border bg-canvas-surface scrollbar-thin scrollbar-thumb-canvas-border">
              <table className="w-full text-xs font-mono text-center">
                <thead className="bg-canvas-subtle text-content-secondary sticky top-0 border-b border-canvas-border select-none">
                  <tr>
                    <th className="py-2 px-3 font-semibold text-content-muted">#</th>
                    <th className="py-2 px-3 font-semibold text-content-primary">X</th>
                    <th className="py-2 px-3 font-semibold text-sky-400">f(X)</th>
                    {enableG && <th className="py-2 px-3 font-semibold text-emerald-400">g(X)</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-canvas-border/50">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-canvas-elevated/50 transition-colors">
                      <td className="py-1.5 px-3 text-2xs text-content-muted">{i + 1}</td>
                      <td className="py-1.5 px-3 text-content-primary font-medium">{r.x}</td>
                      <td className="py-1.5 px-3 text-sky-400 font-bold">{r.fx}</td>
                      {enableG && (
                        <td className="py-1.5 px-3 text-emerald-400 font-bold">{r.gx ?? '—'}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          !errorMsg && (
            <div className="border border-dashed border-canvas-border rounded-xl p-5 text-center space-y-1.5 bg-canvas-surface/40">
              <Sparkles className="w-4 h-4 text-content-muted mx-auto" />
              <p className="text-xs font-medium text-content-secondary">
                Table range ready
              </p>
              <p className="text-2xs text-content-muted max-w-xs mx-auto">
                Define any function using either lowercase or uppercase x/X (e.g. sin(x), log(X), e^x) and start/end parameters, then click Generate.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
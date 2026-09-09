'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Binary,
  Copy,
  Check,
  Delete,
  ShieldCheck,
} from 'lucide-react';

type RadixBase = 'HEX' | 'DEC' | 'OCT' | 'BIN';
type WordSize = 64 | 32 | 16 | 8;
type BitwiseOp = 'NONE' | 'AND' | 'OR' | 'XOR' | 'XNOR' | 'LSH' | 'RSH';

export default function BaseNCalculatorPage() {
  const [activeBase, setActiveBase] = useState<RadixBase>('DEC');
  const [wordSize, setWordSize] = useState<WordSize>(32);
  const [inputValue, setInputValue] = useState<string>('42');
  const [storedValue, setStoredValue] = useState<bigint | null>(null);
  const [pendingOp, setPendingOp] = useState<BitwiseOp>('NONE');
  const [copiedBase, setCopiedBase] = useState<string | null>(null);
  const [isSigned, setIsSigned] = useState<boolean>(false);

  // Bit mask depending on selected word size
  const mask = useMemo(() => {
    if (wordSize === 64) return 0xffffffffffffffffn;
    if (wordSize === 32) return 0xffffffffn;
    if (wordSize === 16) return 0xffffn;
    return 0xffn;
  }, [wordSize]);

  // Parse current raw input into unsigned BigInt
  const currentBigInt = useMemo(() => {
    try {
      const clean = inputValue.trim().replace(/\s+/g, '');
      if (!clean) return 0n;

      let val = 0n;
      if (activeBase === 'HEX') val = BigInt(`0x${clean}`);
      else if (activeBase === 'DEC') val = BigInt(clean);
      else if (activeBase === 'OCT') val = BigInt(`0o${clean}`);
      else if (activeBase === 'BIN') val = BigInt(`0b${clean}`);

      return val & mask;
    } catch {
      return 0n;
    }
  }, [inputValue, activeBase, mask]);

  // Format Signed decimal value (2's complement)
  const formatSignedDecimal = useCallback((val: bigint) => {
    const signBit = 1n << BigInt(wordSize - 1);
    if (val & signBit) {
      const negativeVal = val - (1n << BigInt(wordSize));
      return negativeVal.toString(10);
    }
    return val.toString(10);
  }, [wordSize]);

  // Formatted representations across all 4 radices
  const representations = useMemo(() => {
    const val = currentBigInt;
    const hex = val.toString(16).toUpperCase();
    const dec = isSigned ? formatSignedDecimal(val) : val.toString(10);
    const oct = val.toString(8);
    const rawBin = val.toString(2);

    // Pad binary to current wordSize and format with 4-bit nibbles
    const paddedBin = rawBin.padStart(wordSize, '0');
    const nibbles = paddedBin.match(/.{1,4}/g)?.join(' ') || paddedBin;

    return {
      HEX: hex || '0',
      DEC: dec || '0',
      OCT: oct || '0',
      BIN: nibbles || '0',
    };
  }, [currentBigInt, wordSize, isSigned, formatSignedDecimal]);

  // Check valid keys based on current active base
  const isKeyAllowed = useCallback(
    (char: string) => {
      const c = char.toUpperCase();
      if (activeBase === 'BIN') return ['0', '1'].includes(c);
      if (activeBase === 'OCT') return ['0', '1', '2', '3', '4', '5', '6', '7'].includes(c);
      if (activeBase === 'DEC') return /[0-9]/.test(c);
      if (activeBase === 'HEX') return /[0-9A-F]/.test(c);
      return false;
    },
    [activeBase]
  );

  const appendChar = (char: string) => {
    if (!isKeyAllowed(char)) return;
    setInputValue((prev) => {
      if (prev === '0') return char;
      return prev + char;
    });
  };

  const handleBackspace = () => {
    setInputValue((prev) => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const handleClear = () => {
    setInputValue('0');
    setStoredValue(null);
    setPendingOp('NONE');
  };

  // Bitwise Operation Trigger
  const handleOp = (op: BitwiseOp) => {
    setStoredValue(currentBigInt);
    setPendingOp(op);
    setInputValue('0');
  };

  // Invert / NOT Gate
  const handleNot = () => {
    const inverted = (~currentBigInt) & mask;
    if (activeBase === 'HEX') setInputValue(inverted.toString(16).toUpperCase());
    else if (activeBase === 'DEC') setInputValue(inverted.toString(10));
    else if (activeBase === 'OCT') setInputValue(inverted.toString(8));
    else if (activeBase === 'BIN') setInputValue(inverted.toString(2));
  };

  // Evaluate Pending Gate
  const handleCompute = () => {
    if (storedValue === null || pendingOp === 'NONE') return;

    let result = 0n;
    const a = storedValue;
    const b = currentBigInt;

    switch (pendingOp) {
      case 'AND':
        result = a & b;
        break;
      case 'OR':
        result = a | b;
        break;
      case 'XOR':
        result = a ^ b;
        break;
      case 'XNOR':
        result = ~(a ^ b);
        break;
      case 'LSH':
        result = a << (b & 63n);
        break;
      case 'RSH':
        result = a >> (b & 63n);
        break;
    }

    result = result & mask;

    if (activeBase === 'HEX') setInputValue(result.toString(16).toUpperCase());
    else if (activeBase === 'DEC') setInputValue(result.toString(10));
    else if (activeBase === 'OCT') setInputValue(result.toString(8));
    else if (activeBase === 'BIN') setInputValue(result.toString(2));

    setStoredValue(null);
    setPendingOp('NONE');
  };

  const handleCopy = (base: string, val: string) => {
    navigator.clipboard.writeText(val.replace(/\s+/g, ''));
    setCopiedBase(base);
    setTimeout(() => setCopiedBase(null), 1500);
  };

  // Switch base without losing underlying numerical magnitude
  const handleSwitchBase = (newBase: RadixBase) => {
    const val = currentBigInt;
    setActiveBase(newBase);
    if (newBase === 'HEX') setInputValue(val.toString(16).toUpperCase());
    else if (newBase === 'DEC') setInputValue(val.toString(10));
    else if (newBase === 'OCT') setInputValue(val.toString(8));
    else if (newBase === 'BIN') setInputValue(val.toString(2));
  };

  const hexButtons = ['A', 'B', 'C', 'D', 'E', 'F'];
  const numButtons = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['0'],
  ];

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-16 px-2 sm:px-0 select-none">
      {/* Top Wayfinding Header */}
      <div className="flex items-center justify-between border-b border-canvas-border pb-3">
        <Link
          href="/calculator"
          className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1.5 font-medium outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded px-1.5 py-0.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Standard Calculator</span>
        </Link>
        <span className="text-2xs font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-md">
          MODE: 09 / BASE_N
        </span>
      </div>

      {/* Main Engineering Workstation Container */}
      <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-4 sm:p-6 space-y-4 shadow-elevated">
        
        {/* Title and Hardware Config Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-canvas-border pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0">
              <Binary className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-content-primary">
                Base-N Digital Logic Processor
              </h1>
              <p className="text-2xs text-content-secondary">
                Real-time multi-radix conversion & bitwise logic operations
              </p>
            </div>
          </div>

          {/* Word Size & Sign Selectors */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Word Size Selector */}
            <div className="flex items-center bg-canvas-surface border border-canvas-border p-0.5 rounded-xl text-2xs font-mono font-semibold">
              {([64, 32, 16, 8] as WordSize[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setWordSize(size)}
                  className={`px-2.5 py-1.5 rounded-lg transition-all outline-none ${
                    wordSize === size
                      ? 'bg-rose-500 text-white font-bold shadow-sm'
                      : 'text-content-secondary hover:text-content-primary hover:bg-canvas-elevated'
                  }`}
                >
                  {size}b
                </button>
              ))}
            </div>

            {/* Signed / Unsigned Toggle */}
            <button
              type="button"
              onClick={() => setIsSigned(!isSigned)}
              className={`px-3 py-1.5 rounded-xl text-2xs font-mono font-bold border transition-all outline-none ${
                isSigned
                  ? 'bg-rose-500 text-white border-rose-400 shadow-sm shadow-rose-950 font-bold'
                  : 'bg-canvas-surface text-content-secondary border-canvas-border hover:bg-canvas-elevated'
              }`}
              title="Toggle Signed (2's complement) vs Unsigned Decimal"
            >
              {isSigned ? 'SIGNED' : 'UNSIGNED'}
            </button>
          </div>
        </div>

        {/* Real-time Multi-Radix Live Inspection Display with High-Contrast Active Cards */}
        <div className="bg-canvas-surface border border-canvas-border rounded-2xl p-3 space-y-2 shadow-inner">
          {(['HEX', 'DEC', 'OCT', 'BIN'] as RadixBase[]).map((base) => {
            const isActive = activeBase === base;
            const isCopied = copiedBase === base;

            return (
              <div
                key={base}
                onClick={() => handleSwitchBase(base)}
                className={`group relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-150 outline-none active:scale-[0.99] ${
                  isActive
                    ? 'bg-canvas-elevated text-content-primary border-2 border-rose-500 shadow-[0_0_20px_-4px_rgba(244,63,94,0.35)]'
                    : 'bg-canvas-subtle/80 text-content-secondary border border-canvas-border hover:bg-canvas-surface hover:text-content-primary hover:border-canvas-border/80'
                }`}
              >
                {/* Active Selection Indicator Pill */}
                {isActive && (
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
                )}

                <div className="flex items-center gap-3 min-w-0 pr-2 pl-1">
                  <span
                    className={`w-11 text-2xs font-extrabold tracking-wider text-center px-2 py-1 rounded-lg ${
                      isActive
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-canvas-subtle text-content-muted group-hover:text-content-secondary'
                    }`}
                  >
                    {base}
                  </span>
                  <span
                    className={`text-xs sm:text-sm font-mono font-bold truncate ${
                      isActive ? 'text-rose-400 font-extrabold' : 'text-content-primary'
                    }`}
                  >
                    {representations[base]}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(base, representations[base]);
                  }}
                  className={`p-2 rounded-lg transition-colors shrink-0 ${
                    isCopied
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-content-muted hover:text-content-primary hover:bg-canvas-elevated'
                  }`}
                  title={`Copy ${base} string`}
                  aria-label={`Copy ${base} string`}
                >
                  {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>

        {/* Active Value Input Line with Status Info */}
        <div className="flex items-center justify-between text-2xs text-content-muted px-1">
          <span>Active radix: <b className="text-rose-400 font-mono">{activeBase}</b></span>
          {pendingOp !== 'NONE' && (
            <span className="text-rose-400 font-mono font-bold animate-pulse">
              [ {storedValue?.toString(10)} {pendingOp} ... ]
            </span>
          )}
        </div>

        {/* Bitwise Logic Gates Toolbar */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-0.5 text-2xs font-mono font-semibold">
          {(['AND', 'OR', 'XOR', 'XNOR', 'LSH', 'RSH'] as BitwiseOp[]).map((op) => {
            const isSelected = pendingOp === op;
            return (
              <button
                key={op}
                type="button"
                onClick={() => handleOp(op)}
                className={`h-9 rounded-xl border transition-all outline-none active:scale-95 ${
                  isSelected
                    ? 'bg-rose-500 text-white border-rose-400 font-bold shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                    : 'bg-canvas-surface hover:bg-canvas-elevated text-content-secondary border-canvas-border hover:text-content-primary'
                }`}
              >
                {op === 'LSH' ? '<<' : op === 'RSH' ? '>>' : op}
              </button>
            );
          })}
          <button
            type="button"
            onClick={handleNot}
            className="h-9 rounded-xl bg-canvas-surface hover:bg-canvas-elevated text-content-secondary border border-canvas-border hover:text-content-primary transition-all outline-none active:scale-95"
          >
            NOT
          </button>
        </div>

        {/* Primary Keypad Grid */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {/* Hexadecimal A-F Buttons */}
          <div className="col-span-1 grid grid-rows-6 gap-1.5 font-mono font-bold text-xs">
            {hexButtons.map((char) => {
              const allowed = isKeyAllowed(char);
              return (
                <button
                  key={char}
                  type="button"
                  disabled={!allowed}
                  onClick={() => appendChar(char)}
                  className={`rounded-xl flex items-center justify-center transition-all outline-none ${
                    allowed
                      ? 'bg-canvas-surface hover:bg-canvas-elevated text-rose-400 border border-canvas-border shadow-sm active:scale-95'
                      : 'bg-canvas-surface/25 text-content-muted/20 border border-canvas-border/20 cursor-not-allowed opacity-30'
                  }`}
                >
                  {char}
                </button>
              );
            })}
          </div>

          {/* Numerical & Operational Controls (3 Columns) */}
          <div className="col-span-3 grid grid-cols-3 gap-1.5 font-mono font-bold text-sm">
            {/* Top row controls */}
            <button
              type="button"
              onClick={handleClear}
              className="h-11 rounded-xl bg-status-danger text-white hover:bg-status-danger/90 active:scale-95 transition-all text-xs shadow-sm outline-none font-bold"
            >
              AC
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-11 rounded-xl bg-status-danger-bg text-status-danger border border-status-danger/30 hover:bg-status-danger/20 flex items-center justify-center active:scale-95 transition-all outline-none"
              aria-label="Backspace"
            >
              <Delete className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCompute}
              className="h-11 rounded-xl bg-rose-500 hover:bg-rose-600 text-white active:scale-95 shadow-[0_0_12px_rgba(244,63,94,0.4)] transition-all flex items-center justify-center outline-none font-extrabold text-base"
            >
              =
            </button>

            {/* Numbers 7, 8, 9 */}
            {numButtons[0].map((num) => {
              const allowed = isKeyAllowed(num);
              return (
                <button
                  key={num}
                  type="button"
                  disabled={!allowed}
                  onClick={() => appendChar(num)}
                  className={`h-11 rounded-xl transition-all outline-none ${
                    allowed
                      ? 'bg-canvas-surface hover:bg-canvas-elevated text-content-primary border border-canvas-border shadow-sm active:scale-95'
                      : 'bg-canvas-surface/25 text-content-muted/20 border border-canvas-border/20 cursor-not-allowed opacity-30'
                  }`}
                >
                  {num}
                </button>
              );
            })}

            {/* Numbers 4, 5, 6 */}
            {numButtons[1].map((num) => {
              const allowed = isKeyAllowed(num);
              return (
                <button
                  key={num}
                  type="button"
                  disabled={!allowed}
                  onClick={() => appendChar(num)}
                  className={`h-11 rounded-xl transition-all outline-none ${
                    allowed
                      ? 'bg-canvas-surface hover:bg-canvas-elevated text-content-primary border border-canvas-border shadow-sm active:scale-95'
                      : 'bg-canvas-surface/25 text-content-muted/20 border border-canvas-border/20 cursor-not-allowed opacity-30'
                  }`}
                >
                  {num}
                </button>
              );
            })}

            {/* Numbers 1, 2, 3 */}
            {numButtons[2].map((num) => {
              const allowed = isKeyAllowed(num);
              return (
                <button
                  key={num}
                  type="button"
                  disabled={!allowed}
                  onClick={() => appendChar(num)}
                  className={`h-11 rounded-xl transition-all outline-none ${
                    allowed
                      ? 'bg-canvas-surface hover:bg-canvas-elevated text-content-primary border border-canvas-border shadow-sm active:scale-95'
                      : 'bg-canvas-surface/25 text-content-muted/20 border border-canvas-border/20 cursor-not-allowed opacity-30'
                  }`}
                >
                  {num}
                </button>
              );
            })}

            {/* 0 and Double Zero */}
            <button
              type="button"
              disabled={!isKeyAllowed('0')}
              onClick={() => appendChar('0')}
              className={`h-11 col-span-2 rounded-xl transition-all outline-none ${
                isKeyAllowed('0')
                  ? 'bg-canvas-surface hover:bg-canvas-elevated text-content-primary border border-canvas-border shadow-sm active:scale-95'
                  : 'bg-canvas-surface/25 text-content-muted/20 border border-canvas-border/20 cursor-not-allowed opacity-30'
              }`}
            >
              0
            </button>
            <button
              type="button"
              disabled={!isKeyAllowed('0')}
              onClick={() => {
                appendChar('0');
                appendChar('0');
              }}
              className={`h-11 rounded-xl transition-all text-xs font-mono outline-none ${
                isKeyAllowed('0')
                  ? 'bg-canvas-surface hover:bg-canvas-elevated text-content-primary border border-canvas-border shadow-sm active:scale-95'
                  : 'bg-canvas-surface/25 text-content-muted/20 border border-canvas-border/20 cursor-not-allowed opacity-30'
              }`}
            >
              00
            </button>
          </div>
        </div>

        {/* Footer Hardware Info */}
        <div className="pt-3 border-t border-canvas-border flex items-center justify-between text-2xs text-content-muted">
          <span className="flex items-center gap-1 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> BigInt Arbitrary-Precision
          </span>
          <span className="font-mono">Mask: 0x{mask.toString(16).toUpperCase()}</span>
        </div>

      </div>
    </div>
  );
}
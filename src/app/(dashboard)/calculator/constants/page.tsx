'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { SCIENTIFIC_CONSTANTS } from '@/lib/calculator/engine';
import {
  ArrowLeft,
  Zap,
  Search,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  Atom,
  Flame,
  Globe,
} from 'lucide-react';

type ConstantCategory = 'ALL' | 'UNIVERSAL' | 'EM' | 'ATOMIC' | 'PHYSICO_CHEMICAL';

interface ConstantDefinition {
  key: string;
  name: string;
  symbol: string;
  value: number;
  unit: string;
  category: ConstantCategory;
  description?: string;
}

// Map known scientific constants to standardized engineering categories
const categorizeConstant = (key: string, name: string): ConstantCategory => {
  const k = key.toLowerCase();
  const n = name.toLowerCase();

  if (k === 'c' || k === 'g' || k === 'h' || k === 'hbar' || n.includes('planck') || n.includes('gravitat') || n.includes('speed of light')) {
    return 'UNIVERSAL';
  }
  if (k === 'e' || k === 'eps0' || k === 'mu0' || k === 'z0' || n.includes('permittivity') || n.includes('permeability') || n.includes('elementary charge') || n.includes('impedance')) {
    return 'EM';
  }
  if (k === 'me' || k === 'mp' || k === 'mn' || k === 'ry' || k === 'a0' || n.includes('electron') || n.includes('proton') || n.includes('neutron') || n.includes('bohr') || n.includes('rydberg')) {
    return 'ATOMIC';
  }
  return 'PHYSICO_CHEMICAL';
};

const CATEGORY_TABS: { id: ConstantCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'ALL', label: 'All', icon: Layers },
  { id: 'UNIVERSAL', label: 'Universal', icon: Globe },
  { id: 'EM', label: 'Electromagnetism', icon: Zap },
  { id: 'ATOMIC', label: 'Atomic & Nuclear', icon: Atom },
  { id: 'PHYSICO_CHEMICAL', label: 'Physico-Chemical', icon: Flame },
];

export default function ConstantsCalculatorPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ConstantCategory>('ALL');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Normalize and memoize constants catalog
  const constantsCatalog: ConstantDefinition[] = useMemo(() => {
    return Object.entries(SCIENTIFIC_CONSTANTS).map(([key, item]) => {
      const category = categorizeConstant(key, item.name);
      return {
        key,
        name: item.name,
        symbol: item.symbol,
        value: item.value,
        unit: item.unit,
        category,
      };
    });
  }, []);

  // Filter based on search query and category
  const filteredConstants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return constantsCatalog.filter((c) => {
      const matchesCategory = selectedCategory === 'ALL' || c.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q) ||
        c.key.toLowerCase().includes(q) ||
        c.unit.toLowerCase().includes(q)
      );
    });
  }, [constantsCatalog, searchQuery, selectedCategory]);

  const handleCopyValue = (key: string, val: number) => {
    navigator.clipboard.writeText(val.toString());
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-16 px-2 sm:px-0 select-none">
      
      {/* Top Header & Wayfinding */}
      <div className="flex items-center justify-between border-b border-canvas-border pb-3">
        <Link
          href="/calculator"
          className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1.5 font-medium outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded px-1.5 py-0.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Standard Calculator</span>
        </Link>
        <span className="text-2xs font-mono font-bold bg-status-warning-bg text-status-warning border border-status-warning/30 px-2 py-0.5 rounded-md">
          MODE: 10 / CONSTANTS
        </span>

      </div>

      {/* Main Surface Card */}
      <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-4 sm:p-6 space-y-4 shadow-elevated">
        
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-canvas-border pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-status-warning-bg border border-status-warning/30 flex items-center justify-center text-status-warning shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-content-primary">
                Fundamental Scientific Constants
              </h1>
              <p className="text-2xs text-content-secondary">
                CODATA & NIST standardized physical reference values with IEEE 754 precision
              </p>
            </div>
          </div>

          <span className="text-2xs font-mono text-content-muted bg-canvas-surface border border-canvas-border px-2.5 py-1 rounded-md self-start sm:self-auto">
            {filteredConstants.length} of {constantsCatalog.length}
          </span>

        </div>

        {/* Live Search Input Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-content-muted">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search constants by name, symbol, key, or unit (e.g. Planck, c, ε0, J/K)..."
            className="w-full h-10 pl-9 pr-14 rounded-lg bg-canvas-surface border border-canvas-border text-content-primary text-xs placeholder:text-content-muted outline-none focus:border-status-warning focus:ring-1 focus:ring-status-warning transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-content-muted hover:text-content-primary transition-colors text-2xs font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-2xs font-semibold whitespace-nowrap transition-all border outline-none focus-visible:ring-1 focus-visible:ring-brand-500 ${
                  isSelected
                    ? 'bg-status-warning-bg text-status-warning border-status-warning/40 shadow-sm'
                    : 'bg-canvas-surface text-content-secondary border-canvas-border hover:text-content-primary hover:bg-canvas-elevated'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Constants List Registry */}
        <div className="max-h-[480px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-canvas-border">
          {filteredConstants.length === 0 ? (
            <div className="border border-dashed border-canvas-border rounded-xl p-8 text-center space-y-2 bg-canvas-surface/40 animate-in fade-in duration-150">
              <Sparkles className="w-5 h-5 text-content-muted mx-auto" />
              <p className="text-xs font-semibold text-content-primary">
                No matching constants found
              </p>
              <p className="text-2xs text-content-secondary max-w-xs mx-auto">
                No entries match &quot;{searchQuery}&quot; within {selectedCategory === 'ALL' ? 'the catalog' : selectedCategory.toLowerCase().replace('_', ' ')}.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                }}
                className="mt-2 inline-flex items-center gap-1.5 text-2xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset all filters</span>
              </button>
            </div>
          ) : (
            filteredConstants.map((c) => {
              const isCopied = copiedKey === c.key;
              return (
                <div
                  key={c.key}
                  className="group flex items-center justify-between p-2.5 rounded-xl bg-canvas-surface hover:bg-canvas-elevated border border-canvas-border/80 hover:border-canvas-border transition-all"
                >
                  {/* Left: Symbol & Identification */}
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-9 h-9 rounded-lg bg-canvas-subtle border border-canvas-border flex items-center justify-center font-mono font-bold text-sm text-status-warning shrink-0 shadow-inner">
                      {c.symbol}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-content-primary truncate">
                          {c.name}
                        </span>
                        <span className="text-2xs font-mono text-content-muted bg-canvas-subtle px-1.5 py-0.2 rounded border border-canvas-border shrink-0">
                          {c.key}
                        </span>
                      </div>
                      <span className="text-2xs font-mono text-content-muted block truncate mt-0.5">
                        {c.unit || 'dimensionless'}
                      </span>
                    </div>
                  </div>

                  {/* Right: Numerical Value & Copy Trigger */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-bold text-status-success font-mono block">
                        {c.value.toExponential(4)}
                      </span>
                      <span className="text-2xs text-content-muted font-mono block max-w-[120px] truncate" title={c.value.toString()}>
                        {c.value}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyValue(c.key, c.value)}
                      title={`Copy precise value: ${c.value}`}
                      className={`p-2 rounded-lg border transition-all active:scale-95 outline-none focus-visible:ring-1 focus-visible:ring-brand-500 ${
                        isCopied
                          ? 'bg-status-success-bg border-status-success/40 text-status-success'
                          : 'bg-canvas-subtle border-canvas-border text-content-muted group-hover:text-content-primary hover:bg-canvas-surface'
                      }`}
                      aria-label={`Copy value for ${c.name}`}
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Reference Strip */}
        <div className="pt-3 border-t border-canvas-border flex flex-col sm:flex-row items-center justify-between gap-1 text-2xs text-content-muted">
          <span>Standard SI units compliant with NIST reference values</span>
          <span>Click any copy button to inject raw values into clipboard</span>
        </div>

      </div>
    </div>
  );
}
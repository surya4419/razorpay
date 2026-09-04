import React, { useState } from 'react';
import { Play, RotateCw } from 'lucide-react';

/**
 * Design tokens (matches playground system):
 * Ink #0A1F3D · Primary #2B5FE0 · Slate #5B6B84
 * Ice #F6F9FE · Line #E3E8F0 · Radius: 20 (card) / 12 (controls)
 */

const CARD_SHADOW = '0 1px 1px rgba(10,31,77,0.03), 0 12px 28px -16px rgba(10,31,77,0.22)';

const inputStyle = {
  background: '#FFFFFF',
  border: '1px solid #E3E8F0',
  borderRadius: 10,
  padding: '8px 12px',
  fontSize: 12,
  color: '#0A1F3D',
  outline: 'none',
  width: '100%',
  transition: 'border-color 0.15s',
};

export function ControlPanel({ onRunSimulation, isSimulating, progress, onRefresh }) {
  const [batchSize, setBatchSize] = useState(100);
  const [speedMs, setSpeedMs] = useState(60);
  const [scenarioMix, setScenarioMix] = useState('standard');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onRunSimulation) onRunSimulation({ batchSize, speedMs, scenarioMix });
  };

  return (
    <div
      className="rounded-[20px] bg-white overflow-hidden"
      style={{ border: '1px solid #E3E8F0', boxShadow: CARD_SHADOW }}
    >
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-5"
        style={{ borderBottom: '1px solid #E3E8F0' }}
      >
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: '#0A1F3D' }}>
            Batch simulation runner
          </h2>
          <p className="text-xs mt-0.5" style={{ color: '#5B6B84' }}>
            Stream synthetic volume through the 3-layer pipeline to demonstrate scale and learning curves.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[10px] transition-all self-start sm:self-auto"
          style={{ color: '#5B6B84', background: '#F6F9FE', border: '1px solid #E3E8F0' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#2B5FE0'; e.currentTarget.style.borderColor = '#2B5FE0'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#5B6B84'; e.currentTarget.style.borderColor = '#E3E8F0'; }}
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh data</span>
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-6 py-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#8B98AC' }}>
              Batch size
            </label>
            <select
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              disabled={isSimulating}
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#2B5FE0'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E3E8F0'; }}
            >
              <option value={50}>50 transactions (Quick demo)</option>
              <option value={100}>100 transactions (Standard)</option>
              <option value={200}>200 transactions (Learning curve)</option>
              <option value={500}>500 transactions (Deep convergence)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#8B98AC' }}>
              Streaming rate
            </label>
            <select
              value={speedMs}
              onChange={(e) => setSpeedMs(Number(e.target.value))}
              disabled={isSimulating}
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#2B5FE0'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E3E8F0'; }}
            >
              <option value={20}>Fast (20ms / txn)</option>
              <option value={60}>Standard (60ms / txn)</option>
              <option value={150}>Visual review (150ms / txn)</option>
              <option value={0}>Instant (0ms)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#8B98AC' }}>
              Scenario distribution
            </label>
            <select
              value={scenarioMix}
              onChange={(e) => setScenarioMix(e.target.value)}
              disabled={isSimulating}
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#2B5FE0'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E3E8F0'; }}
            >
              <option value="standard">Standard India mix (65% UPI, 25% Card)</option>
              <option value="peak_hours">Peak-hour bank load heavy</option>
              <option value="emandate_heavy">High-value e-mandate heavy</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSimulating}
              className="w-full inline-flex items-center justify-center gap-2 text-white px-4 py-2.5 rounded-[12px] font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-50"
              style={{
                background: 'linear-gradient(180deg, #3B6FE8 0%, #2B5FE0 100%)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 14px -6px rgba(43,95,224,0.5)',
              }}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSimulating ? 'Streaming batch…' : 'Run batch simulation'}</span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {isSimulating && progress && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #E3E8F0' }}>
            <div className="flex items-center justify-between text-[11px] mb-1.5" style={{ color: '#5B6B84' }}>
              <span>
                Processing: <strong className="tabular-nums" style={{ color: '#0A1F3D' }}>{progress.processed}</strong> / <span className="tabular-nums">{progress.total}</span>
              </span>
              <span className="font-mono font-semibold" style={{ color: '#2B5FE0' }}>{progress.percent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#F6F9FE', border: '1px solid #E3E8F0' }}>
              <div
                className="h-full rounded-full transition-all duration-150"
                style={{ width: `${progress.percent}%`, background: 'linear-gradient(90deg, #2B5FE0 0%, #4F7EF0 100%)' }}
              />
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

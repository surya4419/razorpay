import React, { useState } from 'react';
import { Play, RotateCw } from 'lucide-react';

const inputStyle = {
  background: 'rgba(10,31,77,0.05)',
  border: 'none',
  borderRadius: 10,
  padding: '8px 12px',
  fontSize: 12,
  color: '#0A1F3D',
  outline: 'none',
  width: '100%',
  transition: 'background 0.15s',
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
    <div>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#8B98AC' }}>
              Batch size
            </label>
            <select
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              disabled={isSimulating}
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.background = 'rgba(43,95,224,0.08)'; }}
              onBlur={e => { e.currentTarget.style.background = 'rgba(10,31,77,0.05)'; }}
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
              onFocus={e => { e.currentTarget.style.background = 'rgba(43,95,224,0.08)'; }}
              onBlur={e => { e.currentTarget.style.background = 'rgba(10,31,77,0.05)'; }}
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
              onFocus={e => { e.currentTarget.style.background = 'rgba(43,95,224,0.08)'; }}
              onBlur={e => { e.currentTarget.style.background = 'rgba(10,31,77,0.05)'; }}
            >
              <option value="standard">Standard India mix (65% UPI, 25% Card)</option>
              <option value="peak_hours">Peak-hour bank load heavy</option>
              <option value="emandate_heavy">High-value e-mandate heavy</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSimulating}
              className="flex-1 inline-flex items-center justify-center gap-2 text-white px-4 py-2.5 rounded-[12px] font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-50"
              style={{
                background: 'linear-gradient(180deg, #3B6FE8 0%, #2B5FE0 100%)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 14px -6px rgba(43,95,224,0.5)',
              }}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSimulating ? 'Streaming…' : 'Run simulation'}</span>
            </button>
            <button
              type="button"
              onClick={onRefresh}
              className="p-2.5 rounded-[12px] transition-all"
              style={{ background: 'rgba(10,31,77,0.06)', color: '#5B6B84' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#2B5FE0'; e.currentTarget.style.background = 'rgba(43,95,224,0.10)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#5B6B84'; e.currentTarget.style.background = 'rgba(10,31,77,0.06)'; }}
              title="Refresh data"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {isSimulating && progress && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] mb-1" style={{ color: '#5B6B84' }}>
              <span>Processing <strong style={{ color: '#0A1F3D' }}>{progress.processed}</strong> / {progress.total}</span>
              <span className="font-mono font-semibold" style={{ color: '#2B5FE0' }}>{progress.percent}%</span>
            </div>
            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(10,31,77,0.08)' }}>
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

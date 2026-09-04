import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Design tokens (matches playground system):
 * Ink #0A1F3D · Deep #1E3A6E · Primary #2B5FE0 · Slate #5B6B84
 * Pale #E8F0FD · Ice #F6F9FE · Line #E3E8F0 · Radius: 20 (card) / 12 (inner)
 */

const CARD_SHADOW = '0 1px 1px rgba(10,31,77,0.03), 0 12px 28px -16px rgba(10,31,77,0.22)';
const ACCENT_SHADOW = '0 1px 1px rgba(10,31,77,0.03), 0 20px 40px -18px rgba(43,95,224,0.30)';

export function HeadlineMetrics({ metrics }) {
  const atRisk      = metrics?.totalAtRisk || 0;
  const prevented   = metrics?.totalPrevented || 0;
  const recovered   = metrics?.totalRecovered || 0;
  const totalSaved  = metrics?.totalSaved || (prevented + recovered);
  const savedPercent = metrics?.savedPercentage || (atRisk > 0 ? (totalSaved / atRisk) * 100 : 0);
  const naivePercent = metrics?.naivePercentage || 36.0;
  const lift         = metrics?.liftPercentage || (savedPercent - naivePercent);

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <div
        className="rounded-[20px] bg-white overflow-hidden"
        style={{ border: '1px solid rgba(43,95,224,0.18)', boxShadow: ACCENT_SHADOW }}
      >
        {/* Accent top bar */}
        <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #2B5FE0 0%, #4F7EF0 60%, #7CA3F5 100%)' }} />

        <div className="px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Hero number */}
            <div className="lg:col-span-6 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#8B98AC' }}>
                Total revenue recovered & prevented
              </span>
              <div className="flex items-baseline gap-3 flex-wrap mt-1">
                <span className="text-4xl sm:text-5xl font-bold tracking-tight tabular-nums" style={{ color: '#2B5FE0' }}>
                  ₹{totalSaved.toLocaleString('en-IN')}
                </span>
                <span
                  className="text-sm font-semibold px-2.5 py-0.5 rounded-full tabular-nums"
                  style={{ color: '#2B5FE0', background: 'rgba(43,95,224,0.10)', border: '1px solid rgba(43,95,224,0.2)' }}
                >
                  {savedPercent.toFixed(1)}% saved
                </span>
              </div>
              <p className="text-xs pt-1" style={{ color: '#5B6B84' }}>
                +{lift >= 0 ? lift.toFixed(1) : '0.0'}% net recovery lift over naive baseline
              </p>
            </div>

            {/* Supporting triad */}
            <div
              className="lg:col-span-6 grid grid-cols-3 gap-4 pt-2 lg:pt-0 lg:pl-6"
              style={{ borderLeft: '1px solid #E3E8F0' }}
            >
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wide block" style={{ color: '#8B98AC' }}>At risk</span>
                <div className="text-lg font-bold tabular-nums mt-1" style={{ color: '#0A1F3D' }}>
                  ₹{atRisk.toLocaleString('en-IN')}
                </div>
                <span className="text-[11px]" style={{ color: '#8B98AC' }}>
                  {metrics?.totalTransactions || 0} attempts
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wide block" style={{ color: '#8B98AC' }}>Prevented (L1)</span>
                <div className="text-lg font-bold tabular-nums mt-1" style={{ color: '#0A1F3D' }}>
                  ₹{prevented.toLocaleString('en-IN')}
                </div>
                <span className="text-[11px]" style={{ color: '#8B98AC' }}>AFA & routing</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wide block" style={{ color: '#8B98AC' }}>Recovered (L2)</span>
                <div className="text-lg font-bold tabular-nums mt-1" style={{ color: '#0A1F3D' }}>
                  ₹{recovered.toLocaleString('en-IN')}
                </div>
                <span className="text-[11px]" style={{ color: '#8B98AC' }}>Smart links & retries</span>
              </div>
            </div>
          </div>

          {/* Benchmark bar */}
          <div className="mt-6 pt-5" style={{ borderTop: '1px solid #E3E8F0' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold" style={{ color: '#0A1F3D' }}>
                Recovery performance vs naive baseline
              </span>
              <span className="text-xs font-mono font-semibold" style={{ color: '#2B5FE0' }}>
                +{lift >= 0 ? lift.toFixed(1) : '0.0'}% improvement
              </span>
            </div>
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-[11px] mb-1" style={{ color: '#5B6B84' }}>
                  <span>Our 3-layer AI engine</span>
                  <span className="font-mono font-bold" style={{ color: '#2B5FE0' }}>{savedPercent.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: '#F6F9FE', border: '1px solid #E3E8F0' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(4, savedPercent))}%`, background: 'linear-gradient(90deg, #2B5FE0 0%, #4F7EF0 100%)' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1" style={{ color: '#5B6B84' }}>
                  <span>Naive baseline (blind retry, no classification)</span>
                  <span className="font-mono">{naivePercent.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#F6F9FE', border: '1px solid #E3E8F0' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(4, naivePercent))}%`, background: '#C4CCDA' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}

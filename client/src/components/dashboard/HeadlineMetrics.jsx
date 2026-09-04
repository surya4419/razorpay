import React from 'react';
import { TrendingUp, ShieldCheck, RefreshCw, AlertTriangle, Zap, BarChart2 } from 'lucide-react';

const BLUE  = '#2B5FE0';
const INK   = '#0A1F3D';
const MUTE  = '#8B98AC';
const SLATE = '#5B6B84';

export function HeadlineMetrics({ metrics }) {
  const atRisk       = metrics?.totalAtRisk || 0;
  const prevented    = metrics?.totalPrevented || 0;
  const recovered    = metrics?.totalRecovered || 0;
  const totalSaved   = metrics?.totalSaved || (prevented + recovered);
  const savedPercent = metrics?.savedPercentage || (atRisk > 0 ? (totalSaved / atRisk) * 100 : 0);
  const naivePercent = metrics?.naivePercentage || 36.0;
  const lift         = metrics?.liftPercentage || (savedPercent - naivePercent);
  const totalTxns    = metrics?.totalTransactions || 0;

  const stats = [
    {
      icon: TrendingUp,
      label: 'Total saved',
      value: `₹${totalSaved.toLocaleString('en-IN')}`,
      sub: `${savedPercent.toFixed(1)}% of at-risk`,
      accent: true,
    },
    {
      icon: ShieldCheck,
      label: 'Prevented — L1',
      value: `₹${prevented.toLocaleString('en-IN')}`,
      sub: 'AFA & smart routing',
    },
    {
      icon: RefreshCw,
      label: 'Recovered — L2',
      value: `₹${recovered.toLocaleString('en-IN')}`,
      sub: 'Links & retries',
    },
    {
      icon: AlertTriangle,
      label: 'At risk',
      value: `₹${atRisk.toLocaleString('en-IN')}`,
      sub: `${totalTxns} attempts`,
    },
    {
      icon: Zap,
      label: 'Our engine',
      value: `${savedPercent.toFixed(1)}%`,
      sub: 'Recovery rate',
      accent: true,
    },
    {
      icon: BarChart2,
      label: 'Naive baseline',
      value: `${naivePercent.toFixed(1)}%`,
      sub: `+${lift >= 0 ? lift.toFixed(1) : '0.0'}% lift`,
    },
  ];

  return (
    <div>
      {/* Page title */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: MUTE }}>
            AI Revenue Recovery Engine
          </p>
          <h1 className="text-2xl font-bold" style={{ color: INK }}>
            Performance overview
          </h1>
        </div>
        <span
          className="hidden sm:inline text-[11px] font-semibold px-3 py-1 rounded-full"
          style={{ color: BLUE, background: 'rgba(43,95,224,0.10)' }}
        >
          +{lift >= 0 ? lift.toFixed(1) : '0.0'}% lift vs naive baseline
        </span>
      </div>

      {/* Six stat columns — no cards, no bars */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-5">
        {stats.map(({ icon: Icon, label, value, sub, accent }, i) => (
          <div key={label} className="flex flex-col">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accent ? BLUE : SLATE }} />
              <span className="text-[11px] font-medium truncate" style={{ color: MUTE }}>{label}</span>
            </div>
            <div
              className="text-xl font-bold tabular-nums tracking-tight leading-none"
              style={{ color: accent ? BLUE : INK }}
            >
              {value}
            </div>
            <div className="text-[11px] mt-1" style={{ color: MUTE }}>{sub}</div>
            {i < 5 && (
              <div
                className="hidden lg:block absolute"
                style={{
                  right: 0, top: '10%', height: '80%',
                  width: 1, background: 'rgba(10,31,77,0.07)',
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

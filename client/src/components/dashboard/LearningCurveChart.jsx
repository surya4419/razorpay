import React from 'react';
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { ArrowUpRight } from 'lucide-react';

/**
 * Design tokens (matches playground system):
 * Ink #0A1F3D · Primary #2B5FE0 · Deep #1E3A6E · Slate #5B6B84
 * Ice #F6F9FE · Line #E3E8F0 · Radius: 20 (card) / 12 (inner)
 */

const CARD_SHADOW = '0 1px 1px rgba(10,31,77,0.03), 0 12px 28px -16px rgba(10,31,77,0.22)';

export function LearningCurveChart({ chartData, divergences = [] }) {
  const points = chartData?.points || [];

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
          <h3 className="text-[15px] font-semibold" style={{ color: '#0A1F3D' }}>
            Layer 3 learning curve (cumulative recovery rate)
          </h3>
          <p className="text-xs mt-0.5" style={{ color: '#5B6B84' }}>
            Empirical win-rates adapt as transaction volume accumulates across context buckets.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#2B5FE0' }} />
            <span className="font-medium" style={{ color: '#0A1F3D' }}>3-layer engine</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-0.5" style={{ background: '#8B98AC' }} />
            <span style={{ color: '#8B98AC' }}>Naive baseline (36%)</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-6 h-64 w-full py-4">
        {points.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3E8F0" vertical={false} />
              <XAxis
                dataKey="sequence"
                stroke="#8B98AC"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `#${val}`}
              />
              <YAxis
                stroke="#8B98AC"
                fontSize={11}
                tickLine={false}
                domain={[20, 100]}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E3E8F0',
                  borderRadius: 10,
                  boxShadow: '0 4px 16px -8px rgba(10,31,77,0.18)',
                  fontSize: 12,
                  color: '#0A1F3D',
                }}
                formatter={(val, name) => [
                  `${Number(val).toFixed(1)}%`,
                  name === 'recoveryRate' ? '3-layer engine' : 'Naive baseline'
                ]}
                labelFormatter={(label) => `Transaction sequence: #${label}`}
              />
              <Line
                type="monotone"
                dataKey="recoveryRate"
                stroke="#2B5FE0"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: '#2B5FE0', stroke: '#FFFFFF', strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="naiveRate"
                stroke="#8B98AC"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs italic" style={{ color: '#8B98AC' }}>
            Run a batch simulation or trigger live demo calls to plot learning curve data points.
          </div>
        )}
      </div>

      {/* Diverged strategies */}
      <div className="px-6 pb-6 pt-2" style={{ borderTop: '1px solid #E3E8F0' }}>
        <div className="flex items-center justify-between mb-3 pt-4">
          <span className="text-xs font-semibold" style={{ color: '#0A1F3D' }}>
            Top diverged strategies (Learned preference vs cold-start default)
          </span>
          <span className="text-[11px]" style={{ color: '#8B98AC' }}>Auto-promoted by Layer 3 scanner</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {divergences && divergences.length > 0 ? (
            divergences.slice(0, 3).map((div, idx) => (
              <div
                key={idx}
                className="rounded-[12px] p-3 flex flex-col justify-between"
                style={{ border: '1px solid #E3E8F0', background: '#F6F9FE' }}
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold truncate max-w-[150px]" style={{ color: '#0A1F3D' }}>
                      {div.categoryName || div.category}
                    </span>
                    <span className="font-semibold text-[11px] flex items-center" style={{ color: '#2B5FE0' }}>
                      <ArrowUpRight className="w-3 h-3" />
                      +{div.winRateDelta}%
                    </span>
                  </div>
                  <div className="text-[11px] font-mono mb-2 truncate" style={{ color: '#8B98AC' }}>
                    {div.contextBucket}
                  </div>
                </div>
                <div className="pt-2 text-[11px] flex items-center justify-between" style={{ borderTop: '1px solid #E3E8F0' }}>
                  <span className="font-medium" style={{ color: '#2B5FE0' }}>
                    {div.learnedAction} ({div.learnedWinRate}%)
                  </span>
                  <span className="text-[10px]" style={{ color: '#8B98AC' }}>
                    Default: {div.defaultWinRate}%
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-2 text-center text-xs italic" style={{ color: '#8B98AC' }}>
              Bandit currently evaluating action distributions across contexts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

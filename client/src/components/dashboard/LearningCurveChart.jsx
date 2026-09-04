import React, { useRef, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { TrendingUp } from 'lucide-react';

/**
 * Design tokens (matches playground system — see CardExpiryModal.jsx / Navbar.jsx /
 * SplitView.jsx / ScenarioPicker.jsx):
 * Ink #0A1F3D · Primary #2B5FE0 · Deep #1E3A6E · Mid #3E63B0 · Slate #5B6B84
 * Ice #F6F9FE · Line #E3E8F0 · Radius: 20 (card) / 16 (chart panel)
 *
 * The card tracks the cursor for a subtle 3D tilt + spotlight glow (same device
 * used on modern dashboard/marketing surfaces — Linear, Vercel, Stripe), on top
 * of the shared layered elevation. The line renders as an animated gradient-fill
 * area rather than a bare stroke, for more visual depth on load and on redraw.
 */

const TILT_MAX = 5; // degrees

export function LearningCurveChart({ chartData, divergences = [] }) {
  const points = chartData?.points || [];
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [glow, setGlow] = useState({ x: 50, y: 0, active: false });
  const [interacting, setInteracting] = useState(false);

  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({
      ry: (px - 0.5) * TILT_MAX * 2,
      rx: -(py - 0.5) * TILT_MAX * 2,
    });
    setGlow({ x: px * 100, y: py * 100, active: true });
  };

  const handleEnter = () => setInteracting(true);
  const handleLeave = () => {
    setInteracting(false);
    setTilt({ rx: 0, ry: 0 });
    setGlow((g) => ({ ...g, active: false }));
  };

  return (
    <div style={{ perspective: 1400 }}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className={`relative flex flex-col rounded-[20px] bg-white overflow-hidden ${interacting ? '' : 'transition-transform duration-500 ease-out'}`}
        style={{
          border: '1px solid #E3E8F0',
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transformStyle: 'preserve-3d',
          boxShadow: interacting
            ? '0 2px 4px rgba(10,31,77,0.08), 0 32px 60px -16px rgba(10,31,77,0.34)'
            : '0 2px 4px rgba(10,31,77,0.06), 0 16px 40px -12px rgba(10,31,77,0.24)',
          transition: interacting ? 'box-shadow 200ms ease-out' : 'transform 500ms ease-out, box-shadow 500ms ease-out',
        }}
      >
        {/* Cursor-tracked spotlight glow */}
        <div
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
          style={{
            opacity: glow.active ? 1 : 0,
            background: `radial-gradient(420px circle at ${glow.x}% ${glow.y}%, rgba(43,95,224,0.08), transparent 60%)`,
          }}
        />

        {/* Top accent rail */}
        <div className="h-[3px] w-full flex-shrink-0" style={{ background: 'linear-gradient(90deg, #1E3A6E 0%, #2B5FE0 55%, #6FA0F5 100%)' }} />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-5" style={{ borderBottom: '1px solid #EEF1F6' }}>
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
              style={{ background: '#E8F0FD', color: '#2B5FE0' }}
            >
              <TrendingUp style={{ width: 18, height: 18 }} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold" style={{ color: '#0A1F3D' }}>
                Layer 3 learning curve (cumulative recovery rate)
              </h3>
              <p className="text-xs mt-0.5" style={{ color: '#5B6B84' }}>
                Empirical win-rates adapt as transaction volume accumulates across context buckets.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs flex-shrink-0 pl-12 sm:pl-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#2B5FE0', boxShadow: '0 0 0 3px rgba(43,95,224,0.16)' }} />
              <span className="font-medium" style={{ color: '#0A1F3D' }}>3-layer engine</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 rounded-full" style={{ background: '#8B98AC' }} />
              <span style={{ color: '#8B98AC' }}>Naive baseline (36%)</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div
          className="mx-6 my-5 h-80 w-auto py-4 px-2 rounded-[16px]"
          style={{ background: '#FBFCFE', border: '1px solid #F0F3F9' }}
        >
          {points.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 10, right: 14, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="recoveryFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2B5FE0" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#2B5FE0" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="naiveFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B98AC" stopOpacity={0.14} />
                    <stop offset="100%" stopColor="#8B98AC" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E8F0" vertical={false} />
                <XAxis
                  dataKey="sequence"
                  stroke="#8B98AC"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#E3E8F0' }}
                  tickFormatter={(val) => `#${val}`}
                />
                <YAxis
                  stroke="#8B98AC"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={[20, 100]}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E3E8F0',
                    borderRadius: 12,
                    boxShadow: '0 8px 24px -8px rgba(10,31,77,0.24)',
                    fontSize: 12,
                    color: '#0A1F3D',
                    padding: '10px 12px',
                  }}
                  formatter={(val, name) => [
                    `${Number(val).toFixed(1)}%`,
                    name === 'recoveryRate' ? '3-layer engine' : 'Naive baseline'
                  ]}
                  labelFormatter={(label) => `Transaction sequence: #${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="naiveRate"
                  stroke="#8B98AC"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="url(#naiveFill)"
                  dot={false}
                  isAnimationActive
                  animationDuration={900}
                />
                <Area
                  type="monotone"
                  dataKey="recoveryRate"
                  stroke="#2B5FE0"
                  strokeWidth={2.75}
                  fill="url(#recoveryFill)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#2B5FE0', stroke: '#FFFFFF', strokeWidth: 2.5 }}
                  isAnimationActive
                  animationDuration={1100}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs italic" style={{ color: '#8B98AC' }}>
              Run a batch simulation or trigger live demo calls to plot learning curve data points.
            </div>
          )}
        </div>

        {/* Top diverged strategies */}
        {divergences && divergences.length > 0 && (
          <div className="px-6 pb-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold" style={{ color: '#0A1F3D' }}>
                Top diverged strategies
              </span>
              <span className="text-[11px]" style={{ color: '#8B98AC' }}>Auto-promoted by Layer 3 scanner</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {divergences.slice(0, 3).map((div, idx) => (
                <div
                  key={idx}
                  className="rounded-[12px] p-3 flex flex-col justify-between"
                  style={{ background: 'rgba(10,31,77,0.04)' }}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold truncate max-w-[150px]" style={{ color: '#0A1F3D' }}>
                        {div.categoryName || div.category}
                      </span>
                      <span className="font-semibold text-[11px] flex items-center gap-0.5" style={{ color: '#2B5FE0' }}>
                        +{div.winRateDelta}%
                      </span>
                    </div>
                    <div className="text-[11px] font-mono mb-2 truncate" style={{ color: '#8B98AC' }}>
                      {div.contextBucket}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium" style={{ color: '#2B5FE0' }}>
                      {div.learnedAction} ({div.learnedWinRate}%)
                    </span>
                    <span style={{ color: '#8B98AC' }}>
                      Default: {div.defaultWinRate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Demo wrapper ---
export default function Demo() {
  const points = Array.from({ length: 24 }, (_, i) => ({
    sequence: i + 1,
    recoveryRate: 40 + Math.min(40, i * 1.8) + Math.sin(i / 2) * 3,
    naiveRate: 36,
  }));
  return (
    <div style={{ background: '#F6F9FE' }} className="p-8">
      <LearningCurveChart chartData={{ points }} />
    </div>
  );
}
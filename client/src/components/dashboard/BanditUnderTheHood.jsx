import React, { useState, useEffect, useRef } from 'react';
import { RotateCw, Cpu, Radio } from 'lucide-react';
import { api } from '../../services/api.js';

const TILT_MAX = 4;

export function BanditUnderTheHood() {
  const [banditData, setBanditData] = useState(null);
  const [rulesData, setRulesData] = useState(null);
  const [loading, setLoading] = useState(false);

  // 3D tilt for rules card
  const rulesRef = useRef(null);
  const [rulesTilt, setRulesTilt] = useState({ rx: 0, ry: 0 });
  const [rulesGlow, setRulesGlow] = useState({ x: 50, y: 0, active: false });
  const [rulesInteracting, setRulesInteracting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [banditRes, rulesRes] = await Promise.all([api.getBanditState(), api.getRiskRules()]);
      setBanditData(banditRes);
      setRulesData(rulesRes);
    } catch (err) {
      console.error('Error loading bandit data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const states = banditData?.states || [];
  const rules = rulesData?.rules || [];

  const handleRulesMove = (e) => {
    const el = rulesRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setRulesTilt({ ry: (px - 0.5) * TILT_MAX * 2, rx: -(py - 0.5) * TILT_MAX * 2 });
    setRulesGlow({ x: px * 100, y: py * 100, active: true });
  };

  return (
    <div
      className="rounded-[24px] overflow-hidden"
      style={{
        background: '#F3F5F9',
        boxShadow: '0 2px 4px rgba(10,31,77,0.06), 0 16px 40px -12px rgba(10,31,77,0.28)',
      }}
    >
      {/* Header */}
      <div className="px-8 pt-7 pb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: '#E8F0FD' }}>
            <Cpu style={{ width: 18, height: 18, color: '#2B5FE0' }} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: '#0A1F3D' }}>
              Contextual bandit matrix & dynamic rules
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#5B6B84' }}>
              Layer 3 win-rate tracking across Category × Context × Action with automated rule promotions
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-[10px] transition-all disabled:opacity-50"
          style={{ color: '#5B6B84', background: 'rgba(10,31,77,0.06)' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#2B5FE0'; e.currentTarget.style.background = 'rgba(43,95,224,0.10)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#5B6B84'; e.currentTarget.style.background = 'rgba(10,31,77,0.06)'; }}
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="mx-6" style={{ height: 1, background: 'rgba(10,31,77,0.07)' }} />

      {/* ── Rules card — LiveFeed style with 3D tilt ── */}
      <div className="p-4">
        <div style={{ perspective: 1200 }}>
          <div
            ref={rulesRef}
            onMouseMove={handleRulesMove}
            onMouseEnter={() => setRulesInteracting(true)}
            onMouseLeave={() => { setRulesInteracting(false); setRulesTilt({ rx: 0, ry: 0 }); setRulesGlow(g => ({ ...g, active: false })); }}
            className={`relative rounded-[20px] bg-white overflow-hidden ${rulesInteracting ? '' : 'transition-transform duration-500 ease-out'}`}
            style={{
              border: '1px solid #E3E8F0',
              transform: `rotateX(${rulesTilt.rx}deg) rotateY(${rulesTilt.ry}deg)`,
              transformStyle: 'preserve-3d',
              boxShadow: rulesInteracting
                ? '0 2px 4px rgba(10,31,77,0.08), 0 32px 60px -16px rgba(10,31,77,0.34)'
                : '0 2px 4px rgba(10,31,77,0.06), 0 16px 40px -12px rgba(10,31,77,0.24)',
              transition: rulesInteracting ? 'box-shadow 200ms' : 'transform 500ms ease-out, box-shadow 500ms ease-out',
            }}
          >
            {/* Spotlight */}
            <div
              className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
              style={{
                opacity: rulesGlow.active ? 1 : 0,
                background: `radial-gradient(400px circle at ${rulesGlow.x}% ${rulesGlow.y}%, rgba(43,95,224,0.08), transparent 60%)`,
              }}
            />
            {/* Accent rail */}
            <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #1E3A6E 0%, #2B5FE0 55%, #6FA0F5 100%)' }} />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #EEF1F6' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: '#E8F0FD' }}>
                  <Radio style={{ width: 18, height: 18, color: '#2B5FE0' }} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold" style={{ color: '#0A1F3D' }}>
                    Layer 1 active risk rules
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: '#5B6B84' }}>
                    Dynamic rules — {rules.length} active, {rulesData?.learnedCount || 0} learned & promoted
                  </p>
                </div>
              </div>
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ color: '#2B5FE0', background: 'rgba(43,95,224,0.10)', border: '1px solid rgba(43,95,224,0.2)' }}
              >
                {rulesData?.learnedCount || 0} promoted
              </span>
            </div>

            {/* Rules list — event stream style rows */}
            <div>
              {rules.length > 0 ? rules.map((r) => (
                <div
                  key={r._id}
                  className="px-6 py-3.5 flex items-center justify-between gap-4 text-xs transition-colors duration-150 cursor-default"
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(43,95,224,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span
                      className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                      style={r.source === 'learned'
                        ? { color: '#2B5FE0', background: 'rgba(43,95,224,0.10)', border: '1px solid rgba(43,95,224,0.2)' }
                        : { color: '#5B6B84', background: 'rgba(10,31,77,0.06)' }}
                    >
                      {r.source}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold truncate" style={{ color: '#0A1F3D' }}>{r.ruleName}</div>
                      <div className="text-[11px] mt-0.5 truncate" style={{ color: '#8B98AC' }}>{r.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <code
                      className="font-mono text-[11px] px-2 py-0.5 rounded-[6px]"
                      style={{ color: '#2B5FE0', background: 'rgba(43,95,224,0.08)', border: '1px solid rgba(43,95,224,0.15)' }}
                    >
                      {r.action}
                    </code>
                    <span className="font-mono text-[11px]" style={{ color: '#8B98AC' }}>
                      {r.supportingSampleSize} txns
                      {r.winRateDelta > 0 && (
                        <span className="ml-1 font-semibold" style={{ color: '#2B5FE0' }}>
                          +{(r.winRateDelta * 100).toFixed(0)}%
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="py-10 text-center text-xs italic" style={{ color: '#8B98AC' }}>
                  No active rules. Run a simulation to populate.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-6" style={{ height: 1, background: 'rgba(10,31,77,0.07)' }} />

      {/* ── Bandit state matrix — AuditTable style ── */}
      <div className="px-6 pt-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8B98AC' }}>
            Bandit state matrix — {states.length} combinations
          </p>
          <span className="text-[11px]" style={{ color: '#8B98AC' }}>Epsilon decay exploration active</span>
        </div>

        <div
          className="rounded-[16px] overflow-hidden"
          style={{ background: '#F3F5F9', boxShadow: '0 1px 3px rgba(10,31,77,0.06), 0 8px 24px -8px rgba(10,31,77,0.16)' }}
        >
          <div className="overflow-x-auto" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0" style={{ background: 'rgba(10,31,77,0.06)' }}>
                <tr>
                  {['Failure category', 'Context bucket', 'Action', 'Attempts', 'Successes', 'Win rate'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 font-semibold${i >= 3 && i <= 4 ? ' text-right' : ''}`}
                      style={{ color: '#8B98AC' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {states.slice(0, 100).map((s) => (
                  <tr
                    key={s._id}
                    className="font-mono text-[11px] transition-colors duration-150"
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(43,95,224,0.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td className="px-4 py-2.5 font-semibold" style={{ color: '#0A1F3D' }}>{s.category}</td>
                    <td className="px-4 py-2.5" style={{ color: '#5B6B84' }}>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: 'rgba(10,31,77,0.06)' }}>
                        {s.contextBucket}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: '#2B5FE0' }}>{s.action}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: '#0A1F3D' }}>{s.attempts}</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums" style={{ color: '#2B5FE0' }}>{s.successes}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(10,31,77,0.08)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${s.winRate * 100}%`, background: 'linear-gradient(90deg, #2B5FE0 0%, #4F7EF0 100%)' }}
                          />
                        </div>
                        <span className="font-semibold tabular-nums" style={{ color: '#0A1F3D' }}>
                          {(s.winRate * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {states.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center italic" style={{ color: '#8B98AC' }}>
                      No bandit state data. Run a simulation to populate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

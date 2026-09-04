import React, { useState, useEffect } from 'react';
import { RotateCw, Cpu } from 'lucide-react';
import { api } from '../../services/api.js';

/**
 * Design tokens (matches playground system):
 * Ink #0A1F3D · Primary #2B5FE0 · Slate #5B6B84
 * Ice #F6F9FE · Line #E3E8F0 · Radius: 20 (card) / 12 (inner)
 */

const CARD_SHADOW = '0 1px 1px rgba(10,31,77,0.03), 0 12px 28px -16px rgba(10,31,77,0.22)';

export function BanditUnderTheHood() {
  const [banditData, setBanditData] = useState(null);
  const [rulesData, setRulesData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [banditRes, rulesRes] = await Promise.all([
        api.getBanditState(),
        api.getRiskRules()
      ]);
      setBanditData(banditRes);
      setRulesData(rulesRes);
    } catch (err) {
      console.error('Error loading under the hood data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const states = banditData?.states || [];
  const rules = rulesData?.rules || [];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div
        className="rounded-[20px] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5"
        style={{ border: '1px solid #E3E8F0', boxShadow: CARD_SHADOW }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(43,95,224,0.08)' }}
          >
            <Cpu className="w-4.5 h-4.5" style={{ width: 18, height: 18, color: '#2B5FE0' }} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold" style={{ color: '#0A1F3D' }}>
              Contextual bandit matrix & dynamic rules
            </h3>
            <p className="text-xs mt-0.5" style={{ color: '#5B6B84' }}>
              Inspection of Layer 3 win-rate tracking across (Category × Context × Action) and automated rule promotions.
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-[10px] transition-all disabled:opacity-50 self-start sm:self-auto flex-shrink-0"
          style={{ color: '#5B6B84', background: '#F6F9FE', border: '1px solid #E3E8F0' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#2B5FE0'; e.currentTarget.style.color = '#2B5FE0'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E3E8F0'; e.currentTarget.style.color = '#5B6B84'; }}
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh state</span>
        </button>
      </div>

      {/* Layer 1 risk rules */}
      <div
        className="rounded-[20px] bg-white overflow-hidden"
        style={{ border: '1px solid #E3E8F0', boxShadow: CARD_SHADOW }}
      >
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid #E3E8F0' }}
        >
          <h4 className="text-[15px] font-semibold" style={{ color: '#0A1F3D' }}>
            Layer 1 active risk rules ({rules.length} rules)
          </h4>
          <span
            className="text-[11px] font-mono px-2.5 py-1 rounded-full"
            style={{ color: '#2B5FE0', background: 'rgba(43,95,224,0.10)', border: '1px solid rgba(43,95,224,0.2)' }}
          >
            {rulesData?.learnedCount || 0} learned / promoted
          </span>
        </div>

        <div className="px-6 py-4">
          <div className="overflow-x-auto rounded-[12px]" style={{ border: '1px solid #E3E8F0' }}>
            <table className="w-full text-left text-xs">
              <thead style={{ background: '#F6F9FE', borderBottom: '1px solid #E3E8F0' }}>
                <tr>
                  {['Source', 'Rule name', 'Action triggered', 'Sample size', 'Description'].map(h => (
                    <th key={h} className="px-3.5 py-2.5 font-semibold" style={{ color: '#8B98AC' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr
                    key={r._id}
                    className="transition-colors duration-150"
                    style={{ borderBottom: '1px solid #E3E8F0' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F6F9FE'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span
                        className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full"
                        style={
                          r.source === 'learned'
                            ? { color: '#2B5FE0', background: 'rgba(43,95,224,0.10)', border: '1px solid rgba(43,95,224,0.2)' }
                            : { color: '#5B6B84', background: '#F6F9FE', border: '1px solid #E3E8F0' }
                        }
                      >
                        {r.source}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 font-semibold whitespace-nowrap" style={{ color: '#0A1F3D' }}>
                      {r.ruleName}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <code
                        className="font-mono text-[11px] px-1.5 py-0.5 rounded-[6px]"
                        style={{ color: '#2B5FE0', background: 'rgba(43,95,224,0.08)', border: '1px solid rgba(43,95,224,0.15)' }}
                      >
                        {r.action}
                      </code>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono whitespace-nowrap" style={{ color: '#0A1F3D' }}>
                      {r.supportingSampleSize} txns
                      {r.winRateDelta > 0 && (
                        <span className="ml-1 font-semibold" style={{ color: '#2B5FE0' }}>
                          (+{(r.winRateDelta * 100).toFixed(0)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5" style={{ color: '#5B6B84' }}>{r.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bandit state matrix */}
      <div
        className="rounded-[20px] bg-white overflow-hidden"
        style={{ border: '1px solid #E3E8F0', boxShadow: CARD_SHADOW }}
      >
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid #E3E8F0' }}
        >
          <h4 className="text-[15px] font-semibold" style={{ color: '#0A1F3D' }}>
            Contextual bandit state matrix ({states.length} combinations)
          </h4>
          <span className="text-[11px]" style={{ color: '#8B98AC' }}>Epsilon decay exploration active</span>
        </div>

        <div className="px-6 py-4">
          <div className="overflow-x-auto rounded-[12px] max-h-96" style={{ border: '1px solid #E3E8F0' }}>
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0" style={{ background: '#F6F9FE', borderBottom: '1px solid #E3E8F0' }}>
                <tr>
                  {['Failure category', 'Context bucket', 'Action', 'Attempts', 'Successes', 'Learned win rate'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-3.5 py-2.5 font-semibold${i >= 3 && i <= 4 ? ' text-right' : ''}`}
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
                    style={{ borderBottom: '1px solid #E3E8F0' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F6F9FE'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td className="px-3.5 py-2 font-semibold" style={{ color: '#0A1F3D' }}>{s.category}</td>
                    <td className="px-3.5 py-2" style={{ color: '#5B6B84' }}>
                      <span
                        className="px-1.5 py-0.5 rounded-full"
                        style={{ background: '#F6F9FE', border: '1px solid #E3E8F0' }}
                      >
                        {s.contextBucket}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 font-medium" style={{ color: '#2B5FE0' }}>{s.action}</td>
                    <td className="px-3.5 py-2 text-right tabular-nums" style={{ color: '#0A1F3D' }}>{s.attempts}</td>
                    <td className="px-3.5 py-2 text-right font-medium tabular-nums" style={{ color: '#2B5FE0' }}>{s.successes}</td>
                    <td className="px-3.5 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: '#F6F9FE', border: '1px solid #E3E8F0' }}>
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
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

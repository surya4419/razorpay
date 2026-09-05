import React from 'react';
import { RealDataBadge } from '../shared/RealDataBadge.jsx';
import { StatusPill } from '../shared/StatusPill.jsx';
import { Search, Eye, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';

/**
 * Design tokens (matches playground system):
 * Ink #0A1F3D · Primary #2B5FE0 · Slate #5B6B84
 * Ice #F6F9FE · Line #E3E8F0 · Radius: 20 (card) / 10 (inputs)
 */

const CARD_SHADOW = '0 2px 4px rgba(10,31,77,0.06), 0 16px 40px -12px rgba(10,31,77,0.28)';
const CARD_HOVER_SHADOW = '0 2px 4px rgba(10,31,77,0.08), 0 28px 52px -12px rgba(10,31,77,0.36)';

const inputBase = {
  background: '#FFFFFF',
  border: '1px solid #E3E8F0',
  borderRadius: 10,
  padding: '6px 12px',
  fontSize: 12,
  color: '#0A1F3D',
  outline: 'none',
  transition: 'border-color 0.15s',
};

export function AuditTable({
  transactions = [],
  total = 0,
  page = 1,
  onPageChange,
  filterRealOnly,
  onToggleRealOnly,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  onSelectTransaction
}) {
  return (
    <div
      className="rounded-[20px] overflow-hidden"
      style={{ background: '#F3F5F9', boxShadow: CARD_SHADOW }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-medium" style={{ color: '#8B98AC' }}>{total} records</span>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#8B98AC' }} />
            <input
              type="text"
              placeholder="Search customer, order ID…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{ ...inputBase, paddingLeft: 32, width: 192 }}
              onFocus={e => { e.currentTarget.style.borderColor = '#2B5FE0'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E3E8F0'; }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            style={inputBase}
            onFocus={e => { e.currentTarget.style.borderColor = '#2B5FE0'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#E3E8F0'; }}
          >
            <option value="">All statuses</option>
            <option value="prevented">Prevented (Layer 1)</option>
            <option value="recovered">Recovered (Layer 2)</option>
            <option value="lost">Lost / Unrecovered</option>
          </select>

          <button
            onClick={onToggleRealOnly}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all"
            style={
              filterRealOnly
                ? { background: 'linear-gradient(180deg, #3B6FE8 0%, #2B5FE0 100%)', color: '#FFFFFF', border: '1px solid transparent', boxShadow: '0 4px 10px -4px rgba(43,95,224,0.5)' }
                : { background: '#FFFFFF', color: '#5B6B84', border: '1px solid #E3E8F0' }
            }
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Real calls only</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="px-6 py-4">
        <div className="overflow-x-auto rounded-[12px]" style={{ background: 'rgba(10,31,77,0.04)' }}>
          <table className="w-full text-left text-xs">
            <thead style={{ background: 'rgba(10,31,77,0.06)' }}>
              <tr>
                {['Source', 'Customer / Order', 'Amount', 'Method', 'Layer 1 Action', 'Layer 2 Diagnosis & Recovery', 'Outcome', 'Inspect'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-3.5 py-2.5 font-semibold${i === 2 || i === 7 ? ' text-right' : ''}`}
                    style={{ color: '#8B98AC' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.length > 0 ? (
                transactions.map((t) => {
                  const isReal = t.isRealRazorpayCall;

                  // Derive display status correctly across all 6 scenarios
                  let status;
                  const isL2Recovery = t.finalOutcome?.recovered && t.layer2?.category;
                  const isL1Prevention = t.outcome?.status === 'success'
                    && t.layer1?.action
                    && t.layer1.action !== 'PROCEED_NORMAL'
                    && !isL2Recovery;

                  if (isL1Prevention) {
                    status = 'prevented';
                  } else if (isL2Recovery) {
                    status = 'recovered';
                  } else if (t.layer2?.restraint) {
                    status = 'restrained';
                  } else if (t.outcome?.status === 'success') {
                    status = 'success';
                  } else {
                    status = 'lost';
                  }

                  return (
                    <tr
                      key={t._id}
                      onClick={() => onSelectTransaction(t._id)}
                      className="cursor-pointer transition-colors duration-150"
                      style={{ borderBottom: 'none' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(43,95,224,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <RealDataBadge isReal={isReal} size="sm" />
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <div className="font-semibold" style={{ color: '#0A1F3D' }}>{t.customerName || t.customerId}</div>
                        <div className="text-[11px] font-mono mt-0.5" style={{ color: '#8B98AC' }}>{t.razorpayOrderId || t.customerId}</div>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap text-right font-mono font-semibold tabular-nums" style={{ color: '#0A1F3D' }}>
                        ₹{t.amount?.toLocaleString('en-IN')}
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span
                          className="font-mono uppercase text-[11px] px-2 py-0.5 rounded-full"
                          style={{ color: '#5B6B84', background: '#F6F9FE', border: '1px solid #E3E8F0' }}
                        >
                          {t.method}
                        </span>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-medium" style={{ color: '#0A1F3D' }}>{t.layer1?.action || 'PROCEED_NORMAL'}</div>
                        <div className="text-[11px] mt-0.5" style={{ color: '#8B98AC' }}>Risk: {t.layer1?.riskScore || 0}/100</div>
                      </td>
                      <td className="px-3.5 py-3">
                        {t.layer2?.category ? (
                          <div>
                            <div className="font-mono text-[11px] font-semibold" style={{ color: '#2B5FE0' }}>{t.layer2.actionTaken}</div>
                            <div className="text-[11px] truncate max-w-[180px] mt-0.5" style={{ color: '#8B98AC' }}>{t.layer2.category}</div>
                          </div>
                        ) : (
                          <span className="text-[11px] italic" style={{ color: '#8B98AC' }}>No failure</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <StatusPill status={status} size="sm" />
                      </td>
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectTransaction(t._id); }}
                          className="p-1.5 rounded-[8px] transition-all"
                          style={{ color: '#8B98AC', background: '#F6F9FE', border: '1px solid #E3E8F0' }}
                          title="View audit details"
                          onMouseEnter={e => { e.currentTarget.style.color = '#2B5FE0'; e.currentTarget.style.borderColor = '#2B5FE0'; e.currentTarget.style.background = '#E8F0FD'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = '#8B98AC'; e.currentTarget.style.borderColor = '#E3E8F0'; e.currentTarget.style.background = '#F6F9FE'; }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs italic" style={{ color: '#8B98AC' }}>
                    No matching transaction records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs px-6 py-4" style={{ color: '#8B98AC' }}>
        <div>
          Showing page{' '}
          <span className="font-semibold" style={{ color: '#0A1F3D' }}>{page}</span> of{' '}
          <span className="font-semibold" style={{ color: '#0A1F3D' }}>{Math.max(1, Math.ceil(total / 50))}</span>
          {' '}({total} total)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="p-1.5 rounded-[8px] transition-all disabled:opacity-40"
            style={{ color: '#5B6B84', background: '#FFFFFF', border: '1px solid #E3E8F0' }}
            onMouseEnter={e => { if (page > 1) { e.currentTarget.style.borderColor = '#2B5FE0'; e.currentTarget.style.color = '#2B5FE0'; } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E3E8F0'; e.currentTarget.style.color = '#5B6B84'; }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= Math.ceil(total / 50)}
            className="p-1.5 rounded-[8px] transition-all disabled:opacity-40"
            style={{ color: '#5B6B84', background: '#FFFFFF', border: '1px solid #E3E8F0' }}
            onMouseEnter={e => { if (page < Math.ceil(total / 50)) { e.currentTarget.style.borderColor = '#2B5FE0'; e.currentTarget.style.color = '#2B5FE0'; } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E3E8F0'; e.currentTarget.style.color = '#5B6B84'; }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

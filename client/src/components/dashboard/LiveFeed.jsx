import React from 'react';
import { RealDataBadge } from '../shared/RealDataBadge.jsx';
import { StatusPill } from '../shared/StatusPill.jsx';

/**
 * Design tokens (matches playground system):
 * Ink #0A1F3D · Primary #2B5FE0 · Slate #5B6B84
 * Ice #F6F9FE · Line #E3E8F0 · Radius: 20 (card)
 */

const CARD_SHADOW = '0 1px 1px rgba(10,31,77,0.03), 0 12px 28px -16px rgba(10,31,77,0.22)';

export function LiveFeed({ events = [], onSelectTransaction }) {
  return (
    <div
      className="rounded-[20px] bg-white overflow-hidden flex flex-col h-full"
      style={{ border: '1px solid #E3E8F0', boxShadow: CARD_SHADOW }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-5 flex-shrink-0"
        style={{ borderBottom: '1px solid #E3E8F0' }}
      >
        <h3 className="text-[15px] font-semibold" style={{ color: '#0A1F3D' }}>
          Real-time event stream
        </h3>
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ color: '#2B5FE0', background: 'rgba(43,95,224,0.10)', border: '1px solid rgba(43,95,224,0.2)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#2B5FE0' }} />
          Listening
        </span>
      </div>

      {/* Stream list */}
      <div className="flex-1 overflow-y-auto text-xs" style={{ borderColor: '#E3E8F0' }}>
        {events.length > 0 ? (
          events.map((evt, idx) => {
            const data = evt.data || {};
            const isReal = Boolean(data.isRealRazorpayCall || evt.type?.startsWith('razorpay:'));
            const status = data.status || (data.recovered ? 'recovered' : (data.isPrevented ? 'prevented' : (data.restraint ? 'restrained' : 'processed')));

            return (
              <div
                key={idx}
                onClick={() => data.transactionId && onSelectTransaction?.(data.transactionId)}
                className="px-5 py-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors duration-150"
                style={{ borderBottom: '1px solid #E3E8F0' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F6F9FE'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div className="flex items-start gap-3 overflow-hidden">
                  <div className="text-[11px] font-mono w-14 flex-shrink-0 pt-0.5" style={{ color: '#8B98AC' }}>
                    {evt.timestamp}
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate" style={{ color: '#0A1F3D' }}>
                        {data.scenario || data.customerName || data.category || evt.type}
                      </span>
                      {isReal && <RealDataBadge isReal={true} size="sm" />}
                    </div>
                    <div className="text-[11px] truncate mt-0.5" style={{ color: '#8B98AC' }}>
                      {data.layer1?.action ? `L1: ${data.layer1.action} ` : ''}
                      {data.layer2?.actionTaken ? `• L2: ${data.layer2.actionTaken} ` : ''}
                      {data.amount ? `(₹${data.amount.toLocaleString('en-IN')})` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <StatusPill status={status} size="sm" />
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex items-center justify-center text-xs italic p-6 text-center" style={{ color: '#8B98AC' }}>
            Waiting for live transactions or batch simulation events…
          </div>
        )}
      </div>
    </div>
  );
}

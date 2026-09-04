import React from 'react';
import { Ban } from 'lucide-react';
import { StatusPill } from '../shared/StatusPill.jsx';

/**
 * Design tokens (matches playground system):
 * Ink #0A1F3D · Deep #1E3A6E · Primary #2B5FE0 · Slate #5B6B84
 * Ice #F6F9FE · Line #E3E8F0 · Radius: 20 (card) / 12 (inner panels)
 */

const CARD_SHADOW = '0 2px 4px rgba(10,31,77,0.06), 0 16px 40px -12px rgba(10,31,77,0.28)';
const CARD_HOVER_SHADOW = '0 2px 4px rgba(10,31,77,0.08), 0 28px 52px -12px rgba(10,31,77,0.36)';

export function RestraintPanel({ restraintData, onSelectTransaction }) {
  const cases = restraintData?.cases || [];
  const count = restraintData?.count || cases.length;

  return (
    <div
      className="rounded-[20px] overflow-hidden transition-all duration-300 ease-out hover:-translate-y-0.5"
      style={{ background: '#F3F5F9', boxShadow: CARD_SHADOW }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = CARD_HOVER_SHADOW; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = CARD_SHADOW; }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-5">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(30,58,110,0.08)' }}
          >
            <Ban className="w-4 h-4" style={{ color: '#1E3A6E' }} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold" style={{ color: '#0A1F3D' }}>
              The Restraint Principle ({count} non-interventions)
            </h3>
            <p className="text-xs mt-0.5" style={{ color: '#5B6B84' }}>
              Enforces hard stopping rules and friction gates to avoid customer fatigue.
            </p>
          </div>
        </div>
        <span
          className="text-[11px] font-mono px-2.5 py-1 rounded-full self-start sm:self-auto flex-shrink-0"
          style={{ color: '#1E3A6E', background: 'rgba(30,58,110,0.08)', border: '1px solid rgba(30,58,110,0.18)' }}
        >
          {count} protected
        </span>
      </div>

      {/* Pillars */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {[
            {
              title: '1. Hard decline shield',
              body: 'Zero auto-retries on expired or stolen cards to prevent merchant risk flags.'
            },
            {
              title: '2. Hard stopping rules',
              body: 'Ceases outreach after defined max attempts (1–3 nudges max) per failure category.'
            },
            {
              title: '3. Friction vs value gate',
              body: 'Suppresses low-value notifications when customer annoyance exceeds recovery value.'
            }
          ].map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-[12px] p-3.5"
              style={{ background: 'rgba(10,31,77,0.04)', borderRadius: 12 }}
            >
              <div className="text-xs font-semibold mb-1" style={{ color: '#0A1F3D' }}>{pillar.title}</div>
              <p className="text-[11px] leading-relaxed" style={{ color: '#5B6B84' }}>{pillar.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Case list */}
      <div className="px-6 pb-6 space-y-2 max-h-56 overflow-y-auto">
        {cases.length > 0 ? (
          cases.map((t, idx) => (
            <div
              key={t._id || idx}
              onClick={() => onSelectTransaction?.(t._id)}
              className="p-3.5 rounded-[12px] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs cursor-pointer transition-colors duration-150"
              style={{ background: 'rgba(10,31,77,0.03)', borderRadius: 12 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(43,95,224,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,31,77,0.03)'; }}
            >
              <div>
                <div className="flex items-center gap-2 font-medium" style={{ color: '#0A1F3D' }}>
                  <span>{t.customerName || t.customerId}</span>
                  <span className="font-mono" style={{ color: '#5B6B84' }}>₹{t.amount?.toLocaleString('en-IN')}</span>
                  <span className="text-[11px] uppercase font-mono" style={{ color: '#8B98AC' }}>({t.method})</span>
                </div>
                <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: '#8B98AC' }}>
                  Reason: {t.layer2?.restraintReason || t.layer2?.reasoning || 'Suppressed intervention per restraint gate.'}
                </p>
              </div>
              <div className="flex-shrink-0">
                <StatusPill status="restrained" size="sm" />
              </div>
            </div>
          ))
        ) : (
          <div className="py-3 text-center text-xs italic" style={{ color: '#8B98AC' }}>
            No restraint cases logged in current batch.
          </div>
        )}
      </div>
    </div>
  );
}

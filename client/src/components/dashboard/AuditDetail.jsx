import React, { useEffect, useState } from 'react';
import { PayloadViewer } from '../shared/PayloadViewer.jsx';
import { RealDataBadge } from '../shared/RealDataBadge.jsx';
import { StatusPill } from '../shared/StatusPill.jsx';
import { api } from '../../services/api.js';
import { X, Shield, Zap, Clock, ExternalLink } from 'lucide-react';

/**
 * Design tokens (matches playground system):
 * Ink #0A1F3D · Deep #1E3A6E · Primary #2B5FE0 · Slate #5B6B84
 * Pale #E8F0FD · Ice #F6F9FE · Line #E3E8F0 · Radius: 20 (modal) / 12 (inner)
 */

export function AuditDetail({ transactionId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!transactionId) return;
    setLoading(true);
    api.getTransactionById(transactionId)
      .then(res => setData(res))
      .catch(err => console.error('Error fetching transaction detail:', err))
      .finally(() => setLoading(false));
  }, [transactionId]);

  if (!transactionId) return null;

  const t = data?.transaction;
  const auditLogs = data?.auditLogs || [];
  const rawPayload = auditLogs.find(l => l.rawRazorpayPayload)?.rawRazorpayPayload || {
    id: t?.razorpayPaymentId || t?.razorpayOrderId,
    amount: (t?.amount || 0) * 100,
    currency: 'INR',
    status: t?.outcome?.status,
    error: {
      code: t?.outcome?.errorCode,
      reason: t?.outcome?.errorReason,
      source: t?.outcome?.errorSource,
      step: t?.outcome?.errorStep
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(10,31,77,0.35)', backdropFilter: 'blur(2px)' }}>
      <div
        className="bg-white w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{ borderRadius: 20, border: '1px solid #E3E8F0', boxShadow: '0 4px 6px rgba(10,31,77,0.04), 0 24px 48px -16px rgba(10,31,77,0.28)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid #E3E8F0', background: 'linear-gradient(180deg, #FBFDFF 0%, #FFFFFF 100%)' }}
        >
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-[15px] font-semibold" style={{ color: '#0A1F3D' }}>
                Audit inspection drill-down
              </h3>
              {t && <RealDataBadge isReal={t.isRealRazorpayCall} size="sm" />}
            </div>
            <p className="text-[11px] font-mono" style={{ color: '#8B98AC' }}>
              ID: {t?._id} · {t?.customerName || t?.customerId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            style={{ color: '#8B98AC', background: '#F6F9FE', border: '1px solid #E3E8F0' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#0A1F3D'; e.currentTarget.style.background = '#E8F0FD'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#8B98AC'; e.currentTarget.style.background = '#F6F9FE'; }}
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {loading ? (
            <div className="py-16 text-center font-mono" style={{ color: '#8B98AC' }}>Loading audit record…</div>
          ) : !t ? (
            <div className="py-16 text-center" style={{ color: '#1E3A6E' }}>Transaction not found.</div>
          ) : (
            <>
              {/* Summary grid */}
              <div
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-[14px]"
                style={{ background: '#F6F9FE', border: '1px solid #E3E8F0' }}
              >
                <div>
                  <span className="text-[11px] block mb-0.5" style={{ color: '#8B98AC' }}>Amount</span>
                  <div className="text-sm font-bold font-mono tabular-nums" style={{ color: '#0A1F3D' }}>
                    ₹{t.amount?.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] block mb-0.5" style={{ color: '#8B98AC' }}>Method / Rail</span>
                  <div className="text-xs font-semibold uppercase font-mono" style={{ color: '#0A1F3D' }}>
                    {t.method} ({t.device})
                  </div>
                </div>
                <div>
                  <span className="text-[11px] block mb-0.5" style={{ color: '#8B98AC' }}>Order ID</span>
                  <div className="text-xs font-mono truncate" style={{ color: '#2B5FE0' }}>
                    {t.razorpayOrderId || 'simulated_order'}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] block mb-1" style={{ color: '#8B98AC' }}>Final outcome</span>
                  <StatusPill
                    status={t.finalOutcome?.recovered ? 'recovered' : (t.outcome?.status === 'success' ? 'prevented' : 'lost')}
                    size="sm"
                  />
                </div>
              </div>

              {/* Layer 1 */}
              <div
                className="rounded-[14px] p-4 space-y-2"
                style={{ border: '1px solid rgba(43,95,224,0.22)', background: 'linear-gradient(180deg, #EDF4FE 0%, #E8F0FD 100%)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-1.5" style={{ color: '#2B5FE0' }}>
                    <Shield className="w-3.5 h-3.5" />
                    Layer 1 (Predict & Prevent) decision
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px]" style={{ color: '#5B6B84' }}>
                      Score: <strong style={{ color: '#0A1F3D' }}>{t.layer1?.riskScore || 0}/100</strong>
                    </span>
                    <StatusPill status={t.layer1?.tier || 'LOW'} size="sm" />
                  </div>
                </div>
                <p style={{ color: '#0A1F3D' }}>
                  Action selected:{' '}
                  <code
                    className="px-1.5 py-0.5 rounded-[6px] font-mono text-[11px]"
                    style={{ color: '#2B5FE0', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(43,95,224,0.2)' }}
                  >
                    {t.layer1?.action || 'PROCEED_NORMAL'}
                  </code>
                </p>
                <p style={{ color: '#5B6B84' }}>
                  <strong style={{ color: '#0A1F3D' }}>Reasoning:</strong> {t.layer1?.reasoning || 'No proactive friction mitigations required.'}
                </p>
              </div>

              {/* Layer 2 */}
              {t.layer2?.category && (
                <div
                  className="rounded-[14px] p-4 space-y-2"
                  style={{ border: '1px solid #E3E8F0', background: '#F6F9FE' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5" style={{ color: '#0A1F3D' }}>
                      <Zap className="w-3.5 h-3.5" style={{ color: '#2B5FE0' }} />
                      Layer 2 (Diagnose & Recover) diagnosis
                    </span>
                    <span
                      className="font-mono text-[11px] px-2 py-0.5 rounded-full"
                      style={{ color: '#2B5FE0', background: 'rgba(43,95,224,0.10)', border: '1px solid rgba(43,95,224,0.2)' }}
                    >
                      {t.layer2.category}
                    </span>
                  </div>
                  <div className="space-y-1.5" style={{ color: '#0A1F3D' }}>
                    <div>
                      Action executed:{' '}
                      <code
                        className="px-1.5 py-0.5 rounded-[6px] font-mono font-semibold text-[11px]"
                        style={{ color: '#2B5FE0', background: 'rgba(43,95,224,0.08)', border: '1px solid rgba(43,95,224,0.18)' }}
                      >
                        {t.layer2.actionTaken}
                      </code>
                    </div>
                    {t.layer2.razorpayPaymentLinkId && (
                      <div className="flex items-center gap-2 font-mono" style={{ color: '#5B6B84' }}>
                        <span>Payment link:</span>
                        <a
                          href={t.layer2.paymentLinkUrl || `https://rzp.io/i/${t.layer2.razorpayPaymentLinkId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 transition-colors"
                          style={{ color: '#2B5FE0' }}
                        >
                          <span>{t.layer2.razorpayPaymentLinkId}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    <div style={{ color: '#5B6B84' }}>
                      <strong style={{ color: '#0A1F3D' }}>Diagnostic rationale:</strong> {t.layer2.reasoning}
                    </div>
                  </div>
                </div>
              )}

              {/* Raw payload */}
              <div>
                <h4 className="font-semibold mb-2" style={{ color: '#0A1F3D' }}>
                  Raw Razorpay webhook / fetch API payload
                </h4>
                <PayloadViewer
                  title={`Razorpay Error Object (${t.isRealRazorpayCall ? 'Real test-mode' : 'Simulated stream'})`}
                  payload={rawPayload}
                  defaultExpanded={true}
                />
              </div>

              {/* Timeline */}
              {auditLogs.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold" style={{ color: '#0A1F3D' }}>Decision sequence log</h4>
                  <div className="space-y-2 font-mono text-[11px]">
                    {auditLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-[10px] flex items-start gap-2.5"
                        style={{ background: '#F6F9FE', border: '1px solid #E3E8F0' }}
                      >
                        <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#8B98AC' }} />
                        <div>
                          <div className="font-semibold" style={{ color: '#2B5FE0' }}>
                            Layer {log.layer} — Decision: {log.decision}
                          </div>
                          <div className="font-sans mt-0.5" style={{ color: '#5B6B84' }}>{log.reasoning}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ borderTop: '1px solid #E3E8F0', background: '#FBFCFE' }}
        >
          <span className="text-[11px]" style={{ color: '#8B98AC' }}>Traceable audit ledger</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-[10px] text-xs font-semibold transition-all"
            style={{ color: '#5B6B84', background: '#FFFFFF', border: '1px solid #E3E8F0' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#2B5FE0'; e.currentTarget.style.color = '#2B5FE0'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E3E8F0'; e.currentTarget.style.color = '#5B6B84'; }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { XCircle, CheckCircle2, ExternalLink, Zap, TrendingDown, TrendingUp } from 'lucide-react';

/**
 * Shared design tokens (see SplitView.jsx / CardExpiryModal.jsx):
 * Strict monochrome — white + shades of blue only.
 * Ink #0A1F3D · Deep #1E3A6E (failed) · Primary #2B5FE0 (success) · Slate #5B6B84
 * Pale #E8F0FD · Ice #F6F9FE · Line #E3E8F0 · Radius: 18 (card) / 12 (controls) / full (pills)
 */

const CARD_SHADOW = '0 1px 1px rgba(10,31,77,0.03), 0 10px 24px -14px rgba(10,31,77,0.22)';

export function OutcomeStrip({
  withoutSystemResult,
  withSystemResult,
  onSimulatePaymentLinkPaid,
  isPaying
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Left — Without system */}
      <OutcomeCard
        icon={
          withoutSystemResult?.status === 'success' ? (
            <CheckCircle2 style={{ width: 18, height: 18, color: '#2B5FE0' }} />
          ) : (
            <XCircle style={{ width: 18, height: 18, color: '#1E3A6E' }} />
          )
        }
        eyebrow="Baseline outcome"
        headline={
          withoutSystemResult
            ? withoutSystemResult.status === 'success'
              ? 'Succeeded organically'
              : `Failed — ${withoutSystemResult.errorReason || 'payment_failed'}`
            : 'Pending live trigger…'
        }
        subline={
          withoutSystemResult?.status === 'success'
            ? 'No intervention needed on this attempt.'
            : 'No automated recovery attempted.'
        }
        metricLabel="Revenue lost"
        metricValue={`₹${(withoutSystemResult?.status === 'success' ? 0 : withoutSystemResult?.amount || 0).toLocaleString('en-IN')}`}
        metricIcon={<TrendingDown style={{ width: 14, height: 14, color: '#1E3A6E' }} />}
        isSuccess={withoutSystemResult?.status === 'success'}
      />

      {/* Right — With our system */}
      <OutcomeCard
        icon={<CheckCircle2 style={{ width: 18, height: 18, color: '#2B5FE0' }} />}
        eyebrow="With our system"
        headline={
          withSystemResult
            ? withSystemResult.isPrevented
              ? `Prevented — ${withSystemResult.layer1Action || 'Layer 1 action'} avoided failure`
              : withSystemResult.isRecovered
              ? withSystemResult.isSilentRecovery
                ? `Recovered silently — confirmed captured, no customer contact`
                : `Recovered — Payment Link ${withSystemResult.paymentLinkId || 'plink_live'} completed`
              : withSystemResult.isRestrained
              ? 'Restrained — paused deliberately per Restraint Principle'
              : `Diagnosed — ${withSystemResult.actionTaken || 'RECOVERY_LINK'} dispatched`
            : 'Pending live trigger…'
        }
        subline="Grounded in real Razorpay signals."
        metricLabel="Revenue saved"
        metricValue={`₹${(withSystemResult?.amountSaved || 0).toLocaleString('en-IN')}`}
        metricIcon={<TrendingUp style={{ width: 14, height: 14, color: '#2B5FE0' }} />}
        isSuccess
        footer={
          withSystemResult?.paymentLinkId ? (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #EEF1F6' }}>
              <a
                href={withSystemResult.paymentLinkUrl || `https://rzp.io/i/${withSystemResult.paymentLinkId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-[8px] transition-colors"
                style={{ color: '#2B5FE0', background: '#F6F9FE', border: '1px solid #E3E8F0' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#E8F0FD'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#F6F9FE'; }}
              >
                <span className="font-mono">{withSystemResult.paymentLinkId}</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              {!withSystemResult.isPaid && (
                <button
                  onClick={() => onSimulatePaymentLinkPaid(withSystemResult.transactionId)}
                  disabled={isPaying}
                  className="inline-flex items-center gap-1.5 text-white text-[11px] font-semibold px-3 py-1.5 rounded-[8px] transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(180deg, #3B6FE8 0%, #2B5FE0 100%)',
                    boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 4px 10px -4px rgba(43,95,224,0.5)',
                  }}
                >
                  <Zap className="w-3 h-3 fill-current" />
                  <span>{isPaying ? 'Confirming…' : 'Simulate paid'}</span>
                </button>
              )}
            </div>
          ) : null
        }
      />
    </div>
  );
}

function OutcomeCard({ icon, eyebrow, headline, subline, metricLabel, metricValue, metricIcon, isSuccess, footer }) {
  return (
    <div
      className="rounded-[18px] bg-white p-4"
      style={{ border: '1px solid #E3E8F0', boxShadow: CARD_SHADOW }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: isSuccess ? 'rgba(43,95,224,0.10)' : 'rgba(30,58,110,0.10)' }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#8B98AC' }}>
              {eyebrow}
            </div>
            <div className="text-xs font-semibold leading-snug" style={{ color: isSuccess ? '#2B5FE0' : '#1E3A6E' }}>
              {headline}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: '#5B6B84' }}>{subline}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3.5 pt-3" style={{ borderTop: '1px solid #EEF1F6' }}>
        <span className="text-[11px]" style={{ color: '#8B98AC' }}>{metricLabel}</span>
        <span className="inline-flex items-center gap-1.5 text-sm font-bold tabular-nums" style={{ color: isSuccess ? '#2B5FE0' : '#1E3A6E' }}>
          {metricIcon}
          {metricValue}
        </span>
      </div>

      {footer}
    </div>
  );
}
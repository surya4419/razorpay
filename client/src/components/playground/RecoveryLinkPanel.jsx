import React from 'react';
import { ExternalLink, CheckCircle2, Zap, Link2 } from 'lucide-react';

/**
 * RecoveryLinkPanel
 * Renders once a real Payment Link is generated. Contains:
 * - The real clickable shortUrl opening Razorpay's hosted payment page
 * - A "Simulate paid" button for demo closure
 *
 * Shared tokens (see SplitView.jsx): Primary #2B5FE0 · Pale #E8F0FD · Slate #5B6B84
 * Ice #F6F9FE · Line #E3E8F0 · Radius: 12 (panel) / 8 (controls)
 */
export function RecoveryLinkPanel({ paymentLinkId, shortUrl, amount, transactionId, onSimulatePaid, isPaid }) {
  if (!shortUrl) return null;

  if (isPaid) {
    return (
      <div
        className="p-3 rounded-[12px] flex items-center gap-2.5"
        style={{ border: '1px solid rgba(43,95,224,0.22)', background: '#E8F0FD' }}
      >
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#2B5FE0' }} />
        <div>
          <div className="text-xs font-semibold" style={{ color: '#2B5FE0' }}>Payment confirmed</div>
          <div className="text-[11px] mt-0.5" style={{ color: '#3E5A8C' }}>
            ₹{amount?.toLocaleString('en-IN')} recovered via Payment Link{' '}
            <span className="font-mono">{paymentLinkId}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-3.5 rounded-[12px]"
      style={{ border: '1px solid #E3E8F0', background: '#F6F9FE' }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Link2 className="w-3.5 h-3.5" style={{ color: '#2B5FE0' }} />
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#2B5FE0' }}>
          Recovery Payment Link ready
        </span>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-[11px]" style={{ color: '#8B98AC' }}>Link ID:</span>
        <span className="text-[11px] font-mono font-medium" style={{ color: '#0A1F3D' }}>{paymentLinkId}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <a
          href={shortUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[8px] transition-colors bg-white"
          style={{ color: '#2B5FE0', border: '1px solid #E3E8F0' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2B5FE0'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E3E8F0'; }}
        >
          <span>Open recovery link</span>
          <ExternalLink className="w-3 h-3" />
        </a>
        {onSimulatePaid && (
          <button
            onClick={onSimulatePaid}
            className="inline-flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-1.5 rounded-[8px] transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(180deg, #3B6FE8 0%, #2B5FE0 100%)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 4px 10px -4px rgba(43,95,224,0.5)',
            }}
          >
            <Zap className="w-3 h-3 fill-current" />
            <span>Simulate paid</span>
          </button>
        )}
      </div>

      <p className="text-[11px] leading-relaxed mt-2.5" style={{ color: '#8B98AC' }}>
        This is a genuine Razorpay-hosted payment page. Open it to complete live with a success card/VPA, or simulate paid to close it instantly for demo purposes.
      </p>
    </div>
  );
}
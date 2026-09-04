import React from 'react';
import { ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react';

/**
 * OtpCompletionPanel
 * Shown in the right pane for the E-mandate > ₹15,000 scenario.
 * Displays the real AFA authentication link and waits for confirmation
 * that the user has completed the OTP step.
 *
 * Shared tokens (see SplitView.jsx): Ink #0A1F3D · Primary #2B5FE0 · Slate #5B6B84
 * Pale #E8F0FD · Ice #F6F9FE · Line #E3E8F0 · Radius: 12 (panel) / 8 (controls)
 */
export function OtpCompletionPanel({ authLinkId, shortUrl, onConfirmComplete, isComplete }) {
  if (!shortUrl) return null;

  if (isComplete) {
    return (
      <div
        className="p-3 rounded-[12px] flex items-center gap-2.5"
        style={{ border: '1px solid rgba(43,95,224,0.22)', background: '#E8F0FD' }}
      >
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#2B5FE0' }} />
        <div>
          <div className="text-xs font-semibold" style={{ color: '#2B5FE0' }}>AFA authentication complete</div>
          <div className="text-[11px] mt-0.5" style={{ color: '#3E5A8C' }}>
            Mandate registered with issuing bank. ₹18,000 recurring charge authorised.
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
        <ShieldCheck className="w-3.5 h-3.5" style={{ color: '#0A1F3D' }} />
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#0A1F3D' }}>
          AFA authentication required
        </span>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-[11px]" style={{ color: '#8B98AC' }}>Auth Link ID:</span>
        <span className="text-[11px] font-mono font-medium truncate" style={{ color: '#0A1F3D' }}>{authLinkId}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-2.5">
        <a
          href={shortUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[8px] transition-colors bg-white"
          style={{ color: '#2B5FE0', border: '1px solid #E3E8F0' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2B5FE0'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E3E8F0'; }}
        >
          <span>Open authentication link</span>
          <ExternalLink className="w-3 h-3" />
        </a>
        {onConfirmComplete && (
          <button
            onClick={onConfirmComplete}
            className="inline-flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-1.5 rounded-[8px] transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(180deg, #16305A 0%, #0A1F3D 100%)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.1) inset, 0 4px 10px -4px rgba(10,31,77,0.5)',
            }}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Mark OTP complete</span>
          </button>
        )}
      </div>

      <p className="text-[11px] leading-relaxed" style={{ color: '#8B98AC' }}>
        Open the link above. Razorpay's real test-mode flow shows a bank OTP entry screen — complete it, then click "Mark OTP complete" to register the successful authentication here.
      </p>
    </div>
  );
}
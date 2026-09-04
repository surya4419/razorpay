import React, { useState } from 'react';
import { CreditCard, AlertCircle, X, ArrowRight, ShieldCheck } from 'lucide-react';

/**
 * Design tokens — shared across this flow, reuse these for every subsequent screen.
 * Strict monochrome: white + shades of blue only. No other hues, including for
 * warning/error states — those are carried by fill weight, icon, and border, not color.
 *
 * Ink     #0A1F3D   headings, primary text, critical/expired emphasis
 * Deep    #1E3A6E   secondary dark, hovers
 * Primary #2B5FE0   primary actions, links, focus
 * Sky     #6FA0F5   mid accents, icon fills on tinted panels
 * Pale    #E8F0FD   light tint backgrounds (attention / recessed panels)
 * Ice     #F6F9FE   lightest surface / app background
 * Slate   #5B6B84   muted text (blue-grey, stays in family)
 * White   #FFFFFF
 *
 * Elevation: 3-stop layered shadow (contact + ambient + glow) instead of one flat
 * drop-shadow, so surfaces read as physical cards rather than flat rounded boxes.
 */

export function CardExpiryModal({ isOpen, onClose, onConfirm, last4 = '1006' }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,31,61,0.55)', backdropFilter: 'blur(3px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-expiry-title"
    >
      <div
        className="relative w-full max-w-[420px] rounded-[28px] overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #FBFCFE 100%)',
          border: '1px solid #DCE7FA',
          boxShadow:
            '0 1px 1px rgba(10,31,77,0.04), 0 12px 24px -8px rgba(10,31,77,0.16), 0 32px 64px -20px rgba(10,31,77,0.28)',
        }}
      >
        {/* Top accent rail — the one bold move on this card */}
        <div
          className="h-[5px] w-full rounded-t-[28px]"
          style={{ background: 'linear-gradient(90deg, #1E3A6E 0%, #2B5FE0 55%, #6FA0F5 100%)' }}
        />

        <div className="p-7">
          {/* Close */}
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ color: '#8FA3C4' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#2B5FE0'; e.currentTarget.style.background = '#F0F4FD'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#8FA3C4'; e.currentTarget.style.background = 'transparent'; }}
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Icon + heading */}
          <div className="flex items-start gap-3.5 mb-5">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(160deg, #EAF1FE 0%, #D7E5FC 100%)',
                boxShadow: 'inset 0 0 0 1px rgba(43,95,224,0.18)',
              }}
            >
              <AlertCircle className="w-5 h-5" style={{ color: '#2B5FE0' }} strokeWidth={2.2} />
            </div>
            <div className="pt-0.5">
              <h3 id="card-expiry-title" className="text-[17px] font-semibold leading-snug" style={{ color: '#0A1F3D' }}>
                Update your card to continue
              </h3>
              <p className="text-[13px] mt-0.5" style={{ color: '#5B6B84' }}>
                Your saved card can't be charged as is
              </p>
            </div>
          </div>

          {/* Card visual — recessed panel with its own soft inner shadow */}
          <div
            className="flex items-center gap-3 px-4 py-3.5 rounded-[18px] mb-5"
            style={{
              background: '#F6F9FE',
              border: '1px solid #E3E8F0',
              boxShadow: 'inset 0 1px 2px rgba(10,31,77,0.04)',
            }}
          >
            <div
              className="w-9 h-9 rounded-[12px] flex items-center justify-center flex-shrink-0"
              style={{ background: '#0A1F3D' }}
            >
              <CreditCard className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-medium tracking-wide" style={{ color: '#0A1F3D' }}>
                Mastercard •••• {last4}
              </div>
              <div className="text-[12px] font-semibold mt-0.5" style={{ color: '#1E3A6E' }}>
                Expired
              </div>
            </div>
            <span
              className="text-[11px] font-medium px-2.5 py-1 rounded-full"
              style={{ background: '#0A1F3D', color: '#FFFFFF' }}
            >
              Action needed
            </span>
          </div>

          {/* Message */}
          <p className="text-[13.5px] leading-relaxed mb-6" style={{ color: '#3E4C63' }}>
            Your saved card ending in{' '}
            <span className="font-semibold" style={{ color: '#0A1F3D' }}>•••• {last4}</span> has expired.
            Update your card details to complete this payment.
          </p>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-[13px] font-medium px-4 py-2.5 rounded-[12px] transition-colors"
                style={{ color: '#5B6B84' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#0A1F3D'; e.currentTarget.style.background = '#F6F9FE'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#5B6B84'; e.currentTarget.style.background = 'transparent'; }}
              >
                Not now
              </button>
            )}
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex items-center gap-2 text-white text-[13px] font-semibold px-5 py-2.5 rounded-[12px] transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(180deg, #3B6FE8 0%, #2B5FE0 100%)',
                boxShadow:
                  '0 1px 0 rgba(255,255,255,0.15) inset, 0 6px 14px -4px rgba(43,95,224,0.45)',
              }}
            >
              Update card
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Trust line */}
          <div className="flex items-center gap-1.5 mt-5 pt-4" style={{ borderTop: '1px solid #EEF1F6' }}>
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: '#2B5FE0' }} />
            <span className="text-[11.5px]" style={{ color: '#8FA3C4' }}>Your card details are encrypted and stored securely</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Demo wrapper so this renders standalone ---
export default function Demo() {
  const [open, setOpen] = useState(true);

  return (
    <div
      className="min-h-[560px] w-full flex items-center justify-center p-8"
      style={{ background: '#F6F9FE' }}
    >
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="text-white text-sm font-semibold px-5 py-3 rounded-[12px]"
          style={{
            background: 'linear-gradient(180deg, #3B6FE8 0%, #2B5FE0 100%)',
            boxShadow: '0 6px 14px -4px rgba(43,95,224,0.45)',
          }}
        >
          Reopen modal
        </button>
      )}
      <CardExpiryModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        last4="1006"
      />
    </div>
  );
}
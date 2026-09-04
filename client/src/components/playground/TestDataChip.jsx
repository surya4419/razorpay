import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * TestDataChip
 * Shows the scenario's real test card / VPA in a copyable chip.
 * The presenter pastes this into Razorpay's own iframe — we cannot do it for them (PCI boundary).
 *
 * Shared tokens: Ink #0A1F3D · Slate #5B6B84 · Line #E3E8F0 · Surface #F6F8FC
 * Primary #2B5FE0 · Radius scale: 12 (controls)
 */
export function TestDataChip({ value, label }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback for environments where clipboard API is restricted
      const el = document.createElement('textarea');
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div
      className="flex items-center gap-2.5 rounded-[12px] px-3.5 py-2.5"
      style={{ background: '#F6F8FC', border: '1px solid #E3E8F0' }}
    >
      <div className="flex flex-col min-w-0 flex-1">
        {label && (
          <span className="text-[10px] leading-none mb-1" style={{ color: '#8B98AC' }}>
            {label}
          </span>
        )}
        <span className="text-xs font-medium tracking-wide truncate" style={{ color: '#2B5FE0' }}>
          {value}
        </span>
      </div>
      <button
        onClick={handleCopy}
        title="Copy to clipboard"
        className="flex-shrink-0 w-7 h-7 rounded-[8px] flex items-center justify-center transition-colors"
        style={{ color: copied ? '#1E3A6E' : '#8B98AC', background: copied ? '#E8F0FD' : 'transparent' }}
        onMouseEnter={e => { if (!copied) { e.currentTarget.style.background = 'rgba(43,95,224,0.08)'; e.currentTarget.style.color = '#2B5FE0'; } }}
        onMouseLeave={e => { if (!copied) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8B98AC'; } }}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

// --- Demo wrapper ---
export default function Demo() {
  return (
    <div style={{ background: '#FBFCFE' }} className="p-8 space-y-3 max-w-sm">
      <TestDataChip value="4111 1111 1111 1111" label="Test card" />
      <TestDataChip value="success@razorpay" label="Test VPA" />
    </div>
  );
}
import React from 'react';
import { ShieldCheck, Cpu } from 'lucide-react';

export function RealDataBadge({ isReal = true, size = 'md' }) {
  if (isReal) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded border border-[#528FF0]/20 bg-[#528FF0]/[0.08] text-[#528FF0] ${
          size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
        }`}
      >
        <ShieldCheck className="w-3.5 h-3.5 text-[#528FF0]" />
        <span>Real Razorpay call</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded border border-gray-200 bg-gray-50 text-[#6B7280] ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <Cpu className="w-3 h-3 text-[#6B7280]" />
      <span>Simulated batch</span>
    </span>
  );
}





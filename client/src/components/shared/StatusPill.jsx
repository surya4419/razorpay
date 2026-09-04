import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Clock, Ban } from 'lucide-react';

export function StatusPill({ status, label, size = 'md' }) {
  const norm = (status || '').toLowerCase();

  let colorClasses = 'bg-gray-50 border-gray-200 text-[#6B7280]';
  let Icon = Clock;
  let text = label || status;

  if (norm === 'recovered' || norm === 'success') {
    colorClasses = 'bg-[#ecfdf5] border-[#10b981]/25 text-[#10b981]';
    Icon = CheckCircle2;
    text = label || 'Recovered';
  } else if (norm === 'prevented') {
    colorClasses = 'bg-[#FEF3C7] border-[#D97706]/25 text-[#D97706]';
    Icon = ShieldCheck;
    text = label || 'Prevented';
  } else if (norm === 'failed' || norm === 'lost') {
    colorClasses = 'bg-[#FEF2F2] border-[#DC2626]/25 text-[#DC2626]';
    Icon = XCircle;
    text = label || 'Lost';
  } else if (norm === 'restrained' || norm === 'restraint') {
    colorClasses = 'bg-gray-50 border-[#D1D5DB] text-[#111827]';
    Icon = Ban;
    text = label || 'Restrained';
  } else if (norm === 'high' || norm === 'high_risk') {
    colorClasses = 'bg-[#FEF2F2] border-[#DC2626]/25 text-[#DC2626]';
    Icon = AlertTriangle;
    text = label || 'High risk';
  } else if (norm === 'medium') {
    colorClasses = 'bg-[#FEF3C7] border-[#D97706]/25 text-[#D97706]';
    Icon = AlertTriangle;
    text = label || 'Medium risk';
  } else if (norm === 'low') {
    colorClasses = 'bg-[#ecfdf5] border-[#10b981]/25 text-[#10b981]';
    Icon = CheckCircle2;
    text = label || 'Low risk';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded border ${colorClasses} ${sizeClasses}`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{text}</span>
    </span>
  );
}





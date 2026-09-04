import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Clock, Ban } from 'lucide-react';

// Blue-only palette
// Strong:  #2B5FE0  bg: rgba(43,95,224,0.10)  border: rgba(43,95,224,0.22)
// Mid:     #3E63B0  bg: rgba(62,99,176,0.10)   border: rgba(62,99,176,0.22)
// Muted:   #5B6B84  bg: rgba(91,107,132,0.08)  border: rgba(91,107,132,0.18)
// Dark:    #0A1F3D  bg: rgba(10,31,77,0.07)    border: rgba(10,31,77,0.16)

export function StatusPill({ status, label, size = 'md' }) {
  const norm = (status || '').toLowerCase();

  let style = { background: 'rgba(91,107,132,0.08)', border: '1px solid rgba(91,107,132,0.18)', color: '#5B6B84' };
  let Icon = Clock;
  let text = label || status;

  if (norm === 'recovered' || norm === 'success') {
    style = { background: 'rgba(43,95,224,0.10)', border: '1px solid rgba(43,95,224,0.22)', color: '#2B5FE0' };
    Icon = CheckCircle2;
    text = label || 'Recovered';
  } else if (norm === 'prevented') {
    style = { background: 'rgba(62,99,176,0.10)', border: '1px solid rgba(62,99,176,0.22)', color: '#3E63B0' };
    Icon = ShieldCheck;
    text = label || 'Prevented';
  } else if (norm === 'failed' || norm === 'lost') {
    style = { background: 'rgba(10,31,77,0.08)', border: '1px solid rgba(10,31,77,0.18)', color: '#1E3A6E' };
    Icon = XCircle;
    text = label || 'Lost';
  } else if (norm === 'restrained' || norm === 'restraint') {
    style = { background: 'rgba(10,31,77,0.05)', border: '1px solid rgba(10,31,77,0.12)', color: '#5B6B84' };
    Icon = Ban;
    text = label || 'Restrained';
  } else if (norm === 'high' || norm === 'high_risk') {
    style = { background: 'rgba(10,31,77,0.08)', border: '1px solid rgba(10,31,77,0.18)', color: '#1E3A6E' };
    Icon = AlertTriangle;
    text = label || 'High risk';
  } else if (norm === 'medium') {
    style = { background: 'rgba(62,99,176,0.10)', border: '1px solid rgba(62,99,176,0.22)', color: '#3E63B0' };
    Icon = AlertTriangle;
    text = label || 'Medium risk';
  } else if (norm === 'low') {
    style = { background: 'rgba(43,95,224,0.08)', border: '1px solid rgba(43,95,224,0.18)', color: '#2B5FE0' };
    Icon = CheckCircle2;
    text = label || 'Low risk';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${sizeClasses}`}
      style={style}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{text}</span>
    </span>
  );
}

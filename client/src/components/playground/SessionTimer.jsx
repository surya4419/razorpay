import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

/**
 * SessionTimer
 * A genuine, ticking countdown anchored to the checkout's real timeout value.
 * Starts when startedAt is set, resets when reset().
 *
 * @param {number} totalSeconds - The timeout value from Checkout config
 * @param {boolean} running - Whether the timer is counting down
 * @param {string} label - Optional short label ("Session window")
 *
 * Shared tokens: Ink #0A1F3D · Slate #5B6B84 · Line #E3E8F0 · Surface #F6F9FE
 * Strict blue monochrome: urgency shown via shade, not hue —
 * Primary #2B5FE0 (healthy) · Deep #1E3A6E (low) · Ink #0A1F3D (critical)
 */
export function SessionTimer({ totalSeconds = 180, running = false, label = 'Session window' }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    setRemaining(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${minutes}:${String(seconds).padStart(2, '0')}`;

  const pct = Math.round((remaining / totalSeconds) * 100);
  const barColor = pct > 50 ? '#2B5FE0' : pct > 20 ? '#1E3A6E' : '#0A1F3D';

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 rounded-[12px]"
      style={{ background: '#F6F9FE', border: '1px solid #E3E8F0' }}
    >
      <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#8B98AC' }} />
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[10px] leading-none" style={{ color: '#8B98AC' }}>{label}</span>
        <span className="text-sm font-bold tabular-nums leading-none" style={{ color: barColor }}>
          {display}
        </span>
      </div>
      {/* Progress bar */}
      <div className="w-12 h-1.5 rounded-full overflow-hidden ml-1 flex-shrink-0" style={{ background: '#E3E8F0' }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

// --- Demo wrapper ---
export default function Demo() {
  return (
    <div style={{ background: '#FBFCFE' }} className="p-8 flex gap-4">
      <SessionTimer totalSeconds={180} running={false} label="Session window (baseline)" />
      <SessionTimer totalSeconds={300} running={false} label="Session window (extended)" />
    </div>
  );
}
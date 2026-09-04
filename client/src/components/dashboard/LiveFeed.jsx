import React, { useRef, useState } from 'react';
import { RealDataBadge } from '../shared/RealDataBadge.jsx';
import { StatusPill } from '../shared/StatusPill.jsx';
import { Radio } from 'lucide-react';

const TILT_MAX = 5;

export function LiveFeed({ events = [], onSelectTransaction }) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [glow, setGlow] = useState({ x: 50, y: 0, active: false });
  const [interacting, setInteracting] = useState(false);

  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({ ry: (px - 0.5) * TILT_MAX * 2, rx: -(py - 0.5) * TILT_MAX * 2 });
    setGlow({ x: px * 100, y: py * 100, active: true });
  };

  const handleEnter = () => setInteracting(true);
  const handleLeave = () => {
    setInteracting(false);
    setTilt({ rx: 0, ry: 0 });
    setGlow(g => ({ ...g, active: false }));
  };

  return (
    <div style={{ perspective: 1400 }} className="h-full">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className={`relative flex flex-col h-full rounded-[20px] bg-white overflow-hidden ${interacting ? '' : 'transition-transform duration-500 ease-out'}`}
        style={{
          border: '1px solid #E3E8F0',
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transformStyle: 'preserve-3d',
          boxShadow: interacting
            ? '0 2px 4px rgba(10,31,77,0.08), 0 32px 60px -16px rgba(10,31,77,0.34)'
            : '0 2px 4px rgba(10,31,77,0.06), 0 16px 40px -12px rgba(10,31,77,0.24)',
          transition: interacting ? 'box-shadow 200ms ease-out' : 'transform 500ms ease-out, box-shadow 500ms ease-out',
        }}
      >
        {/* Spotlight glow */}
        <div
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
          style={{
            opacity: glow.active ? 1 : 0,
            background: `radial-gradient(420px circle at ${glow.x}% ${glow.y}%, rgba(43,95,224,0.08), transparent 60%)`,
          }}
        />

        {/* Top accent rail */}
        <div className="h-[3px] w-full flex-shrink-0" style={{ background: 'linear-gradient(90deg, #1E3A6E 0%, #2B5FE0 55%, #6FA0F5 100%)' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid #EEF1F6' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
              style={{ background: '#E8F0FD', color: '#2B5FE0' }}
            >
              <Radio style={{ width: 18, height: 18 }} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold" style={{ color: '#0A1F3D' }}>Real-time event stream</h3>
              <p className="text-xs mt-0.5" style={{ color: '#5B6B84' }}>Live pipeline activity as transactions process</p>
            </div>
          </div>
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ color: '#2B5FE0', background: 'rgba(43,95,224,0.10)', border: '1px solid rgba(43,95,224,0.2)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#2B5FE0' }} />
            Listening
          </span>
        </div>

        {/* Stream list */}
        <div className="overflow-y-auto text-xs" style={{ maxHeight: '520px' }}>
          {events.length > 0 ? (
            events.map((evt, idx) => {
              const data = evt.data || {};
              const isReal = Boolean(data.isRealRazorpayCall || evt.type?.startsWith('razorpay:'));
              const status = data.status || (data.recovered ? 'recovered' : (data.isPrevented ? 'prevented' : (data.restraint ? 'restrained' : 'processed')));

              return (
                <div
                  key={idx}
                  onClick={() => data.transactionId && onSelectTransaction?.(data.transactionId)}
                  className="px-5 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors duration-150"
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(43,95,224,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="flex items-start gap-3 overflow-hidden">
                    <div className="text-[11px] font-mono w-14 flex-shrink-0 pt-0.5" style={{ color: '#8B98AC' }}>
                      {evt.timestamp}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate" style={{ color: '#0A1F3D' }}>
                          {data.scenario || data.customerName || data.category || evt.type}
                        </span>
                        {isReal && <RealDataBadge isReal={true} size="sm" />}
                      </div>
                      <div className="text-[11px] truncate mt-0.5" style={{ color: '#8B98AC' }}>
                        {data.layer1?.action ? `L1: ${data.layer1.action} ` : ''}
                        {data.layer2?.actionTaken ? `• L2: ${data.layer2.actionTaken} ` : ''}
                        {data.amount ? `(₹${data.amount.toLocaleString('en-IN')})` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <StatusPill status={status} size="sm" />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex items-center justify-center text-xs italic p-6 text-center" style={{ color: '#8B98AC', minHeight: 120 }}>
              Waiting for live transactions or batch simulation events…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

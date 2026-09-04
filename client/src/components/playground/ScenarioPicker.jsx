import React from 'react';
import { ShieldAlert, Clock, RefreshCw, Cpu, AlertCircle, Zap, ArrowRight, Check } from 'lucide-react';
import img1 from '../../images/1.png';
import img2 from '../../images/2.png';
import img3 from '../../images/3.png';
import img4 from '../../images/4.png';
import img5 from '../../images/5.png';
import img6 from '../../images/6.png';

// ─── Scenario definitions ────────────────────────────────────────────────────
// Ordered as they appear in the UI: 4 prevention, then 2 recovery
export const SCENARIOS = [
  // ── PREVENTION (Layer 1 changes the outcome before any failure occurs) ────
  {
    id: 'payment_timed_out',
    name: 'Slow network / Timeout',
    category: 'Infra failure',
    type: 'prevention',
    demonstrates: 'Peak-hour latency signal → session window extended from 3:00 to 5:00',
    amount: 4500,
    method: 'card',
    transactionType: 'one-off',
    testInstrument: '4100 2800 0009 0000',
    testInstrumentLeft: '4100 2800 0009 0000',
    testInstrumentRight: '4100 2800 0009 0000',
    testInstrumentNote: 'On Razorpay\'s mock bank screen, select "Failure → payment_timed_out"',
    expectedReason: 'payment_timed_out',
    timeoutWithout: 180,
    timeoutWith: 300,
    icon: Clock,
    image: img2,
    description: 'Peak-hour slow network detected. Left: 3:00 session → timed out, lost. Right: Layer 1 extends to 5:00 → customer completes before bank gateway drops.'
  },
  {
    id: 'high_risk_new_device',
    name: 'High-risk new device',
    category: 'Fraud signal',
    type: 'prevention',
    demonstrates: 'New device + ₹24,000 → Wallet/UPI offered first instead of card',
    amount: 24000,
    method: 'card',
    transactionType: 'one-off',
    testInstrument: 'Left: 4100 2800 0009 0000 (bank decline). Right: success@razorpay (Wallet/UPI first)',
    testInstrumentLeft: '4100 2800 0009 0000',
    testInstrumentRight: 'success@razorpay',
    testInstrumentNote: 'Left: 4100 2800 0009 0000 (select Failure → bank decline). Right: Wallet pre-selected (success@razorpay)',
    expectedReason: 'do_not_honor',
    icon: Cpu,
    image: img4,
    description: 'New device + ₹24,000 = high issuing-bank fraud-score profile on card. Left: card-first → bank declines. Right: risk scorer routes to Wallet/UPI first → frictionless capture.'
  },
  {
    id: 'emandate_above_15k',
    name: 'E-mandate > ₹15,000',
    category: 'Regulatory AFA',
    type: 'prevention',
    demonstrates: 'RBI AFA threshold → proactive OTP authentication before charge',
    amount: 18000,
    method: 'subscription',
    transactionType: 'recurring',
    testInstrument: 'AutoPay Mandate (₹18,000)',
    testInstrumentLeft: null,
    testInstrumentRight: null,
    testInstrumentNote: null,
    expectedReason: 'mandate_max_amount_exceeded',
    icon: ShieldAlert,
    image: img1,
    description: 'RBI mandates fresh OTP/AFA for recurring charges > ₹15,000. Left: blind charge attempt → instant rejection. Right: AFA collected upfront → charge authorised.'
  },
  {
    id: 'expiring_saved_card',
    name: 'Expiring saved card',
    category: 'Token expiry',
    type: 'prevention',
    demonstrates: 'Stored token expiry check → proactive card update before checkout',
    amount: 6800,
    method: 'card',
    transactionType: 'one-off',
    testInstrument: 'Left: 5555 5100 0008 1006 (past expiry). Right: 5555 5100 0008 1006 (updated)',
    testInstrumentLeft: '5555 5100 0008 1006 (past expiry, e.g. 01/23)',
    testInstrumentRight: '4100 2800 0000 1007',
    testInstrumentNote: 'Left: 5555 5100 0008 1006 with past expiry. Right: 4100 2800 0000 1007 with valid expiry',
    expectedReason: 'card_expired',
    icon: RefreshCw,
    image: img3,
    description: 'Returning customer\'s saved card expires this month. Left: checkout blindly opens → card fails at bank. Right: Layer 1 flags expiry before Checkout even opens, prompts update → success on first attempt.'
  },

  // ── RECOVERY (Layer 2+3 chase money back after failure) ───────────────────
  {
    id: 'stuck_ambiguous',
    name: 'Stuck/Ambiguous Transaction',
    category: 'Reconciliation gap',
    type: 'recovery',
    demonstrates: 'Webhook drop → real API status lookup → silent recovery, no customer contact',
    amount: 7400,
    method: 'card',
    transactionType: 'one-off',
    testInstrument: 'success@razorpay (or any succeeding test card)',
    testInstrumentLeft: 'success@razorpay',
    testInstrumentRight: 'success@razorpay',
    testInstrumentNote: 'Complete payment normally — demo harness suppresses the webhook so watchdog flags it ambiguous, then real API lookup confirms captured',
    expectedReason: 'webhook_drop',
    icon: AlertCircle,
    image: img5,
    description: 'Bank debited ₹7,400 but merchant system shows "failed" — gateway webhook was dropped mid-flight. Left: customer re-charged → double payment. Right: Layer 2 queries real Razorpay status → already captured → recovered silently, no customer contact.'
  },
  {
    id: 'upi_instant_decline',
    name: 'UPI instant decline',
    category: 'UPI failure',
    type: 'recovery',
    demonstrates: 'UPI rail failure → Payment Link pivots customer to card/netbanking',
    amount: 1850,
    method: 'upi',
    transactionType: 'one-off',
    testInstrument: 'failure@razorpay',
    testInstrumentLeft: 'failure@razorpay',
    testInstrumentRight: 'failure@razorpay',
    testInstrumentNote: 'VPA failure@razorpay always declines deterministically',
    expectedReason: 'incorrect_pin',
    icon: Zap,
    image: img6,
    description: 'VPA-specific UPI decline. Left: failed, no follow-up. Right: Layer 2 classifies as UPI-fixable, Layer 3 generates Payment Link letting customer pay via card/netbanking instead.'
  }
];

/**
 * Shared design tokens (see CardExpiryModal.jsx / Navbar.jsx / SplitView.jsx):
 * Strict monochrome — white + shades of blue only.
 * Ink #0A1F3D (prevention group) · Mid #3E63B0 (recovery group)
 * Primary #2B5FE0 · Slate #5B6B84 · Line #E3E8F0 · Ice #F6F9FE · Pale #E8F0FD
 * Radius scale: 20 (product card) / 12 (controls) / full (pills)
 *
 * Card pattern is intentionally e-commerce (Amazon/Flipkart/Razorpay listing-card
 * style): illustrated image block on top, meta + price below, quiet default
 * shadow that lifts on hover — not a flat bordered list row.
 */

const CARD_SHADOW = '0 1px 1px rgba(10,31,77,0.03), 0 10px 24px -14px rgba(10,31,77,0.22)';

// ─── Component ───────────────────────────────────────────────────────────────
export function ScenarioPicker({ selectedScenario, onSelectScenario, onRunDemo, isRunning, hideRunButton, flat }) {
  const preventionScenarios = SCENARIOS.filter(s => s.type === 'prevention');
  const recoveryScenarios = SCENARIOS.filter(s => s.type === 'recovery');

  // Default active tab to whichever type the selected scenario belongs to
  const [activeTab, setActiveTab] = React.useState(
    selectedScenario?.type === 'recovery' ? 'recovery' : 'prevention'
  );

  const visibleScenarios = activeTab === 'prevention' ? preventionScenarios : recoveryScenarios;

  return (
    <div>
      {/* Header + Tabs inline */}
      <div className="flex items-center gap-4 mb-5">
        <h2 className="text-sm font-semibold whitespace-nowrap" style={{ color: '#0A1F3D' }}>
          Live test scenario
        </h2>
        <div className="flex gap-1 rounded-[10px] p-1" style={{ background: '#E8ECF2' }}>
          {['prevention', 'recovery'].map(tab => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-1 rounded-[8px] text-xs font-semibold capitalize transition-all duration-200"
                style={{
                  background: active ? '#FFFFFF' : 'transparent',
                  color: active ? '#0A1F3D' : '#5B6B84',
                  boxShadow: active ? '0 1px 4px rgba(10,31,77,0.10)' : 'none',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            );
          })}
        </div>
        {!hideRunButton && onRunDemo && (
          <button
            onClick={onRunDemo}
            disabled={isRunning}
            className="ml-auto inline-flex items-center justify-center gap-2 text-white px-4 py-2 rounded-[10px] font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-50"
            style={{
              background: 'linear-gradient(180deg, #3B6FE8 0%, #2B5FE0 100%)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 14px -6px rgba(43,95,224,0.5)',
            }}
          >
            <span>{isRunning ? 'Executing…' : 'Trigger side-by-side test'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {visibleScenarios.map(sc => (
          <ScenarioCard key={sc.id} sc={sc} selected={selectedScenario?.id === sc.id} onClick={() => onSelectScenario(sc)} />
        ))}
      </div>
    </div>
  );
}

// ─── Illustrated image block ───────────────────────────────────────────────
// Custom generated artwork per scenario (not a stock photo — abstract fintech
// concepts don't have real product photography) so every card still gets a
// genuine "image" area like an Amazon/Flipkart listing thumbnail.
function ScenarioArt({ Icon, accent }) {
  const gid = React.useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 300 150" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`bg-${gid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EEF4FE" />
          <stop offset="100%" stopColor="#DCE8FC" />
        </linearGradient>
        <radialGradient id={`glow-${gid}`} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.16" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="150" fill={`url(#bg-${gid})`} />
      <rect width="300" height="150" fill={`url(#glow-${gid})`} />
      <circle cx="150" cy="75" r="46" fill="#FFFFFF" opacity="0.6" />
      <circle cx="150" cy="75" r="46" fill="none" stroke={accent} strokeOpacity="0.18" strokeWidth="1" />
      <circle cx="150" cy="75" r="30" fill="#FFFFFF" />
      <circle cx="44" cy="24" r="3" fill={accent} opacity="0.25" />
      <circle cx="256" cy="118" r="4" fill={accent} opacity="0.2" />
      <circle cx="264" cy="30" r="2.5" fill={accent} opacity="0.3" />
      <foreignObject x="128" y="53" width="44" height="44">
        <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
          <Icon size={22} strokeWidth={2.1} />
        </div>
      </foreignObject>
    </svg>
  );
}

function ScenarioCard({ sc, selected, onClick }) {
  const Icon = sc.icon;
  const BLUE = '#2B5FE0';

  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left rounded-[16px] overflow-hidden flex flex-col transition-all duration-300 ease-out hover:-translate-y-1 focus:outline-none"
      style={{
        background: '#F3F5F9',
        boxShadow: selected
          ? `0 0 0 2px rgba(43,95,224,0.45), 0 16px 48px -8px rgba(43,95,224,0.62)`
          : '0 2px 8px rgba(10,31,77,0.06), 0 12px 28px -10px rgba(10,31,77,0.18)',
      }}
    >
      {/* Selected check badge */}
      {selected && (
        <div
          className="absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: BLUE, boxShadow: '0 2px 8px rgba(43,95,224,0.45)' }}
        >
          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
        </div>
      )}

      {/* Image block */}
      <div className="relative w-full aspect-[16/9] overflow-hidden">
        <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.06]">
          <img src={sc.image} alt={sc.name} className="w-full h-full object-cover" />
        </div>
        <span
          className="absolute top-2.5 left-2.5 text-[9.5px] font-semibold px-2 py-1 rounded-full"
          style={{ background: 'rgba(255,255,255,0.92)', color: '#0A1F3D', backdropFilter: 'blur(2px)' }}
        >
          {sc.category}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-4 pt-3.5 pb-4">
        <h3 className="text-[13px] font-semibold leading-snug mb-1.5" style={{ color: '#0A1F3D' }}>
          {sc.name}
        </h3>
        <p className="text-[11px] leading-relaxed mb-3" style={{ color: '#5B6B84' }}>
          {sc.description.length > 92 ? sc.description.slice(0, 92).trim() + '…' : sc.description}
        </p>

        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-sm font-bold tabular-nums" style={{ color: '#0A1F3D' }}>
            ₹{sc.amount.toLocaleString('en-IN')}
          </span>
          <span
            className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2.5 py-1.5 rounded-[8px]"
            style={{ color: BLUE, background: 'rgba(43,95,224,0.08)' }}
          >
            Run scenario
            <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </button>
  );
}

// --- Demo wrapper ---
export default function Demo() {
  const [selected, setSelected] = React.useState(SCENARIOS[0]);
  return (
    <div style={{ background: '#F6F9FE' }} className="p-8">
      <ScenarioPicker selectedScenario={selected} onSelectScenario={setSelected} onRunDemo={() => {}} isRunning={false} />
    </div>
  );
}
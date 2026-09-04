import React from 'react';
import {
  CheckCircle2, XCircle, Ban, CreditCard, Zap,
  AlertCircle, ArrowRight, RotateCcw, ShieldAlert,
  RefreshCw, Cpu, Clock, Play, Activity, Smartphone
} from 'lucide-react';
import { TestDataChip } from './TestDataChip.jsx';
import { SessionTimer } from './SessionTimer.jsx';
import { RecoveryLinkPanel } from './RecoveryLinkPanel.jsx';
import { OtpCompletionPanel } from './OtpCompletionPanel.jsx';
import { CardExpiryModal } from './CardExpiryModal.jsx';
import { PayloadViewer } from '../shared/PayloadViewer.jsx';
import { RealDataBadge } from '../shared/RealDataBadge.jsx';

/**
 * Design language, v3
 * ────────────────────
 * v2 flattened everything into hairline rows — technically less "boxy" but
 * it read as an unfinished wireframe, not a real product. Real card UIs
 * (Amazon order tracking, a Flipkart product grid, a fintech card page)
 * don't avoid boxes — they box actual *objects* (a product, a profile, an
 * order, a card) with real elevation, solid badge pills, and an avatar or
 * icon that carries meaning. What they don't do is wrap every sentence in
 * its own tinted panel.
 *
 * So v3 groups content into a handful of real "objects" per pane — the
 * pre-checkout decision, the order + payment instrument, the outcome —
 * each rendered as one elevated white card with an icon and a badge. The
 * pane itself sits on a soft grey field so the white cards actually read
 * as raised, the way a product card reads as raised against a page.
 *
 * Ink    #0A1F3D   headings, strongest text
 * Deep   #1E3A6E   failure accent
 * Accent #2B5FE0   primary action / success accent
 * Mid    #3E63B0   attention / pending accent
 * Slate  #5B6B84   secondary text
 * Mute   #8B98AC   tertiary text, timestamps
 * Field  #F3F5F9   the recessed field the cards sit on
 *
 * v4: dropped every structural border. Elevation now comes purely from
 * layered shadow (contact + lift + ambient), so a pane and the cards
 * inside it read as one surface at different heights, not boxes stacked
 * in a box. The only rules left are a couple of near-invisible dividers
 * splitting two paragraphs inside a single card — not container edges.
 */

const INK = '#0A1F3D';
const DEEP = '#1E3A6E';
const ACCENT = '#2B5FE0';
const MID = '#3E63B0';
const SLATE = '#5B6B84';
const MUTE = '#8B98AC';
const LINE = '#E7EBF2';
const FIELD = '#F3F5F9';

// Layered, realistic shadows do the work borders used to do. A contact
// shadow (tight, dark) grounds the surface; a mid shadow gives it lift;
// an ambient shadow (wide, faint) is what makes it read as floating
// rather than outlined. No border anywhere in this elevation system.
const PANE_SHADOW = [
  '0 1px 1px rgba(10,31,77,0.04)',
  '0 6px 12px -4px rgba(10,31,77,0.08)',
  '0 24px 40px -12px rgba(10,31,77,0.16)',
  '0 56px 80px -24px rgba(10,31,77,0.22)',
].join(', ');
const PANE_SHADOW_ACCENT = [
  '0 1px 1px rgba(10,31,77,0.03)',
  '0 8px 16px -4px rgba(43,95,224,0.14)',
  '0 28px 48px -14px rgba(43,95,224,0.22)',
  '0 64px 96px -20px rgba(43,95,224,0.28)',
].join(', ');
const CARD_SHADOW = [
  '0 1px 1px rgba(10,31,77,0.03)',
  '0 4px 8px -2px rgba(10,31,77,0.05)',
  '0 16px 28px -10px rgba(10,31,77,0.12)',
].join(', ');
const CARD_SHADOW_SOFT = [
  '0 1px 1px rgba(10,31,77,0.02)',
  '0 3px 6px -2px rgba(10,31,77,0.04)',
  '0 10px 20px -8px rgba(10,31,77,0.08)',
].join(', ');

// ─── Card — the one elevation unit, used for actual objects only ─────────
// No border: shadow alone carries the edge, so nesting cards never reads
// as "boxes inside a box" — just surfaces at different heights.
function Card({ children, style = {}, className = '', soft = false }) {
  return (
    <div
      className={`rounded-[14px] p-4 ${className}`}
      style={{ background: 'rgba(10,31,77,0.04)', ...style }}
    >
      {children}
    </div>
  );
}

function Badge({ tone = 'neutral', children }) {
  const tones = {
    neutral: { background: '#EBEFF5', color: SLATE },
    accent: { background: ACCENT, color: '#fff' },
    ink: { background: INK, color: '#fff' },
    failed: { background: DEEP, color: '#fff' },
    success: { background: ACCENT, color: '#fff' },
    attention: { background: MID, color: '#fff' },
  };
  return (
    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full inline-flex items-center tracking-wide" style={tones[tone] || tones.neutral}>
      {children}
    </span>
  );
}

function IconAvatar({ icon: Icon, tone = 'neutral', size = 36 }) {
  const tones = {
    neutral: { background: '#EBEFF5', color: SLATE },
    ink: { background: INK, color: '#fff' },
    accent: { background: ACCENT, color: '#fff' },
    failed: { background: DEEP, color: '#fff' },
    attention: { background: MID, color: '#fff' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: t.background }}
    >
      <Icon style={{ width: size * 0.44, height: size * 0.44, color: t.color }} />
    </div>
  );
}

// ─── A small, physically-styled payment instrument mockup ─────────────────
// Purely decorative — the real value + copy affordance still comes from
// TestDataChip. This just gives the instrument a face, the way a checkout
// page shows a little card glyph next to "•••• 4242".
function InstrumentGlyph({ method, tone = 'ink' }) {
  const gradients = {
    ink: 'linear-gradient(135deg, #24406C 0%, #0A1F3D 100%)',
    accent: 'linear-gradient(135deg, #4A7BEE 0%, #1E3A6E 100%)',
  };
  if (method === 'upi') {
    return (
      <div
        className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0"
        style={{ background: gradients[tone], boxShadow: '0 6px 14px -6px rgba(10,31,77,0.5)' }}
      >
        <Smartphone className="w-5 h-5 text-white" />
      </div>
    );
  }
  return (
    <div
      className="w-14 h-9 rounded-[7px] relative flex-shrink-0 overflow-hidden"
      style={{ background: gradients[tone], boxShadow: '0 6px 14px -6px rgba(10,31,77,0.5), inset 0 1px 0 rgba(255,255,255,0.18)' }}
    >
      <div className="absolute rounded-[2px]" style={{ top: 6, left: 8, width: 14, height: 9, background: 'rgba(255,255,255,0.55)' }} />
      <div className="absolute" style={{ bottom: 6, left: 8, right: 8, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)' }} />
    </div>
  );
}

// ─── StatusNotice — the outcome card ───────────────────────────────────────
function StatusNotice({ tone = 'neutral', icon: Icon, title, tag, children, footnote }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        {Icon && <IconAvatar icon={Icon} tone={tone === 'failed' ? 'failed' : tone === 'success' ? 'accent' : tone === 'attention' ? 'attention' : 'ink'} />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-[13px] font-semibold" style={{ color: INK }}>{title}</span>
            {tag && <Badge tone={tone}>{tag}</Badge>}
          </div>
          {children && <div className="text-[12px] leading-relaxed" style={{ color: SLATE }}>{children}</div>}
          {footnote && <div className="text-[11px] mt-1.5 italic" style={{ color: MUTE }}>{footnote}</div>}
        </div>
      </div>
    </Card>
  );
}

// ─── FailedBadge ─────────────────────────────────────────────────────────
// Driven by transaction.outcome.status === 'failed' from the database
export function FailedBadge({ errorReason, message }) {
  return (
    <StatusNotice tone="failed" icon={XCircle} title="Payment failed" tag="Failed">
      {errorReason ? `Reason: ${errorReason}` : message || 'Authorization declined or popup closed'}
    </StatusNotice>
  );
}

// ─── Public: renders the two panes side by side ────────────────────────────
export function SplitView({ scenario, withoutMachine, withMachine }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaneCard
          title="Without our system"
          subtitle="Standard naive checkout — no pre-checks, no intelligent recovery."
          badge="Naive baseline"
          badgeTone="neutral"
          scenario={scenario}
          machine={withoutMachine}
          pane="without"
        />
        <PaneCard
          title="With our system"
          subtitle="Grounded in Razorpay APIs, error taxonomy & contextual learning."
          badge="3-layer engine"
          badgeTone="accent"
          scenario={scenario}
          machine={withMachine}
          pane="with"
          accentTop
        />
      </div>
    </div>
  );
}

// ─── Timeout comparison banner ─────────────────────────────────────────────
function TimeoutComparisonBanner({ withoutTimeout, withTimeout }) {
  const pct = Math.round(((withTimeout - withoutTimeout) / withoutTimeout) * 100);
  const withoutMins = Math.floor(withoutTimeout / 60);
  const withoutSecs = withoutTimeout % 60;
  const withMins = Math.floor(withTimeout / 60);
  const withSecs = withTimeout % 60;
  const fmt = (m, s) => `${m}:${String(s).padStart(2, '0')}`;

  return (
    <Card className="flex items-center gap-3">
      <IconAvatar icon={Clock} tone="accent" size={32} />
      <span className="text-xs leading-relaxed" style={{ color: SLATE }}>
        Session window: baseline{' '}
        <span className="font-semibold" style={{ color: INK }}>{fmt(withoutMins, withoutSecs)}</span>, with our
        system{' '}
        <span className="font-semibold" style={{ color: ACCENT }}>{fmt(withMins, withSecs)}</span>{' '}
        <span className="font-semibold" style={{ color: ACCENT }}>(+{pct}% more time to complete)</span>
      </span>
      <span className="text-[11px] ml-auto flex-shrink-0 hidden sm:inline" style={{ color: MUTE }}>From real Checkout config values</span>
    </Card>
  );
}

// ─── Single pane card ──────────────────────────────────────────────────────
function PaneCard({ title, subtitle, badge, badgeTone, scenario, machine, pane, accentTop }) {
  const isWithSystem = pane === 'with';
  const {
    state, error, loading, transaction,
    orderData, layer1Decision, timeoutSeconds, timerRunning,
    paymentResult, diagnosis,
    recoveryLink, isPaid,
    afaLink, afaComplete,
    retryOrderData,
    actions
  } = machine;

  const isEmandate = scenario.id === 'emandate_above_15k';
  const isTimeout = scenario.id === 'payment_timed_out';
  const isExpiringCard = scenario.id === 'expiring_saved_card';
  const isHighRisk = scenario.id === 'high_risk_new_device';

  // Modal #1 for expiring saved card sequential flow
  const [showExpiryModal, setShowExpiryModal] = React.useState(false);

  // Read status directly from persisted transaction (single source of truth)
  const isTransactionFailed =
    transaction?.outcome?.status === 'failed' ||
    paymentResult?.status === 'failed' ||
    paymentResult?.rejected ||
    (state === 'RESOLVED' && paymentResult?.status !== 'success' && !isPaid && !afaComplete);

  // Which test instrument chip to show
  const chipValue = isWithSystem
    ? (scenario.testInstrumentRight || scenario.testInstrument)
    : (scenario.testInstrumentLeft || scenario.testInstrument);

  const chipLabel = isWithSystem
    ? (isHighRisk ? 'Wallet/UPI (system pre-selected this rail)' : isExpiringCard ? 'Fresh card — after system-prompted update' : scenario.method === 'upi' ? 'Test VPA' : 'Test card')
    : (isHighRisk ? 'Test card (bank-declined rail)' : isExpiringCard ? 'Expired card (no pre-check)' : scenario.method === 'upi' ? 'Test VPA' : 'Test card');

  return (
    <div
      className="rounded-[20px] flex flex-col overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1"
      style={{ background: FIELD, boxShadow: accentTop ? PANE_SHADOW_ACCENT : PANE_SHADOW }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = accentTop
          ? '0 2px 4px rgba(43,95,224,0.10), 0 32px 56px -12px rgba(43,95,224,0.48)'
          : '0 2px 4px rgba(10,31,77,0.08), 0 28px 52px -12px rgba(10,31,77,0.36)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = accentTop ? PANE_SHADOW_ACCENT : PANE_SHADOW;
      }}
    >
      {/* Header — same background as body, no separator */}
      <div className="flex items-start justify-between gap-3 px-6 py-5">
        <div className="min-w-0">
          <Badge tone={badgeTone}>{badge}</Badge>
          <h3 className="text-[15px] font-semibold leading-snug mt-2" style={{ color: INK }}>{title}</h3>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: SLATE }}>{subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {isWithSystem && <RealDataBadge isReal size="sm" />}
          <span className="text-lg font-bold tabular-nums" style={{ color: isWithSystem ? ACCENT : INK }}>
            ₹{scenario.amount.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Body — recessed field the cards sit on */}
      <div className="flex-1 px-4 py-4 space-y-3" style={{ background: FIELD }}>

        {/* IDLE — dashed placeholder, invites the one action available */}
        {state === 'IDLE' && (
          <div
            className="py-10 flex flex-col items-center text-center rounded-[14px]"
            style={{ background: isWithSystem ? 'rgba(43,95,224,0.045)' : '#EEF1F6' }}
          >
            <IconAvatar icon={Play} tone={isWithSystem ? 'accent' : 'neutral'} size={40} />
            <p className="text-xs max-w-[240px] leading-relaxed mt-3" style={{ color: MUTE }}>Click "Initialise" to create a real Razorpay order and see Layer 1 evaluate this transaction.</p>
            <button
              onClick={actions.initPane}
              disabled={loading}
              className="mt-4 inline-flex items-center gap-1.5 text-white text-xs font-semibold px-4 py-2.5 rounded-[10px] transition-transform disabled:opacity-50 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(180deg, #16305A 0%, #0A1F3D 100%)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.1) inset, 0 6px 14px -6px rgba(10,31,77,0.5)',
              }}
            >
              {loading ? 'Initialising…' : 'Initialise pane'}
            </button>
          </div>
        )}

        {/* Layer 1 card — appears as soon as CREATED (before Pay Now) */}
        {state !== 'IDLE' && layer1Decision && (
          <Layer1Card decision={layer1Decision} pane={pane} scenario={scenario} />
        )}

        {/* Order + instrument card */}
        {state !== 'IDLE' && orderData && !isTransactionFailed && (
          isEmandate ? (
            /* e-mandate: order info inline, no card wrapper */
            orderData.order && (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <IconAvatar icon={CheckCircle2} tone="accent" size={30} />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold" style={{ color: INK }}>Real Razorpay order</div>
                    <div className="text-[11px] font-mono truncate" style={{ color: MUTE }}>{orderData.order.id}</div>
                  </div>
                </div>
                <Badge tone="neutral">{orderData.order.status}</Badge>
              </div>
            )
          ) : (
          <Card className="space-y-3">
            {orderData.order && (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <IconAvatar icon={CheckCircle2} tone="accent" size={30} />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold" style={{ color: INK }}>Real Razorpay order</div>
                    <div className="text-[11px] font-mono truncate" style={{ color: MUTE }}>{orderData.order.id}</div>
                  </div>
                </div>
                <Badge tone="neutral">{orderData.order.status}</Badge>
              </div>
            )}

            {chipValue && state !== 'RESOLVED' && (
              <>
                <div style={{ height: 1, background: 'rgba(10,31,77,0.06)' }} />
                <div className="flex items-center gap-3">
                  <InstrumentGlyph method={scenario.method} tone={isWithSystem ? 'accent' : 'ink'} />
                  <div className="min-w-0 flex-1">
                    <TestDataChip value={chipValue} label={chipLabel} />
                  </div>
                </div>
                {scenario.testInstrumentNote && !isTimeout && (
                  <p className="text-[11px] italic" style={{ color: MUTE }}>{scenario.testInstrumentNote}</p>
                )}
              </>
            )}

            {isTimeout && (
              <>
                <div style={{ height: 1, background: 'rgba(10,31,77,0.06)' }} />
                <div className="flex items-center gap-3">
                  <SessionTimer
                    totalSeconds={timeoutSeconds}
                    running={timerRunning}
                    label={`Session window${isWithSystem ? ' (extended)' : ' (baseline)'}`}
                  />
                  {isWithSystem && (
                    <span className="text-[11px] font-semibold" style={{ color: ACCENT }}>vs 3:00 on left →</span>
                  )}
                </div>
              </>
            )}
          </Card>
          )
        )}

        {/* Action / failed outcome */}
        {state !== 'IDLE' && orderData && (
          isTransactionFailed ? (
            <FailedBadge
              errorReason={
                transaction?.outcome?.errorReason ||
                paymentResult?.errorFields?.error_reason ||
                paymentResult?.error?.error_reason ||
                scenario.expectedReason
              }
              message={
                transaction?.outcome?.errorDescription ||
                paymentResult?.errorFields?.error_description ||
                paymentResult?.error?.error_description ||
                'Payment was declined or cancelled by user'
              }
            />
          ) : state === 'CREATED' ? (
            <ActionButton
              scenario={scenario}
              pane={pane}
              loading={loading}
              onOpenCheckout={actions.openCheckout}
              onAttemptDirectCharge={actions.attemptDirectCharge}
              onSendAfaAuthLink={actions.sendAfaAuthLink}
              onOpenExpiryModal={() => setShowExpiryModal(true)}
            />
          ) : null
        )}

        {/* Custom in-app confirmation modal (Sequential modal #1) */}
        <CardExpiryModal
          isOpen={showExpiryModal}
          onClose={() => setShowExpiryModal(false)}
          onConfirm={() => {
            setShowExpiryModal(false);
            actions.openCheckout();
          }}
          last4="1006"
        />

        {/* CHECKOUT_OPEN */}
        {state === 'CHECKOUT_OPEN' && !isTransactionFailed && (
          <Card>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: ACCENT }} />
              <span className="text-xs font-semibold" style={{ color: ACCENT }}>Razorpay Checkout widget is open</span>
            </div>
            <p className="text-[11px] leading-relaxed mt-1.5 pl-3.5" style={{ color: SLATE }}>
              Paste the test {scenario.method === 'upi' ? 'VPA' : 'card number'} from the card above into Razorpay's modal.
              {scenario.method !== 'upi' && ' On the mock bank screen, select Failure then the specific reason shown above.'}
            </p>
            {isTimeout && (
              <div className="pl-3.5 mt-2">
                <SessionTimer
                  totalSeconds={timeoutSeconds}
                  running={timerRunning}
                  label={`Session window: ${isWithSystem ? '5:00 (extended)' : '3:00 (baseline)'}`}
                />
              </div>
            )}
          </Card>
        )}

        {/* AWAITING_RESULT */}
        {state === 'AWAITING_RESULT' && !isTransactionFailed && (
          <Card>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full opacity-75 animate-pulse" style={{ background: SLATE }} />
              <span className="text-xs font-medium" style={{ color: SLATE }}>
                {loading ? 'Fetching payment data from Razorpay API…' : 'Awaiting Razorpay response…'}
              </span>
            </div>
            {isEmandate && isWithSystem && afaLink && (
              <div className="mt-3">
                <OtpCompletionPanel
                  authLinkId={afaLink.authLinkId}
                  shortUrl={afaLink.shortUrl}
                  onConfirmComplete={actions.markAfaComplete}
                  isComplete={afaComplete}
                />
              </div>
            )}
          </Card>
        )}

        {/* RESOLVED / FAILED STATE */}
        {(state === 'RESOLVED' || isTransactionFailed) && (
          <ResolvedView
            scenario={scenario}
            pane={pane}
            paymentResult={paymentResult}
            transaction={transaction}
            diagnosis={diagnosis}
            recoveryLink={recoveryLink}
            isPaid={isPaid}
            afaLink={afaLink}
            afaComplete={afaComplete}
            retryOrderData={retryOrderData}
            onSimulatePaid={actions.simulateLinkPaid}
            onConfirmAfaComplete={actions.markAfaComplete}
            onOpenRetryCheckout={actions.openRetryCheckout}
            loading={loading}
          />
        )}

        {/* Error */}
        {error && (
          <StatusNotice tone="failed" icon={AlertCircle} title="Something went wrong">
            {error}
          </StatusNotice>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3.5 flex items-center justify-between">
        <span className="text-[11px]" style={{ color: MUTE }}>
          {pane === 'without' ? 'Traditional baseline flow' : 'Live step-by-step execution'}
        </span>
        <div className="flex items-center gap-3">
          <StatePill state={isTransactionFailed ? 'RESOLVED' : state} />
          {state !== 'IDLE' && (
            <button
              onClick={actions.reset}
              title="Reset pane"
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              style={{ color: MUTE }}
              onMouseEnter={e => { e.currentTarget.style.color = ACCENT; e.currentTarget.style.background = 'rgba(43,95,224,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = MUTE; e.currentTarget.style.background = 'transparent'; }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Layer 1 card ──────────────────────────────────────────────────────────
function Layer1Card({ decision, pane, scenario }) {
  const isWithSystem = pane === 'with';
  const isActive = isWithSystem && decision.action !== 'PROCEED_NORMAL';

  const isEmandate = scenario.id === 'emandate_above_15k';
  const isExpiringCard = scenario.id === 'expiring_saved_card';
  const isHighRisk = scenario.id === 'high_risk_new_device';
  const isTimeout = scenario.id === 'payment_timed_out';

  const riskPct = Math.max(0, Math.min(100, decision.riskScore || 0));

  return (
    <div className="flex items-start gap-3">
      <IconAvatar icon={Activity} tone={isActive ? 'accent' : 'neutral'} />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold mb-1" style={{ color: MUTE }}>Layer 1 · pre-checkout evaluation</div>

        {isWithSystem && (
          <div className="flex items-center gap-2.5 mb-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden max-w-[160px]" style={{ background: '#EBEFF5' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${riskPct}%`, background: isActive ? ACCENT : MUTE }}
              />
            </div>
            <span className="text-[11px] font-semibold tabular-nums" style={{ color: INK }}>
              {decision.riskScore}/100 · {decision.tier}
            </span>
          </div>
        )}

        <div className="text-xs" style={{ color: INK }}>
          <span className="font-semibold">{decision.action}</span>
          <span style={{ color: SLATE }}> — {decision.reasoning}</span>
        </div>

        {isActive && (
          <div className="mt-2 pt-2 text-[11px] font-semibold flex items-start gap-1.5" style={{ borderTop: `1px solid rgba(10,31,77,0.06)`, color: ACCENT }}>
            <ArrowRight className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span>
              {isEmandate && 'Proactive action: AFA authentication link generated before any charge attempt'}
              {isExpiringCard && 'Proactive action: Checkout button replaced with "Update card & pay" — fresh card collected before attempt'}
              {isHighRisk && 'Proactive action: Checkout config reordered → Wallet/UPI offered first, avoiding card-rail bank fraud screen'}
              {isTimeout && 'Proactive action: Checkout timeout raised from 3:00 to 5:00 (+67%) via real config field'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Action button — varies per scenario + pane ────────────────────────────
function ActionButton({ scenario, pane, loading, onOpenCheckout, onAttemptDirectCharge, onSendAfaAuthLink, onOpenExpiryModal }) {
  const isWithSystem = pane === 'with';

  const BASE = 'inline-flex items-center gap-2.5 disabled:opacity-50 text-white px-5 py-3.5 rounded-[14px] font-semibold text-[13px] transition-all active:scale-[0.98] w-full justify-center tracking-[0.01em]';

  const primaryBtnStyle = {
    background: 'linear-gradient(180deg, #3B6FE8 0%, #2B5FE0 100%)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.20) inset, 0 8px 20px -6px rgba(43,95,224,0.55)',
  };
  const navyBtnStyle = {
    background: 'linear-gradient(180deg, #16305A 0%, #0A1F3D 100%)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset, 0 8px 20px -6px rgba(10,31,77,0.55)',
  };
  const dangerBtnStyle = {
    background: 'linear-gradient(180deg, #3E63B0 0%, #1E3A6E 100%)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset, 0 8px 20px -6px rgba(30,58,110,0.50)',
  };

  if (scenario.id === 'emandate_above_15k') {
    if (!isWithSystem) {
      return (
        <button onClick={onAttemptDirectCharge} disabled={loading} style={dangerBtnStyle} className={BASE}>
          <AlertCircle className="w-4 h-4" />
          {loading ? 'Attempting charge…' : 'Attempt direct charge (₹18,000)'}
        </button>
      );
    }
    return (
      <button onClick={onSendAfaAuthLink} disabled={loading} style={navyBtnStyle} className={BASE}>
        <ShieldAlert className="w-4 h-4" />
        {loading ? 'Generating AFA link…' : 'Send AFA authentication link'}
      </button>
    );
  }

  if (scenario.id === 'expiring_saved_card' && isWithSystem) {
    return (
      <button onClick={onOpenExpiryModal || onOpenCheckout} disabled={loading} style={primaryBtnStyle} className={BASE}>
        <RefreshCw className="w-4 h-4" />
        Update card and pay
      </button>
    );
  }

  if (scenario.id === 'high_risk_new_device' && isWithSystem) {
    return (
      <button onClick={onOpenCheckout} disabled={loading} style={primaryBtnStyle} className={BASE}>
        <Cpu className="w-4 h-4" />
        Pay via Wallet / UPI
      </button>
    );
  }

  if (scenario.id === 'payment_timed_out') {
    return (
      <button onClick={onOpenCheckout} disabled={loading} style={primaryBtnStyle} className={BASE}>
        <CreditCard className="w-4 h-4" />
        Pay Now
      </button>
    );
  }

  return (
    <button onClick={onOpenCheckout} disabled={loading} style={primaryBtnStyle} className={BASE}>
      <CreditCard className="w-4 h-4" />
      Pay Now
    </button>
  );
}

// ─── Resolved view ─────────────────────────────────────────────────────────
function ResolvedView({
  scenario, pane, paymentResult, transaction, diagnosis,
  recoveryLink, isPaid, afaLink, afaComplete, retryOrderData,
  onSimulatePaid, onConfirmAfaComplete, onOpenRetryCheckout, loading
}) {
  const isWithSystem = pane === 'with';
  const isEmandate = scenario.id === 'emandate_above_15k';
  const isTimeout = scenario.id === 'payment_timed_out';
  const isExpiringCard = scenario.id === 'expiring_saved_card';
  const isHighRisk = scenario.id === 'high_risk_new_device';
  const isAmbiguous = scenario.id === 'stuck_ambiguous';
  const isRecovery = scenario.type === 'recovery';
  const isSuccess = paymentResult?.status === 'success' || afaComplete || isPaid || transaction?.outcome?.status === 'success';

  return (
    <div className="space-y-3">
      {/* ── E-mandate left pane: blind charge rejection ── */}
      {isEmandate && !isWithSystem && (paymentResult?.rejected || transaction?.outcome?.status === 'failed') && (
        <StatusNotice
          tone="failed"
          icon={XCircle}
          title="API rejected"
          tag="mandate_max_amount_exceeded"
          footnote="No recovery attempted. This revenue is lost."
        >
          {paymentResult?.error?.error_description || 'Recurring charge > ₹15,000 rejected: RBI AFA threshold requires fresh authentication.'}
        </StatusNotice>
      )}

      {/* ── E-mandate right pane: AFA completion ── */}
      {isEmandate && isWithSystem && afaLink && (
        <OtpCompletionPanel
          authLinkId={afaLink.authLinkId}
          shortUrl={afaLink.shortUrl}
          onConfirmComplete={onConfirmAfaComplete}
          isComplete={afaComplete}
        />
      )}
      {isEmandate && isWithSystem && afaComplete && (
        <StatusNotice
          tone="success"
          icon={CheckCircle2}
          title="Prevention succeeded"
          tag="Resolved"
          footnote="No Checkout failure ever occurred — the system collected auth before attempting the charge."
        >
          AFA authentication completed. ₹18,000 recurring charge is now authorised and will execute without further friction.
        </StatusNotice>
      )}

      {/* ── Non-emandate, non-success: raw Razorpay error fields ── */}
      {!isEmandate && !isAmbiguous && !isSuccess && (paymentResult?.errorFields || transaction?.outcome?.status === 'failed') && (
        <StatusNotice tone="failed" icon={XCircle} title="Authorization declined" tag="Declined">
          <div className="space-y-1 mt-1.5">
            {Object.entries(paymentResult?.errorFields || {}).filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex gap-2 text-[11px]">
                <span className="w-32 flex-shrink-0" style={{ color: MUTE }}>{k}:</span>
                <span className="font-medium font-mono" style={{ color: INK }}>{v}</span>
              </div>
            ))}
            {!paymentResult?.errorFields && transaction?.outcome?.errorReason && (
              <div className="flex gap-2 text-[11px]">
                <span className="w-32 flex-shrink-0" style={{ color: MUTE }}>error_reason:</span>
                <span className="font-medium font-mono" style={{ color: INK }}>{transaction.outcome.errorReason}</span>
              </div>
            )}
          </div>
          {paymentResult?.rawPaymentData && (
            <div className="mt-2.5">
              <PayloadViewer title="Razorpay Fetch Payment API response" payload={paymentResult.rawPaymentData} defaultExpanded={false} />
            </div>
          )}
          {!isWithSystem && (
            <div className="mt-2.5 pt-2.5" style={{ borderTop: `1px solid rgba(10,31,77,0.06)` }}>
              <div className="font-semibold" style={{ color: DEEP }}>No further action. This transaction is lost — ₹{scenario.amount.toLocaleString('en-IN')} unrecovered.</div>
              <p className="mt-0.5 italic font-normal" style={{ color: SLATE }}>Customer must manually return and retry. No automated follow-up exists.</p>
            </div>
          )}
        </StatusNotice>
      )}

      {/* ── Success (prevention scenarios ending in success) ── */}
      {!isEmandate && isSuccess && (paymentResult?.status === 'success' || transaction?.outcome?.status === 'success') && (
        <StatusNotice
          tone="success"
          icon={CheckCircle2}
          tag="Captured"
          title={
            isExpiringCard ? 'Prevention succeeded — first real attempt captured' :
            isHighRisk ? 'Prevention succeeded — routed around the risk' :
            isTimeout ? 'Payment completed within extended window' :
            'Payment captured'
          }
        >
          {isExpiringCard ? 'Fresh card entered after Layer 1 prompt. No failure ever occurred — the expiry was caught before the checkout attempt.' :
           isHighRisk ? 'Wallet/UPI rail (pre-selected by Layer 1) captured the payment. The card-rail attempt on the left pane would have been declined by the issuing bank.' :
           isTimeout ? '₹' + scenario.amount.toLocaleString('en-IN') + ' collected within the 5:00 extended session. The 3:00 baseline on the left would have expired before completion.' :
           `₹${scenario.amount.toLocaleString('en-IN')} captured.`}
        </StatusNotice>
      )}

      {/* ── Stuck/Ambiguous left pane: worst case without system ── */}
      {isAmbiguous && !isWithSystem && (paymentResult?.errorFields || transaction?.outcome?.status === 'ambiguous' || transaction?.outcome?.status === 'failed') && (
        <StatusNotice tone="failed" icon={XCircle} title="Payment status: ambiguous" tag="Unresolved">
          <div className="space-y-1 mt-1.5">
            <div className="flex gap-2"><span className="w-36 flex-shrink-0" style={{ color: MUTE }}>status:</span><span className="font-mono font-medium" style={{ color: INK }}>ambiguous</span></div>
            <div className="flex gap-2"><span className="w-36 flex-shrink-0" style={{ color: MUTE }}>error_reason:</span><span className="font-mono font-medium" style={{ color: INK }}>webhook_drop</span></div>
            <div className="flex gap-2"><span className="w-36 flex-shrink-0" style={{ color: MUTE }}>error_source:</span><span className="font-mono font-medium" style={{ color: INK }}>gateway</span></div>
            <div className="flex gap-2"><span className="w-36 flex-shrink-0" style={{ color: MUTE }}>flagged_after:</span><span className="font-mono font-medium" style={{ color: INK }}>~18s no webhook</span></div>
            {(paymentResult?.errorFields?.underlying_razorpay_reason || paymentResult?.errorFields?.error_reason) && (
              <div className="flex gap-2 mt-1 pt-1" style={{ borderTop: `1px solid rgba(10,31,77,0.06)` }}>
                <span className="w-36 flex-shrink-0" style={{ color: MUTE }}>razorpay_raw:</span>
                <span className="font-mono font-medium" style={{ color: MUTE }}>
                  {paymentResult.errorFields.underlying_razorpay_reason || paymentResult.errorFields.error_reason}
                </span>
              </div>
            )}
          </div>
          <div className="mt-2.5 pt-2.5" style={{ borderTop: `1px solid rgba(10,31,77,0.06)` }}>
            <div className="font-semibold" style={{ color: DEEP }}>Without system: merchant assumes failure → customer re-prompted to pay again.</div>
            <p className="mt-0.5 italic" style={{ color: SLATE }}>Bank already debited ₹{scenario.amount.toLocaleString('en-IN')}. Second payment attempt = double charge.</p>
          </div>
        </StatusNotice>
      )}

      {isRecovery && isWithSystem && diagnosis && (
        <RecoveryStepReveal
          diagnosis={diagnosis}
          scenario={scenario}
          recoveryLink={recoveryLink}
          isPaid={isPaid}
          onSimulatePaid={onSimulatePaid}
        />
      )}

      {/* ── Timeout scenario right pane: retry button ── */}
      {isTimeout && isWithSystem && diagnosis && !isRecovery && (
        <RetryPanel
          retryOrderData={retryOrderData}
          isPaid={isPaid}
          scenario={scenario}
          onOpenRetryCheckout={onOpenRetryCheckout}
          loading={loading}
        />
      )}
    </div>
  );
}

// ─── 4-step recovery reveal (Scenarios 5 & 6) ─────────────────────────────
function RecoveryStepReveal({ diagnosis, scenario, recoveryLink, isPaid, onSimulatePaid }) {
  const c = diagnosis?.classification;
  const b = diagnosis?.banditDecision;
  const ex = diagnosis?.recoveryExecution;
  const r = diagnosis?.restraintResult;
  const isAmbiguous = scenario.id === 'stuck_ambiguous';
  const reconLog = ex?.details?.reconciliationLog || [];
  const isSilentRecovery = ex?.details?.silentRecovery === true;

  // ── Stuck/Ambiguous: show reconciliation audit trail instead of standard steps ──
  if (isAmbiguous) {
    return (
      <Card>
        <div className="text-[11px] font-semibold mb-3 flex items-center gap-1.5" style={{ color: MUTE }}>
          <IconAvatar icon={Activity} tone="neutral" size={20} />
          Layer 2 · reconciliation pipeline
        </div>
        <div>
          {c && (
            <div className="flex gap-3">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-10" style={{ background: '#EBEFF5', color: INK }}>1</div>
                <div className="w-px flex-1 my-0.5" style={{ background: LINE, minHeight: 16 }} />
              </div>
              <div className="flex-1 min-w-0 pb-3">
                <div className="text-[10px] font-semibold mb-0.5" style={{ color: MUTE }}>Watchdog flagged ambiguous</div>
                <div className="text-[11px]"><span style={{ color: MUTE }}>Category: </span><span className="font-semibold" style={{ color: INK }}>{c.category}</span></div>
                <div className="text-[11px] mt-0.5" style={{ color: SLATE }}>
                  pending → ~18s no webhook received → status set to <span className="font-mono font-medium" style={{ color: INK }}>ambiguous</span>
                </div>
                {diagnosis?.errorFields?.underlying_razorpay_reason && (
                  <div className="text-[11px] mt-1 font-mono" style={{ color: MUTE }}>
                    razorpay reported: <span style={{ color: SLATE }}>{diagnosis.errorFields.underlying_razorpay_reason}</span>
                    {' '}— treated as ambiguous because webhook was not received
                  </div>
                )}
              </div>
            </div>
          )}

          {reconLog.map((entry, idx) => {
            const isLast = idx === reconLog.length - 1 && isSilentRecovery;
            const resultStr = entry.result
              ? Object.entries(entry.result).map(([k, v]) => `${k}: ${v}`).join(', ')
              : entry.error || '';
            return (
              <div key={idx} className="flex gap-3">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-10" style={{ background: 'rgba(43,95,224,0.14)', color: ACCENT }}>{idx + 2}</div>
                  {!isLast && <div className="w-px flex-1 my-0.5" style={{ background: LINE, minHeight: 16 }} />}
                </div>
                <div className="flex-1 min-w-0 pb-3">
                  <div className="text-[10px] font-semibold mb-0.5" style={{ color: MUTE }}>API call: {entry.endpoint}</div>
                  <div className="text-[11px] font-mono" style={{ color: INK }}>→ {resultStr}</div>
                  {entry.error && <div className="text-[11px]" style={{ color: DEEP }}>{entry.error}</div>}
                </div>
              </div>
            );
          })}

          {isSilentRecovery && (
            <div className="pt-1">
              <StatusNotice
                tone="success"
                icon={CheckCircle2}
                title="Recovered silently — no customer contact"
                tag="Recovered"
                footnote={ex?.details?.resolutionNote || 'Payment was already captured at the bank.'}
              >
                ₹{scenario.amount.toLocaleString('en-IN')} confirmed already captured by Razorpay. Merchant record updated to recovered. Zero customer-facing friction — no risk of double charge.
              </StatusNotice>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // ── Standard recovery steps (UPI decline, etc.) ──
  const steps = [
    {
      num: 1,
      label: 'Classifying failure',
      content: c ? (
        <div className="space-y-0.5">
          <div className="text-[11px]"><span style={{ color: MUTE }}>Category: </span><span className="font-semibold" style={{ color: INK }}>{c.category}</span></div>
          <div className="text-[11px]" style={{ color: SLATE }}>{c.reasoning}</div>
        </div>
      ) : null
    },
    {
      num: 2,
      label: 'Selecting recovery action (Layer 3 bandit)',
      content: b ? (
        <div className="space-y-0.5">
          <div className="text-[11px]"><span style={{ color: MUTE }}>Bandit selected: </span><span className="font-semibold" style={{ color: INK }}>{b.action}</span></div>
          {b.winRate !== undefined && (
            <div className="text-[11px]" style={{ color: SLATE }}>
              {b.action} has a <span className="font-semibold" style={{ color: INK }}>{Math.round((b.winRate || 0.62) * 100)}%</span> historical success rate for this category — selected over delayed retry.
            </div>
          )}
          {r?.restraint && <div className="text-[11px] font-semibold" style={{ color: MID }}>Restraint gate fired — see below</div>}
        </div>
      ) : null
    },
    {
      num: 3,
      label: 'Generating real Razorpay Payment Link',
      content: ex?.razorpayPaymentLinkId ? (
        <div className="space-y-0.5">
          <div className="text-[11px]">
            <span style={{ color: MUTE }}>POST /v1/payment_links → </span>
            <span className="font-semibold font-mono" style={{ color: ACCENT }}>{ex.razorpayPaymentLinkId}</span>
          </div>
          <div className="text-[11px]" style={{ color: SLATE }}>Link allows customer to pay via card, netbanking, or a different UPI app — any method they can complete.</div>
        </div>
      ) : (
        ex?.actionTaken && !ex.razorpayPaymentLinkId ? (
          <div className="text-[11px]" style={{ color: SLATE }}>Action: <span>{ex.actionTaken}</span></div>
        ) : null
      )
    }
  ];

  const visibleSteps = steps.filter(s => s.content);

  return (
    <Card>
      <div className="text-[11px] font-semibold mb-3 flex items-center gap-1.5" style={{ color: MUTE }}>
        <IconAvatar icon={Zap} tone="neutral" size={20} />
        Layer 2+3 · recovery pipeline
      </div>

      <div>
        {visibleSteps.map((step, idx) => (
          <div key={step.num} className="flex gap-3 relative">
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-10"
                style={{ background: '#EBEFF5', color: INK }}
              >
                {step.num}
              </div>
              {(idx < visibleSteps.length - 1 || recoveryLink || (r?.restraint && !recoveryLink)) && (
                <div className="w-px flex-1 my-0.5" style={{ background: LINE, minHeight: 16 }} />
              )}
            </div>
            <div className="flex-1 min-w-0 pb-3">
              <div className="text-[10px] font-semibold mb-0.5" style={{ color: MUTE }}>{step.label}</div>
              {step.content}
            </div>
          </div>
        ))}

        {r?.restraint && !recoveryLink && (
          <div className="flex gap-3">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="w-5 h-5 rounded-full flex items-center justify-center z-10" style={{ background: 'rgba(62,99,176,0.18)' }}>
                <Ban className="w-3 h-3" style={{ color: MID }} />
              </div>
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="text-xs font-semibold mb-1" style={{ color: MID }}>Restraint gate enforced</div>
              <p className="text-[11px] leading-relaxed" style={{ color: SLATE }}>{r.reason || 'Recovery suppressed — cost of action exceeds expected recovery value.'}</p>
            </div>
          </div>
        )}

        {recoveryLink && (
          <div className="flex gap-3">
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-10"
                style={{ background: 'rgba(43,95,224,0.16)', color: ACCENT }}
              >4</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold mb-1.5" style={{ color: ACCENT }}>Recovery link ready</div>
              <RecoveryLinkPanel
                paymentLinkId={recoveryLink.paymentLinkId}
                shortUrl={recoveryLink.shortUrl}
                amount={recoveryLink.amount || scenario.amount}
                onSimulatePaid={onSimulatePaid}
                isPaid={isPaid}
              />
            </div>
          </div>
        )}
      </div>

      {isPaid && (
        <div className="mt-3">
          <StatusNotice tone="success" icon={CheckCircle2} title="Recovered — revenue retrieved" tag="Recovered">
            ₹{scenario.amount.toLocaleString('en-IN')} collected via automated Payment Link recovery. Layer 3 bandit's win rate for this category updated.
          </StatusNotice>
        </div>
      )}
    </Card>
  );
}

// ─── Retry panel (Scenario 2 right pane only) ─────────────────────────────
function RetryPanel({ retryOrderData, isPaid, scenario, onOpenRetryCheckout, loading }) {
  if (isPaid) {
    return (
      <StatusNotice tone="success" icon={CheckCircle2} title="Revenue recovered via automatic retry" tag="Recovered">
        ₹{scenario.amount.toLocaleString('en-IN')} captured on the second real Razorpay order. The extended session window gave the customer time to complete.
      </StatusNotice>
    );
  }

  return (
    <Card className="space-y-2.5">
      <div className="text-[11px] font-semibold inline-flex items-center gap-1.5" style={{ color: INK }}>
        <IconAvatar icon={Zap} tone="accent" size={22} />
        Layer 2: Automatic retry via a fresh attempt
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: SLATE }}>
        A second real Razorpay order will be created. Enter the same test card again without selecting Failure — it will capture successfully.
      </p>
      {!retryOrderData ? (
        <button
          onClick={onOpenRetryCheckout} disabled={loading}
          style={{
            background: 'linear-gradient(180deg, #3B6FE8 0%, #2B5FE0 100%)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 14px -6px rgba(43,95,224,0.5)',
          }}
          className="inline-flex items-center gap-1.5 text-white text-xs font-semibold px-3.5 py-2.5 rounded-[10px] transition-transform active:scale-[0.98] disabled:opacity-50 w-full justify-center">
          <Zap className="w-3.5 h-3.5 fill-current" />
          {loading ? 'Creating retry order…' : 'Retry now — open Checkout again'}
        </button>
      ) : (
        <div className="text-[11px]" style={{ color: SLATE }}>
          Retry order: <span className="font-medium font-mono" style={{ color: INK }}>{retryOrderData.retryOrder?.id}</span>
          <span className="ml-2">— modal is open, enter card without selecting Failure.</span>
        </div>
      )}
    </Card>
  );
}

// ─── State pill ────────────────────────────────────────────────────────────
function StatePill({ state }) {
  const map = {
    IDLE: { label: 'Idle', background: '#EBEFF5', color: SLATE },
    CREATED: { label: 'Order created', background: INK, color: '#fff' },
    CHECKOUT_OPEN: { label: 'Checkout open', background: MID, color: '#fff' },
    AWAITING_RESULT: { label: 'Awaiting result', background: MID, color: '#fff' },
    RESOLVED: { label: 'Resolved', background: ACCENT, color: '#fff' }
  };
  const { label, background, color } = map[state] || map.IDLE;
  return (
    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5" style={{ color, background }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
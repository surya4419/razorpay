import React from 'react';
import {
  CheckCircle2, XCircle, Ban, CreditCard, Zap,
  AlertCircle, ArrowRight, RotateCcw, ShieldAlert,
  RefreshCw, Cpu, Clock, Play, Activity, Circle
} from 'lucide-react';
import { TestDataChip } from './TestDataChip.jsx';
import { SessionTimer } from './SessionTimer.jsx';
import { RecoveryLinkPanel } from './RecoveryLinkPanel.jsx';
import { OtpCompletionPanel } from './OtpCompletionPanel.jsx';
import { CardExpiryModal } from './CardExpiryModal.jsx';
import { PayloadViewer } from '../shared/PayloadViewer.jsx';
import { RealDataBadge } from '../shared/RealDataBadge.jsx';

/**
 * Shared design tokens (see CardExpiryModal.jsx / Navbar.jsx):
 * Strict monochrome — white + shades of blue only. Status (success / attention /
 * failed) is carried by shade weight and icon, not by hue.
 *
 * Ink      #0A1F3D   headings, primary text, strongest fills
 * Deep     #1E3A6E   failed / critical state
 * Primary  #2B5FE0   primary actions, links, success / positive state
 * Mid      #3E63B0   attention / pending state
 * Sky      #6FA0F5   light-mid accents
 * Pale     #E8F0FD   light tint backgrounds (success / failed panels)
 * Ice      #F6F9FE   lightest surface / recessed panels
 * Slate    #5B6B84   secondary / muted text
 * Line     #E3E8F0   borders, dividers
 * Radius scale: 20 (cards) / 12 (controls, inner panels) / full (pills)
 * Elevation: soft layered shadow, never a single flat drop-shadow
 */

const CARD_SHADOW = '0 1px 1px rgba(10,31,77,0.03), 0 12px 28px -16px rgba(10,31,77,0.22)';
const CARD_SHADOW_ACCENT = '0 1px 1px rgba(10,31,77,0.03), 0 20px 40px -18px rgba(43,95,224,0.30)';

// ─── FailedBadge Component ──────────────────────────────────────────────────
// Driven by transaction.outcome.status === 'failed' from the database
export function FailedBadge({ errorReason, message }) {
  return (
    <div
      className="flex items-center gap-3 p-4 rounded-[14px]"
      style={{ border: '1px solid rgba(30,58,110,0.22)', background: 'linear-gradient(180deg, #EAF1FE 0%, #E8F0FD 100%)' }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(30,58,110,0.12)' }}
      >
        <XCircle className="w-4.5 h-4.5" style={{ width: 18, height: 18, color: '#1E3A6E' }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold" style={{ color: '#1E3A6E' }}>Payment failed</div>
        <div className="text-[11px] mt-0.5 leading-relaxed" style={{ color: '#5B6B84' }}>
          {errorReason ? `Reason: ${errorReason}` : message || 'Authorization declined or popup closed'}
        </div>
      </div>
      <span
        className="text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
        style={{ color: '#1E3A6E', background: 'rgba(30,58,110,0.12)', border: '1px solid rgba(30,58,110,0.22)' }}
      >
        Failed
      </span>
    </div>
  );
}

// ─── Public: renders the two panes side by side ────────────────────────────
export function SplitView({ scenario, withoutMachine, withMachine }) {
  const isTimeout = scenario.id === 'payment_timed_out';

  return (
    <div className="space-y-4">
      {/* Timeout comparison header — only for scenario 2 */}
      {isTimeout && withoutMachine.state !== 'IDLE' && withMachine.state !== 'IDLE' && (
        <TimeoutComparisonBanner
          withoutTimeout={withoutMachine.timeoutSeconds}
          withTimeout={withMachine.timeoutSeconds}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaneCard
          title="Without our system"
          subtitle="Standard naive checkout — no pre-checks, no intelligent recovery."
          badge="Naive baseline"
          badgeStyle="neutral"
          scenario={scenario}
          machine={withoutMachine}
          pane="without"
        />
        <PaneCard
          title="With our system"
          subtitle="Grounded in Razorpay APIs, error taxonomy & contextual learning."
          badge="3-layer engine"
          badgeStyle="primary"
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
    <div
      className="flex items-center gap-3 px-5 py-4 rounded-[14px]"
      style={{ border: '1px solid #E3E8F0', background: 'linear-gradient(180deg, #FBFCFE 0%, #F6F9FE 100%)', boxShadow: '0 1px 1px rgba(10,31,77,0.02), 0 8px 20px -16px rgba(10,31,77,0.18)' }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(43,95,224,0.10)' }}
      >
        <Clock className="w-4 h-4" style={{ color: '#2B5FE0' }} />
      </div>
      <span className="text-xs leading-relaxed" style={{ color: '#3E4C63' }}>
        Session window comparison:
        {' '}<span className="font-semibold" style={{ color: '#1E3A6E' }}>Baseline {fmt(withoutMins, withoutSecs)}</span>
        {' '}·{' '}
        <span className="font-semibold" style={{ color: '#2B5FE0' }}>With our system {fmt(withMins, withSecs)}</span>
        {' '}
        <span className="font-semibold" style={{ color: '#2B5FE0' }}>(+{pct}% more time to complete)</span>
      </span>
      <span className="text-[11px] ml-auto flex-shrink-0 hidden sm:inline" style={{ color: '#8B98AC' }}>Derived from real Checkout config values</span>
    </div>
  );
}

// ─── Single pane card ──────────────────────────────────────────────────────
function PaneCard({ title, subtitle, badge, badgeStyle, scenario, machine, pane, accentTop }) {
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
      className="rounded-[20px] bg-white flex flex-col overflow-hidden transition-shadow duration-300"
      style={{
        border: isWithSystem ? '1px solid rgba(43,95,224,0.18)' : '1px solid #E3E8F0',
        boxShadow: accentTop ? CARD_SHADOW_ACCENT : CARD_SHADOW,
      }}
    >
      {accentTop && (
        <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #2B5FE0 0%, #4F7EF0 60%, #7CA3F5 100%)' }} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-6 py-5" style={{ borderBottom: '1px solid #E3E8F0', background: isWithSystem ? 'linear-gradient(180deg, #FBFDFF 0%, #FFFFFF 100%)' : '#FFFFFF' }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full tracking-wide"
              style={
                badgeStyle === 'primary'
                  ? { background: 'rgba(43,95,224,0.10)', color: '#2B5FE0', border: '1px solid rgba(43,95,224,0.2)' }
                  : { background: '#F6F9FE', color: '#5B6B84', border: '1px solid #E3E8F0' }
              }
            >{badge}</span>
          </div>
          <h3 className="text-[15px] font-semibold leading-snug" style={{ color: '#0A1F3D' }}>{title}</h3>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#5B6B84' }}>{subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {isWithSystem && <RealDataBadge isReal size="sm" />}
          <span className="text-base font-bold tabular-nums" style={{ color: isWithSystem ? '#2B5FE0' : '#0A1F3D' }}>
            ₹{scenario.amount.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-6 py-5 space-y-4">

        {/* IDLE */}
        {state === 'IDLE' && (
          <div className="py-12 flex flex-col items-center text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-3.5"
              style={{ background: isWithSystem ? 'rgba(43,95,224,0.08)' : '#F6F9FE', border: '1px solid #E3E8F0' }}
            >
              <Play className="w-4.5 h-4.5" style={{ width: 18, height: 18, color: isWithSystem ? '#2B5FE0' : '#8B98AC' }} />
            </div>
            <p className="text-xs max-w-[240px] leading-relaxed" style={{ color: '#8B98AC' }}>Click "Initialise" to create a real Razorpay order and see Layer 1 evaluate this transaction.</p>
            <button
              onClick={actions.initPane}
              disabled={loading}
              className="mt-4 inline-flex items-center gap-1.5 text-white text-xs font-semibold px-4 py-2.5 rounded-[12px] transition-all disabled:opacity-50 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(180deg, #16305A 0%, #0A1F3D 100%)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.1) inset, 0 6px 14px -6px rgba(10,31,77,0.5)',
              }}
            >
              {loading ? 'Initialising…' : 'Initialise pane'}
            </button>
          </div>
        )}

        {/* Layer 1 block — appears as soon as CREATED (before Pay Now) */}
        {state !== 'IDLE' && layer1Decision && (
          <Layer1Block
            decision={layer1Decision}
            pane={pane}
            scenario={scenario}
          />
        )}

        {/* Order Details & Instruments */}
        {state !== 'IDLE' && orderData && (
          <div className="space-y-3">
            {/* Order card */}
            {orderData.order && (
              <div className="p-3.5 rounded-[12px]" style={{ border: '1px solid #E3E8F0', background: '#FBFCFE' }}>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#2B5FE0' }} />
                  <span className="text-xs font-semibold" style={{ color: '#0A1F3D' }}>Real Razorpay order created</span>
                </div>
                <div className="text-[11px] font-mono" style={{ color: '#5B6B84' }}>{orderData.order.id}</div>
                <div className="text-[11px] mt-0.5" style={{ color: '#8B98AC' }}>₹{scenario.amount.toLocaleString('en-IN')} · Status: {orderData.order.status}</div>
              </div>
            )}

            {/* Test data chip + session timer (if applicable) */}
            {chipValue && !isEmandate && !isTransactionFailed && state !== 'RESOLVED' && (
              <TestDataChip
                value={chipValue}
                label={chipLabel}
              />
            )}
            {scenario.testInstrumentNote && !isTransactionFailed && state !== 'RESOLVED' && (
              <p className="text-[11px] italic" style={{ color: '#8B98AC' }}>{scenario.testInstrumentNote}</p>
            )}

            {/* Timeout scenario: show session timer */}
            {isTimeout && (
              <div className="flex items-center gap-3">
                <SessionTimer
                  totalSeconds={timeoutSeconds}
                  running={timerRunning}
                  label={`Session window${isWithSystem ? ' (extended)' : ' (baseline)'}`}
                />
                {isWithSystem && (
                  <span className="text-[11px] font-semibold" style={{ color: '#2B5FE0' }}>vs 3:00 on left →</span>
                )}
              </div>
            )}

            {/* Action button VS FailedBadge:
                Driven by transaction.status === 'failed' ? <FailedBadge /> : <PayNowButton />
                Reading from persisted state — not wiped when modal unmounts */}
            {isTransactionFailed ? (
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
            ) : null}
          </div>
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
          <div
            className="p-4 rounded-[12px] bg-white space-y-2"
            style={{ border: '1px solid rgba(43,95,224,0.3)', boxShadow: '0 0 0 3px rgba(43,95,224,0.08)' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#2B5FE0' }} />
              <span className="text-xs font-semibold" style={{ color: '#2B5FE0' }}>Razorpay Checkout widget is open</span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: '#5B6B84' }}>
              Paste the test {scenario.method === 'upi' ? 'VPA' : 'card number'} from the chip above into Razorpay's modal.
              {scenario.method !== 'upi' && ' On the mock bank screen, select Failure then the specific reason shown above.'}
            </p>
            {isTimeout && (
              <SessionTimer
                totalSeconds={timeoutSeconds}
                running={timerRunning}
                label={`Session window: ${isWithSystem ? '5:00 (extended)' : '3:00 (baseline)'}`}
              />
            )}
          </div>
        )}

        {/* AWAITING_RESULT */}
        {state === 'AWAITING_RESULT' && !isTransactionFailed && (
          <div className="p-3.5 rounded-[12px]" style={{ border: '1px solid #E3E8F0', background: '#F6F9FE' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full opacity-75 animate-pulse" style={{ background: '#5B6B84' }} />
              <span className="text-xs font-medium" style={{ color: '#5B6B84' }}>
                {loading ? 'Fetching payment data from Razorpay API…' : 'Awaiting Razorpay response…'}
              </span>
            </div>
            {isEmandate && isWithSystem && afaLink && (
              <OtpCompletionPanel
                authLinkId={afaLink.authLinkId}
                shortUrl={afaLink.shortUrl}
                onConfirmComplete={actions.markAfaComplete}
                isComplete={afaComplete}
              />
            )}
          </div>
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
          <div className="p-3.5 rounded-[12px] text-xs" style={{ border: '1px solid rgba(30,58,110,0.25)', background: '#E8F0FD', color: '#1E3A6E' }}>
            <AlertCircle className="w-3.5 h-3.5 inline mr-1.5" />
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: '1px solid #E3E8F0', background: '#FBFCFE' }}>
        <span className="text-[11px]" style={{ color: '#8B98AC' }}>
          {pane === 'without' ? 'Traditional baseline flow' : 'Live step-by-step execution'}
        </span>
        <div className="flex items-center gap-3">
          <StatePill state={isTransactionFailed ? 'RESOLVED' : state} />
          {state !== 'IDLE' && (
            <button
              onClick={actions.reset}
              title="Reset pane"
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              style={{ color: '#8B98AC' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#2B5FE0'; e.currentTarget.style.background = 'rgba(43,95,224,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#8B98AC'; e.currentTarget.style.background = 'transparent'; }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Layer 1 block ─────────────────────────────────────────────────────────
function Layer1Block({ decision, pane, scenario }) {
  const isWithSystem = pane === 'with';
  const isActive = isWithSystem && decision.action !== 'PROCEED_NORMAL';

  const isEmandate = scenario.id === 'emandate_above_15k';
  const isExpiringCard = scenario.id === 'expiring_saved_card';
  const isHighRisk = scenario.id === 'high_risk_new_device';
  const isTimeout = scenario.id === 'payment_timed_out';

  const riskPct = Math.max(0, Math.min(100, decision.riskScore || 0));

  return (
    <div
      className="p-4 rounded-[14px]"
      style={
        isActive
          ? { border: '1px solid rgba(43,95,224,0.22)', background: 'linear-gradient(180deg, #EDF4FE 0%, #E8F0FD 100%)' }
          : { border: '1px solid #E3E8F0', background: '#F6F9FE' }
      }
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold inline-flex items-center gap-1.5" style={{ color: '#8B98AC' }}>
          <Activity className="w-3 h-3" />
          Layer 1: Pre-checkout evaluation
        </span>
      </div>

      {isWithSystem && (
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(10,31,77,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${riskPct}%`, background: isActive ? '#2B5FE0' : '#8B98AC' }}
            />
          </div>
          <span className="text-[11px] font-semibold flex-shrink-0 tabular-nums" style={{ color: '#0A1F3D' }}>
            {decision.riskScore}/100 · {decision.tier}
          </span>
        </div>
      )}

      <div className="text-xs font-semibold mb-1" style={{ color: '#0A1F3D' }}>
        Action: <span style={{ color: isActive ? '#2B5FE0' : '#5B6B84' }}>{decision.action}</span>
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: '#5B6B84' }}>{decision.reasoning}</p>

      {/* Scenario-specific action annotations */}
      {isActive && (
        <div
          className="mt-2.5 pt-2.5 text-[11px] font-semibold flex items-start gap-1.5"
          style={{ borderTop: '1px solid rgba(43,95,224,0.15)', color: '#2B5FE0' }}
        >
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
  );
}

// ─── Action button — varies per scenario + pane ────────────────────────────
function ActionButton({ scenario, pane, loading, onOpenCheckout, onAttemptDirectCharge, onSendAfaAuthLink, onOpenExpiryModal }) {
  const isWithSystem = pane === 'with';

  const primaryBtnStyle = {
    background: 'linear-gradient(180deg, #3B6FE8 0%, #2B5FE0 100%)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 14px -6px rgba(43,95,224,0.5)',
  };
  const navyBtnStyle = {
    background: 'linear-gradient(180deg, #16305A 0%, #0A1F3D 100%)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.1) inset, 0 6px 14px -6px rgba(10,31,77,0.5)',
  };
  const dangerBtnStyle = {
    background: 'linear-gradient(180deg, #3E63B0 0%, #1E3A6E 100%)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset, 0 6px 14px -6px rgba(30,58,110,0.45)',
  };

  if (scenario.id === 'emandate_above_15k') {
    if (!isWithSystem) {
      return (
        <button onClick={onAttemptDirectCharge} disabled={loading}
          style={dangerBtnStyle}
          className="inline-flex items-center gap-2 disabled:opacity-50 text-white px-4 py-2.5 rounded-[12px] font-semibold text-xs transition-all active:scale-[0.98] w-full justify-center">
          <AlertCircle className="w-3.5 h-3.5" />
          {loading ? 'Attempting charge…' : 'Attempt direct charge (₹18,000)'}
        </button>
      );
    }
    return (
      <button onClick={onSendAfaAuthLink} disabled={loading}
        style={navyBtnStyle}
        className="inline-flex items-center gap-2 disabled:opacity-50 text-white px-4 py-2.5 rounded-[12px] font-semibold text-xs transition-all active:scale-[0.98] w-full justify-center">
        <ShieldAlert className="w-3.5 h-3.5" />
        {loading ? 'Generating AFA link…' : 'Send AFA authentication link'}
      </button>
    );
  }

  if (scenario.id === 'expiring_saved_card' && isWithSystem) {
    return (
      <button onClick={onOpenExpiryModal || onOpenCheckout} disabled={loading}
        style={primaryBtnStyle}
        className="inline-flex items-center gap-2 disabled:opacity-50 text-white px-4 py-2.5 rounded-[12px] font-semibold text-xs transition-all active:scale-[0.98] w-full justify-center">
        <RefreshCw className="w-3.5 h-3.5" />
        Update card and pay
      </button>
    );
  }


  if (scenario.id === 'high_risk_new_device' && isWithSystem) {
    return (
      <button onClick={onOpenCheckout} disabled={loading}
        style={primaryBtnStyle}
        className="inline-flex items-center gap-2 disabled:opacity-50 text-white px-4 py-2.5 rounded-[12px] font-semibold text-xs transition-all active:scale-[0.98] w-full justify-center">
        <Cpu className="w-3.5 h-3.5" />
        Pay via Wallet/UPI (system pre-selected) — opens modal
      </button>
    );
  }

  return (
    <button onClick={onOpenCheckout} disabled={loading}
      style={primaryBtnStyle}
      className="inline-flex items-center gap-2 disabled:opacity-50 text-white px-4 py-2.5 rounded-[12px] font-semibold text-xs transition-all active:scale-[0.98] w-full justify-center">
      <CreditCard className="w-3.5 h-3.5" />
      Pay Now — opens Razorpay modal
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
        <TerminalFailCard
          reason="mandate_max_amount_exceeded"
          description={paymentResult?.error?.error_description || 'Recurring charge > ₹15,000 rejected: RBI AFA threshold requires fresh authentication.'}
          note="No recovery attempted. This revenue is lost."
        />
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
        <SuccessCard
          headline="Prevention succeeded"
          detail="AFA authentication completed. ₹18,000 recurring charge is now authorised and will execute without further friction."
          subNote="No Checkout failure ever occurred — the system collected auth before attempting the charge."
        />
      )}

      {/* ── Non-emandate, non-success: raw Razorpay error fields ── */}
      {!isEmandate && !isAmbiguous && !isSuccess && (paymentResult?.errorFields || transaction?.outcome?.status === 'failed') && (
        <div className="p-4 rounded-[14px]" style={{ border: '1px solid rgba(30,58,110,0.22)', background: 'linear-gradient(180deg, #EAF1FE 0%, #E8F0FD 100%)' }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(30,58,110,0.12)' }}>
              <XCircle className="w-4 h-4" style={{ color: '#1E3A6E' }} />
            </div>
            <span className="text-xs font-semibold" style={{ color: '#1E3A6E' }}>Authorization declined</span>
          </div>
          <div className="space-y-1 mb-2 pl-1">
            {Object.entries(paymentResult?.errorFields || {}).filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex gap-2 text-[11px]">
                <span className="w-32 flex-shrink-0" style={{ color: '#5B6B84' }}>{k}:</span>
                <span className="font-medium font-mono" style={{ color: '#0A1F3D' }}>{v}</span>
              </div>
            ))}
            {!paymentResult?.errorFields && transaction?.outcome?.errorReason && (
              <div className="flex gap-2 text-[11px]">
                <span className="w-32 flex-shrink-0" style={{ color: '#5B6B84' }}>error_reason:</span>
                <span className="font-medium font-mono" style={{ color: '#0A1F3D' }}>{transaction.outcome.errorReason}</span>
              </div>
            )}
          </div>
          {paymentResult?.rawPaymentData && (
            <PayloadViewer title="Razorpay Fetch Payment API response" payload={paymentResult.rawPaymentData} defaultExpanded={false} />
          )}
          {/* Without-system: show terminal dead-end */}
          {!isWithSystem && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(30,58,110,0.18)' }}>
              <div className="text-[11px] font-semibold" style={{ color: '#1E3A6E' }}>
                No further action. This transaction is lost — ₹{scenario.amount.toLocaleString('en-IN')} unrecovered.
              </div>
              <p className="text-[11px] mt-0.5 italic" style={{ color: '#5B6B84' }}>Customer must manually return and retry. No automated follow-up exists.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Success (prevention scenarios ending in success) ── */}
      {!isEmandate && isSuccess && (paymentResult?.status === 'success' || transaction?.outcome?.status === 'success') && (
        <SuccessCard
          headline={
            isExpiringCard ? 'Prevention succeeded — first real attempt captured' :
            isHighRisk ? 'Prevention succeeded — routed around the risk' :
            isTimeout ? 'Payment completed within extended window' :
            'Payment captured'
          }
          detail={
            isExpiringCard ? 'Fresh card entered after Layer 1 prompt. No failure ever occurred — the expiry was caught before the checkout attempt.' :
            isHighRisk ? 'Wallet/UPI rail (pre-selected by Layer 1) captured the payment. The card-rail attempt on the left pane would have been declined by the issuing bank.' :
            isTimeout ? '₹' + scenario.amount.toLocaleString('en-IN') + ' collected within the 5:00 extended session. The 3:00 baseline on the left would have expired before completion.' :
            `₹${scenario.amount.toLocaleString('en-IN')} captured.`
          }
        />
      )}

      {/* ── Stuck/Ambiguous left pane: worst case without system ── */}
      {isAmbiguous && !isWithSystem && (paymentResult?.errorFields || transaction?.outcome?.status === 'ambiguous' || transaction?.outcome?.status === 'failed') && (
        <div className="p-4 rounded-[14px]" style={{ border: '1px solid rgba(30,58,110,0.22)', background: 'linear-gradient(180deg, #EAF1FE 0%, #E8F0FD 100%)' }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(30,58,110,0.12)' }}>
              <XCircle className="w-4 h-4" style={{ color: '#1E3A6E' }} />
            </div>
            <span className="text-xs font-semibold" style={{ color: '#1E3A6E' }}>Payment status: ambiguous</span>
          </div>
          <div className="space-y-1 mb-3 pl-1 text-[11px]">
            <div className="flex gap-2"><span className="w-36 flex-shrink-0" style={{ color: '#5B6B84' }}>status:</span><span className="font-mono font-medium" style={{ color: '#0A1F3D' }}>ambiguous</span></div>
            <div className="flex gap-2"><span className="w-36 flex-shrink-0" style={{ color: '#5B6B84' }}>error_reason:</span><span className="font-mono font-medium" style={{ color: '#0A1F3D' }}>webhook_drop</span></div>
            <div className="flex gap-2"><span className="w-36 flex-shrink-0" style={{ color: '#5B6B84' }}>error_source:</span><span className="font-mono font-medium" style={{ color: '#0A1F3D' }}>gateway</span></div>
            <div className="flex gap-2"><span className="w-36 flex-shrink-0" style={{ color: '#5B6B84' }}>flagged_after:</span><span className="font-mono font-medium" style={{ color: '#0A1F3D' }}>~18s no webhook</span></div>
            {(paymentResult?.errorFields?.underlying_razorpay_reason || paymentResult?.errorFields?.error_reason) && (
              <div className="flex gap-2 mt-1 pt-1" style={{ borderTop: '1px solid rgba(30,58,110,0.12)' }}>
                <span className="w-36 flex-shrink-0" style={{ color: '#5B6B84' }}>razorpay_raw:</span>
                <span className="font-mono font-medium" style={{ color: '#8B98AC' }}>
                  {paymentResult.errorFields.underlying_razorpay_reason || paymentResult.errorFields.error_reason}
                </span>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 space-y-1" style={{ borderTop: '1px solid rgba(30,58,110,0.18)' }}>
            <div className="text-[11px] font-semibold" style={{ color: '#1E3A6E' }}>Without system: merchant assumes failure → customer re-prompted to pay again.</div>
            <p className="text-[11px] italic" style={{ color: '#5B6B84' }}>Bank already debited ₹{scenario.amount.toLocaleString('en-IN')}. Second payment attempt = double charge.</p>
          </div>
        </div>
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
      <div className="space-y-0">
        <div className="text-[11px] font-semibold mb-2.5" style={{ color: '#8B98AC' }}>Layer 2: Reconciliation pipeline</div>
        <div className="relative">
          {/* Step 1: Classification */}
          {c && (
            <div className="flex gap-3">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-10" style={{ background: 'rgba(10,31,77,0.08)', color: '#0A1F3D' }}>1</div>
                <div className="w-px flex-1 my-0.5" style={{ background: '#E3E8F0', minHeight: 16 }} />
              </div>
              <div className="flex-1 min-w-0 pb-3">
                <div className="text-[10px] font-semibold mb-0.5" style={{ color: '#8B98AC' }}>Watchdog flagged ambiguous</div>
                <div className="text-[11px]"><span style={{ color: '#8B98AC' }}>Category: </span><span className="font-semibold" style={{ color: '#0A1F3D' }}>{c.category}</span></div>
                <div className="text-[11px] mt-0.5" style={{ color: '#5B6B84' }}>
                  pending → ~18s no webhook received → status set to <span className="font-mono font-medium" style={{ color: '#0A1F3D' }}>ambiguous</span>
                </div>
                {diagnosis?.errorFields?.underlying_razorpay_reason && (
                  <div className="text-[11px] mt-1 font-mono" style={{ color: '#8B98AC' }}>
                    razorpay reported: <span style={{ color: '#5B6B84' }}>{diagnosis.errorFields.underlying_razorpay_reason}</span>
                    {' '}— treated as ambiguous because webhook was not received
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Steps 2–4: Real API calls from reconciliation log */}
          {reconLog.map((entry, idx) => {
            const isLast = idx === reconLog.length - 1 && isSilentRecovery;
            const resultStr = entry.result
              ? Object.entries(entry.result).map(([k, v]) => `${k}: ${v}`).join(', ')
              : entry.error || '';
            return (
              <div key={idx} className="flex gap-3">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-10" style={{ background: 'rgba(43,95,224,0.12)', color: '#2B5FE0' }}>{idx + 2}</div>
                  {!isLast && <div className="w-px flex-1 my-0.5" style={{ background: '#E3E8F0', minHeight: 16 }} />}
                </div>
                <div className="flex-1 min-w-0 pb-3">
                  <div className="text-[10px] font-semibold mb-0.5" style={{ color: '#8B98AC' }}>API call: {entry.endpoint}</div>
                  <div className="text-[11px] font-mono" style={{ color: '#0A1F3D' }}>→ {resultStr}</div>
                  {entry.error && <div className="text-[11px]" style={{ color: '#E05B5B' }}>{entry.error}</div>}
                </div>
              </div>
            );
          })}

          {/* Silent recovery outcome */}
          {isSilentRecovery && (
            <div className="flex gap-3">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-5 h-5 rounded-full flex items-center justify-center z-10" style={{ background: 'rgba(43,95,224,0.18)', color: '#2B5FE0' }}>
                  <span className="text-[10px] font-bold">✓</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <SuccessCard
                  headline="Recovered silently — no customer contact"
                  detail={`₹${scenario.amount.toLocaleString('en-IN')} confirmed already captured by Razorpay. Merchant record updated to recovered. Zero customer-facing friction — no risk of double charge.`}
                  subNote={ex?.details?.resolutionNote || 'Payment was already captured at the bank.'}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Standard recovery steps (UPI decline, etc.) ──
  const steps = [
    {
      num: 1,
      label: 'Classifying failure',
      content: c ? (
        <div className="space-y-0.5">
          <div className="text-[11px]"><span style={{ color: '#8B98AC' }}>Category: </span><span className="font-semibold" style={{ color: '#0A1F3D' }}>{c.category}</span></div>
          <div className="text-[11px]" style={{ color: '#5B6B84' }}>{c.reasoning}</div>
        </div>
      ) : null
    },
    {
      num: 2,
      label: 'Selecting recovery action (Layer 3 bandit)',
      content: b ? (
        <div className="space-y-0.5">
          <div className="text-[11px]"><span style={{ color: '#8B98AC' }}>Bandit selected: </span><span className="font-semibold" style={{ color: '#0A1F3D' }}>{b.action}</span></div>
          {b.winRate !== undefined && (
            <div className="text-[11px]" style={{ color: '#5B6B84' }}>
              {b.action} has a <span className="font-semibold" style={{ color: '#0A1F3D' }}>{Math.round((b.winRate || 0.62) * 100)}%</span> historical success rate for this category — selected over delayed retry.
            </div>
          )}
          {r?.restraint && <div className="text-[11px] font-semibold" style={{ color: '#3E63B0' }}>Restraint gate fired — see below</div>}
        </div>
      ) : null
    },
    {
      num: 3,
      label: 'Generating real Razorpay Payment Link',
      content: ex?.razorpayPaymentLinkId ? (
        <div className="space-y-0.5">
          <div className="text-[11px]">
            <span style={{ color: '#8B98AC' }}>POST /v1/payment_links → </span>
            <span className="font-semibold font-mono" style={{ color: '#2B5FE0' }}>{ex.razorpayPaymentLinkId}</span>
          </div>
          <div className="text-[11px]" style={{ color: '#5B6B84' }}>Link allows customer to pay via card, netbanking, or a different UPI app — any method they can complete.</div>
        </div>
      ) : (
        ex?.actionTaken && !ex.razorpayPaymentLinkId ? (
          <div className="text-[11px]" style={{ color: '#5B6B84' }}>Action: <span>{ex.actionTaken}</span></div>
        ) : null
      )
    }
  ];

  const visibleSteps = steps.filter(s => s.content);

  return (
    <div className="space-y-0">
      <div className="text-[11px] font-semibold mb-2.5" style={{ color: '#8B98AC' }}>Layer 2+3: Recovery pipeline</div>

      <div className="relative">
        {visibleSteps.map((step, idx) => (
          <div key={step.num} className="flex gap-3 relative">
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-10"
                style={{ background: 'rgba(10,31,77,0.08)', color: '#0A1F3D' }}
              >
                {step.num}
              </div>
              {(idx < visibleSteps.length - 1 || recoveryLink || (r?.restraint && !recoveryLink)) && (
                <div className="w-px flex-1 my-0.5" style={{ background: '#E3E8F0', minHeight: 16 }} />
              )}
            </div>
            <div className="flex-1 min-w-0 pb-3">
              <div className="text-[10px] font-semibold mb-0.5" style={{ color: '#8B98AC' }}>{step.label}</div>
              {step.content}
            </div>
          </div>
        ))}

        {/* Restraint gate — shown instead of link when recovery was suppressed */}
        {r?.restraint && !recoveryLink && (
          <div className="flex gap-3">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="w-5 h-5 rounded-full flex items-center justify-center z-10" style={{ background: 'rgba(62,99,176,0.16)' }}>
                <Ban className="w-3 h-3" style={{ color: '#3E63B0' }} />
              </div>
            </div>
            <div className="flex-1 min-w-0 p-3 rounded-[12px]" style={{ border: '1px solid rgba(62,99,176,0.3)', background: '#EAF1FE' }}>
              <div className="text-xs font-semibold mb-1" style={{ color: '#3E63B0' }}>Restraint gate enforced</div>
              <p className="text-[11px] leading-relaxed" style={{ color: '#3E4C63' }}>{r.reason || 'Recovery suppressed — cost of action exceeds expected recovery value.'}</p>
            </div>
          </div>
        )}

        {/* Step 4: recovery link + simulate paid */}
        {recoveryLink && (
          <div className="flex gap-3">
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-10"
                style={{ background: 'rgba(43,95,224,0.14)', color: '#2B5FE0' }}
              >4</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold mb-1.5" style={{ color: '#2B5FE0' }}>Recovery link ready</div>
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
          <SuccessCard
            headline="Recovered — revenue retrieved"
            detail={`₹${scenario.amount.toLocaleString('en-IN')} collected via automated Payment Link recovery. Layer 3 bandit's win rate for this category updated.`}
          />
        </div>
      )}
    </div>
  );
}

// ─── Retry panel (Scenario 2 right pane only) ─────────────────────────────
function RetryPanel({ retryOrderData, isPaid, scenario, onOpenRetryCheckout, loading }) {
  if (isPaid) {
    return (
      <SuccessCard
        headline="Revenue recovered via automatic retry"
        detail={`₹${scenario.amount.toLocaleString('en-IN')} captured on the second real Razorpay order. The extended session window gave the customer time to complete.`}
      />
    );
  }

  return (
    <div className="p-4 rounded-[14px] bg-white space-y-2.5" style={{ border: '1px solid #E3E8F0' }}>
      <div className="text-[11px] font-semibold inline-flex items-center gap-1.5" style={{ color: '#0A1F3D' }}>
        <Zap className="w-3 h-3" style={{ color: '#2B5FE0' }} />
        Layer 2: Automatic retry via a fresh attempt
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: '#5B6B84' }}>
        A second real Razorpay order will be created. Enter the same test card again without selecting Failure — it will capture successfully.
      </p>
      {!retryOrderData ? (
        <button
          onClick={onOpenRetryCheckout} disabled={loading}
          style={{
            background: 'linear-gradient(180deg, #3B6FE8 0%, #2B5FE0 100%)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 14px -6px rgba(43,95,224,0.5)',
          }}
          className="inline-flex items-center gap-1.5 text-white text-xs font-semibold px-3.5 py-2.5 rounded-[12px] transition-all active:scale-[0.98] disabled:opacity-50 w-full justify-center">
          <Zap className="w-3.5 h-3.5 fill-current" />
          {loading ? 'Creating retry order…' : 'Retry now — open Checkout again'}
        </button>
      ) : (
        <div className="text-[11px]" style={{ color: '#5B6B84' }}>
          Retry order: <span className="font-medium font-mono" style={{ color: '#0A1F3D' }}>{retryOrderData.retryOrder?.id}</span>
          <span className="ml-2">— modal is open, enter card without selecting Failure.</span>
        </div>
      )}
    </div>
  );
}

// ─── Reusable sub-components ──────────────────────────────────────────────
function TerminalFailCard({ reason, description, note }) {
  return (
    <div className="p-4 rounded-[14px]" style={{ border: '1px solid rgba(30,58,110,0.22)', background: 'linear-gradient(180deg, #EAF1FE 0%, #E8F0FD 100%)' }}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(30,58,110,0.12)' }}>
          <XCircle className="w-4 h-4" style={{ color: '#1E3A6E' }} />
        </div>
        <span className="text-xs font-semibold" style={{ color: '#1E3A6E' }}>
          API rejected
          {reason && <span className="font-normal ml-1" style={{ color: '#5B6B84' }}>({reason})</span>}
        </span>
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: '#5B6B84' }}>{description}</p>
      {note && (
        <div className="mt-2.5 pt-2.5 text-[11px] font-semibold" style={{ borderTop: '1px solid rgba(30,58,110,0.18)', color: '#1E3A6E' }}>
          {note}
        </div>
      )}
    </div>
  );
}

function SuccessCard({ headline, detail, subNote }) {
  return (
    <div className="p-4 rounded-[14px]" style={{ border: '1px solid rgba(43,95,224,0.2)', background: 'linear-gradient(180deg, #EDF4FE 0%, #E8F0FD 100%)' }}>
      <div className="flex items-center gap-2.5 mb-1.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(43,95,224,0.12)' }}>
          <CheckCircle2 className="w-4 h-4" style={{ color: '#2B5FE0' }} />
        </div>
        <span className="text-xs font-semibold" style={{ color: '#2B5FE0' }}>{headline}</span>
      </div>
      {detail && <p className="text-[11px] leading-relaxed pl-[42px]" style={{ color: '#3E5A8C' }}>{detail}</p>}
      {subNote && <p className="text-[11px] mt-1 italic pl-[42px]" style={{ color: '#2B5FE0' }}>{subNote}</p>}
    </div>
  );
}

function StatePill({ state }) {
  const map = {
    IDLE: { label: 'Idle', style: { color: '#8B98AC', background: '#F6F9FE', border: '1px solid #E3E8F0' } },
    CREATED: { label: 'Order created', style: { color: '#0A1F3D', background: 'rgba(10,31,77,0.06)', border: '1px solid rgba(10,31,77,0.14)' } },
    CHECKOUT_OPEN: { label: 'Checkout open', style: { color: '#3E63B0', background: '#EAF1FE', border: '1px solid rgba(62,99,176,0.32)' } },
    AWAITING_RESULT: { label: 'Awaiting result', style: { color: '#3E63B0', background: '#EAF1FE', border: '1px solid rgba(62,99,176,0.32)' } },
    RESOLVED: { label: 'Resolved', style: { color: '#2B5FE0', background: '#E8F0FD', border: '1px solid rgba(43,95,224,0.24)' } }
  };
  const { label, style } = map[state] || map.IDLE;
  return (
    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5" style={style}>
      <Circle className="w-1.5 h-1.5" style={{ fill: style.color, color: style.color }} />
      {label}
    </span>
  );
}
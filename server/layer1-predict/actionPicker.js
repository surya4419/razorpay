import { calculateRiskScore } from './riskScorer.js';

export const LAYER1_ACTIONS = {
  PROCEED_NORMAL: 'PROCEED_NORMAL',
  REORDER_METHODS: 'REORDER_METHODS',
  EXTEND_SESSION: 'EXTEND_SESSION',
  SMART_ROUTE: 'SMART_ROUTE',
  TIME_AWARE_ROUTE: 'TIME_AWARE_ROUTE',
  CASCADE_BACKUP: 'CASCADE_BACKUP',
  PRECOLLECT_AFA: 'PRECOLLECT_AFA',
  CARD_EXPIRY_NUDGE: 'CARD_EXPIRY_NUDGE',
  STEP_UP_VERIFY: 'STEP_UP_VERIFY'
};

/**
 * Selects prevention action and builds explainable reasoning.
 */
export function pickPreventionAction(context = {}) {
  const {
    amount = 0,
    method = 'upi',
    timeOfDay = '14:00',
    device = 'mobile_web',
    customer = null,
    transactionType = 'one-off'
  } = context;

  const scoreResult = calculateRiskScore(context);
  const { riskScore, tier, breakdown, isPeakHour } = scoreResult;

  // 1. Hard Rule: RBI E-mandate > ₹15,000 threshold
  if (transactionType === 'recurring' && Number(amount) > 15000) {
    return {
      action: LAYER1_ACTIONS.PRECOLLECT_AFA,
      tier: 'HIGH',
      riskScore: Math.max(85, riskScore),
      razorpayCallMade: 'Subscriptions API (AFA flow)',
      reasoning: `RBI Digital Payments E-mandate Framework requires fresh OTP/AFA for recurring amounts > ₹15,000. Silent auto-debit would fail deterministically; pre-collected authentication flow triggered.`,
      details: {
        regulatoryTrigger: 'RBI_EMANDATE_15K_AFA',
        amount,
        breakdown
      }
    };
  }

  // 2. Hard Rule: Card Expiring soon — ONLY for saved card flows or expiring card scenario
  const isExpiringCardScenario = context.scenario === 'expiring_saved_card' || context.isSavedCardPayment;
  const isRecurringCard = transactionType === 'recurring' && method === 'card';

  if ((isExpiringCardScenario || isRecurringCard) && customer?.cardTokens?.length > 0) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const expiringCard = customer.cardTokens.find(token => {
      return token.expiryYear < currentYear || (token.expiryYear === currentYear && token.expiryMonth <= currentMonth + 1);
    });

    if (expiringCard) {
      return {
        action: LAYER1_ACTIONS.CARD_EXPIRY_NUDGE,
        tier: 'HIGH',
        riskScore: Math.max(75, riskScore),
        razorpayCallMade: 'Tokens API (expiry check)',
        reasoning: `Customer's saved card on file (*${expiringCard.last4}) expires this month. Proactively prompting for card update before checkout — a blind attempt with this token would fail at issuing bank level.`,
        details: {
          expiringCard,
          breakdown,
          action: 'Prompt card update before allowing Checkout to proceed'
        }
      };
    }
  }

  // 3. Scenario-explicit rule: Slow network / Peak hour timeout extension
  if (context.scenario === 'payment_timed_out' || context.isSlowNetwork) {
    return {
      action: LAYER1_ACTIONS.EXTEND_SESSION,
      tier: 'MEDIUM',
      riskScore: Math.max(45, riskScore),
      razorpayCallMade: 'Checkout timeout config (300s)',
      reasoning: `Peak-hour banking congestion and mobile web latency detected. Proactively extended Checkout validity window from 3:00 to 5:00 (+67%) in Razorpay configuration.`,
      details: { timeoutSeconds: 300, breakdown }
    };
  }

  // 4. High-value + new device → REORDER_METHODS to Wallet first (primary use case for high_risk_new_device scenario)
  if (context.scenario === 'high_risk_new_device' || (Number(amount) >= 20000 && (!customer?.methodHistory || customer.methodHistory.length === 0))) {
    return {
      action: LAYER1_ACTIONS.REORDER_METHODS,
      tier: 'HIGH',
      riskScore: Math.max(75, riskScore),
      razorpayCallMade: 'Checkout display.sequence config',
      reasoning: `First-time device profile on a ₹${Number(amount).toLocaleString('en-IN')} transaction. This profile has an elevated issuing bank fraud-screen decline rate on card vs Wallet/UPI. Proactively reordered checkout sequence to surface Wallet first.`,
      details: {
        preferredOrder: ['wallet', 'upi', 'card', 'netbanking'],
        riskSignals: ['new_device', 'high_value', 'no_historical_profile'],
        breakdown
      }
    };
  }

  // 5. LOW Tier (0-39) → Proceed normally
  if (tier === 'LOW') {
    return {
      action: LAYER1_ACTIONS.PROCEED_NORMAL,
      tier: 'LOW',
      riskScore,
      razorpayCallMade: null,
      reasoning: method === 'upi'
        ? `Low failure risk profile (Score: ${riskScore}/100). Standard UPI rail transaction.`
        : `Low failure risk profile (Score: ${riskScore}/100). Customer history and transaction context meet standard processing benchmarks.`,
      details: { breakdown }
    };
  }

  // 6. MEDIUM Tier (40-69) → Lightweight adjustments
  if (tier === 'MEDIUM') {
    // Peak hour banking congestion
    if (isPeakHour) {
      return {
        action: LAYER1_ACTIONS.TIME_AWARE_ROUTE,
        tier: 'MEDIUM',
        riskScore,
        razorpayCallMade: 'Simulated Optimizer (Peak Load Shifting)',
        reasoning: `Transaction falls inside peak evening banking load window (7–10 PM). Dynamically prioritizing high-throughput banking channels.`,
        details: { isPeakHour, breakdown }
      };
    }

    // Customer has mixed method history (e.g. UPI higher than Card)
    if (customer?.methodHistory?.length > 0) {
      const sortedMethods = [...customer.methodHistory]
        .sort((a, b) => b.successRate - a.successRate)
        .map(m => m.method.toLowerCase());

      return {
        action: LAYER1_ACTIONS.REORDER_METHODS,
        tier: 'MEDIUM',
        riskScore,
        razorpayCallMade: 'Checkout display.sequence config',
        reasoning: `Customer historical approval rate is significantly higher on ${sortedMethods[0]} than alternatives. Reordered Checkout sequence to surface ${sortedMethods[0]} first.`,
        details: {
          preferredOrder: sortedMethods,
          breakdown
        }
      };
    }

    // Mobile web slow network risk
    if (device === 'mobile_web') {
      return {
        action: LAYER1_ACTIONS.EXTEND_SESSION,
        tier: 'MEDIUM',
        riskScore,
        razorpayCallMade: 'Checkout timeout config (300s)',
        reasoning: `Mobile web session detected with higher timeout abandonment risk. Extended Checkout validity window from 3 to 5 minutes.`,
        details: { timeoutSeconds: 300, breakdown }
      };
    }

    return {
      action: LAYER1_ACTIONS.REORDER_METHODS,
      tier: 'MEDIUM',
      riskScore,
      razorpayCallMade: 'Checkout display.sequence config',
      reasoning: `Moderate risk detected. Optimized checkout method layout for instant conversion.`,
      details: { preferredOrder: ['upi', 'card', 'netbanking'], breakdown }
    };
  }

  // 7. HIGH Tier (70-100) fallback
  if (Number(amount) >= 20000 && device === 'mobile_web') {
    return {
      action: LAYER1_ACTIONS.STEP_UP_VERIFY,
      tier: 'HIGH',
      riskScore,
      razorpayCallMade: 'Checkout light step-up logic',
      reasoning: `High-value purchase (₹${amount}) on mobile device. Attached frictionless step-up check to avoid false-positive hard block at bank gateway.`,
      details: { breakdown }
    };
  }

  return {
    action: LAYER1_ACTIONS.CASCADE_BACKUP,
    tier: 'HIGH',
    riskScore,
    razorpayCallMade: 'Orders API (pre-emptive fallback order)',
    reasoning: `High risk score (${riskScore}/100) on primary payment route. Pre-emptively established secondary backup routing order.`,
    details: { breakdown }
  };
}


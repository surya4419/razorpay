import { FAILURE_CATEGORIES } from './decisionTable.js';

/**
 * Single Shared Classifier for both Real Razorpay API / Webhook and Simulated Paths.
 * Maps Razorpay's exact structured error fields to the 22-category taxonomy.
 *
 * @param {Object} errorPayload - Object containing Razorpay error fields:
 *   - error_code
 *   - error_description
 *   - error_reason
 *   - error_source ('customer' | 'bank' | 'gateway' | 'business')
 *   - error_step ('payment_authentication' | 'payment_authorization' | 'payment_initiation' | etc.)
 * @param {Object} [context] - Optional transaction context (amount, transactionType, method, etc.)
 * @returns {Object} { category, confidence, reasoning, source: 'razorpay_error_taxonomy' }
 */
export function classifyError(errorPayload = {}, context = {}) {
  const code = (errorPayload.error_code || errorPayload.code || '').toUpperCase();
  const reason = (errorPayload.error_reason || errorPayload.reason || '').toLowerCase();
  const desc = (errorPayload.error_description || errorPayload.description || '').toLowerCase();
  const source = (errorPayload.error_source || errorPayload.source || '').toLowerCase();
  const step = (errorPayload.error_step || errorPayload.step || '').toLowerCase();
  const method = (context.method || errorPayload.method || '').toLowerCase();
  const amount = Number(context.amount || errorPayload.amount || 0);
  const transactionType = context.transactionType || errorPayload.transactionType || 'one-off';

  // 1. Regulatory / E-mandate / AFA rules
  if (
    transactionType === 'recurring' && 
    (amount > 15000 || reason.includes('mandate') || reason.includes('afa') || desc.includes('15000') || desc.includes('e-mandate') || desc.includes('afa'))
  ) {
    return {
      category: FAILURE_CATEGORIES.REGULATORY_EMANDATE_AFA_REQUIRED,
      confidence: 1.0,
      reasoning: `RBI E-Mandate Framework requires fresh AFA/OTP authentication for recurring debits above ₹15,000. Error: ${reason || 'amount_exceeded'}.`,
      matchedField: 'transactionType + amount > 15000 / error_reason: mandate_afa'
    };
  }

  if (reason.includes('predebit') || desc.includes('pre-debit') || desc.includes('24 hour') || desc.includes('notification')) {
    return {
      category: FAILURE_CATEGORIES.REGULATORY_MISSED_PREDEBIT_ALERT,
      confidence: 0.95,
      reasoning: `Recurring payment failed due to missed mandatory 24-hour pre-debit alert required by RBI guidelines.`,
      matchedField: 'error_reason: predebit_alert'
    };
  }

  // 2. Ambiguous/Stuck — webhook drop, bank debited but merchant not confirmed
  if (
    reason === 'webhook_drop' ||
    reason === 'ambiguous' ||
    reason === 'stuck_payment' ||
    reason.includes('webhook') ||
    desc.includes('webhook') ||
    desc.includes('confirmation not received') ||
    errorPayload.status === 'ambiguous'
  ) {
    return {
      category: FAILURE_CATEGORIES.STUCK_AMBIGUOUS_TRANSACTION,
      confidence: 0.97,
      reasoning: `Payment status is ambiguous — bank may have debited customer but webhook confirmation was not received by the merchant. Real API reconciliation required before any customer contact.`,
      matchedField: 'status: ambiguous / reason: webhook_drop'
    };
  }

  // 3. Soft Declines
  if (
    reason === 'payment_timed_out' || 
    reason === 'request_timed_out' || 
    reason === 'gateway_timeout' || 
    desc.includes('timed out') || 
    desc.includes('timeout')
  ) {
    return {
      category: FAILURE_CATEGORIES.SOFT_TIMEOUT_SYSTEM_ERROR,
      confidence: 0.95,
      reasoning: `Network/issuer timeout occurred during payment processing (error_reason: ${reason || 'payment_timed_out'}).`,
      matchedField: 'error_reason: payment_timed_out'
    };
  }

  if (
    reason === 'do_not_honor' || 
    desc.includes('do not honor') || 
    desc.includes('transaction not permitted by bank') ||
    desc.includes('declined by bank') && !reason.includes('fraud') && !reason.includes('stolen')
  ) {
    return {
      category: FAILURE_CATEGORIES.SOFT_DO_NOT_HONOR,
      confidence: 0.90,
      reasoning: `Issuing bank issued generic "Do Not Honor" response. Often resolvable on delayed retry or alternate card rail.`,
      matchedField: 'error_reason: do_not_honor'
    };
  }

  if (
    reason.includes('limit_exceeded') || 
    reason.includes('withdrawal_limit') || 
    desc.includes('limit exceeded') ||
    desc.includes('exceeds card limit')
  ) {
    if (method === 'upi' || desc.includes('upi')) {
      return {
        category: FAILURE_CATEGORIES.UPI_DAILY_LIMIT_EXCEEDED,
        confidence: 0.95,
        reasoning: `UPI daily transaction limit exceeded for this account. Alternative rail (Card/Netbanking) required.`,
        matchedField: 'method: upi + limit_exceeded'
      };
    }
    return {
      category: FAILURE_CATEGORIES.SOFT_LIMIT_EXCEEDED,
      confidence: 0.92,
      reasoning: `Transaction exceeded maximum permissible limit on payment instrument. Alternate payment method advised.`,
      matchedField: 'error_reason: limit_exceeded'
    };
  }

  // 3. Hard Declines (Never auto-retry)
  if (
    reason.includes('expired_card') || 
    desc.includes('card has expired') || 
    desc.includes('expired')
  ) {
    return {
      category: FAILURE_CATEGORIES.HARD_EXPIRED_CARD,
      confidence: 1.0,
      reasoning: `Card token or card details have expired. Auto-retrying would fail and degrade merchant trust score.`,
      matchedField: 'error_reason: expired_card'
    };
  }

  if (
    reason.includes('lost_card') || 
    reason.includes('stolen_card') || 
    desc.includes('lost card') || 
    desc.includes('stolen')
  ) {
    return {
      category: FAILURE_CATEGORIES.HARD_LOST_STOLEN_CARD,
      confidence: 1.0,
      reasoning: `Card flagged as lost or stolen by issuing authority. Zero retries allowed; alternative payment link required.`,
      matchedField: 'error_reason: lost_stolen_card'
    };
  }

  if (
    reason.includes('invalid_card') || 
    reason.includes('invalid_card_number') || 
    reason.includes('card_not_supported') ||
    desc.includes('invalid card') || 
    desc.includes('card number is invalid')
  ) {
    return {
      category: FAILURE_CATEGORIES.HARD_INVALID_CARD,
      confidence: 1.0,
      reasoning: `Invalid card number or unsupported BIN. Permanent failure; requires customer to enter different card.`,
      matchedField: 'error_reason: invalid_card'
    };
  }

  if (
    reason.includes('fraud') || 
    reason.includes('security_violation') || 
    desc.includes('suspected fraud') || 
    desc.includes('blocked due to risk')
  ) {
    // Distinguish issuer hard fraud block vs possible false-positive
    if (source === 'bank' || reason.includes('issuer_fraud')) {
      return {
        category: FAILURE_CATEGORIES.HARD_FRAUD_BLOCK,
        confidence: 0.95,
        reasoning: `Hard decline by issuer fraud risk monitoring engine. Do not retry original instrument.`,
        matchedField: 'error_source: bank + error_reason: fraud'
      };
    } else {
      return {
        category: FAILURE_CATEGORIES.FRAUD_RULE_FALSE_POSITIVE,
        confidence: 0.85,
        reasoning: `Transaction flagged by internal velocity/location rule. Light step-up verification initiated to protect genuine revenue.`,
        matchedField: 'error_source: business/gateway + fraud_rule'
      };
    }
  }

  // 4. UPI Specific Failures
  if (method === 'upi' || reason.includes('upi') || desc.includes('upi') || desc.includes('vpa')) {
    if (
      reason.includes('incorrect_pin') || 
      reason.includes('wrong_pin') || 
      desc.includes('incorrect pin') || 
      desc.includes('mpin')
    ) {
      return {
        category: FAILURE_CATEGORIES.UPI_WRONG_PIN,
        confidence: 1.0,
        reasoning: `User entered incorrect UPI MPIN. Immediate re-prompt on existing handle has high instant recovery probability.`,
        matchedField: 'error_reason: incorrect_pin'
      };
    }

    if (
      reason.includes('vpa_not_found') || 
      reason.includes('invalid_vpa') || 
      desc.includes('vpa is invalid') || 
      desc.includes('address not found')
    ) {
      return {
        category: FAILURE_CATEGORIES.UPI_INVALID_VPA,
        confidence: 0.98,
        reasoning: `Entered VPA handle does not exist or is inactive. Prompt user to re-type or select alternate app.`,
        matchedField: 'error_reason: invalid_vpa'
      };
    }

    if (
      source === 'bank' || 
      source === 'gateway' || 
      reason.includes('npci') || 
      desc.includes('npci') || 
      desc.includes('issuing bank is facing downtime') ||
      desc.includes('upi server')
    ) {
      return {
        category: FAILURE_CATEGORIES.UPI_SERVER_DOWNTIME,
        confidence: 0.95,
        reasoning: `NPCI or beneficiary PSP bank switch experiencing downtime (source: ${source}). Delayed retry scheduled.`,
        matchedField: 'error_source: bank/npci + method: upi'
      };
    }
  }

  // 5. Authentication & OTP Failures
  if (
    step === 'payment_authentication' || 
    reason.includes('otp') || 
    reason.includes('3ds') || 
    desc.includes('otp') || 
    desc.includes('authentication failed')
  ) {
    return {
      category: FAILURE_CATEGORIES.AUTH_OTP_DELIVERY_FAILURE,
      confidence: 0.90,
      reasoning: `Payment failed during authentication stage (error_step: ${step || 'payment_authentication'}). OTP delivery or submission issue.`,
      matchedField: 'error_step: payment_authentication'
    };
  }

  // 6. Infrastructure & Downtime
  if (source === 'bank' || source === 'gateway' || code === 'GATEWAY_ERROR' || code === 'SERVER_ERROR') {
    return {
      category: FAILURE_CATEGORIES.INFRA_GATEWAY_DOWNTIME,
      confidence: 0.92,
      reasoning: `Infrastructure degradation at payment gateway or bank switch (error_source: ${source}). Dynamic alternative routing triggered.`,
      matchedField: `error_source: ${source}`
    };
  }

  // 7. Abandonment / Non-decline revenue loss
  if (reason === 'session_expired' || desc.includes('session expired') || desc.includes('checkout timeout')) {
    return {
      category: FAILURE_CATEGORIES.INFRA_SESSION_TIMEOUT,
      confidence: 0.90,
      reasoning: `Customer checkout session timed out prior to payment authorization.`,
      matchedField: 'error_reason: session_expired'
    };
  }

  if (reason === 'network_error' || desc.includes('network disconnected') || desc.includes('connection lost')) {
    return {
      category: FAILURE_CATEGORIES.INFRA_NETWORK_DROP,
      confidence: 0.88,
      reasoning: `Client connection was abruptly terminated mid-transaction.`,
      matchedField: 'error_reason: network_drop'
    };
  }

  if (reason === 'price_friction' || desc.includes('price shock') || desc.includes('shipping fee friction')) {
    return {
      category: FAILURE_CATEGORIES.ABANDON_PRICE_SHOCK,
      confidence: 0.85,
      reasoning: `User abandoned checkout at summary step due to fee transparency friction.`,
      matchedField: 'abandonment: price_shock'
    };
  }

  if (reason === 'otp_abandon' || desc.includes('gave up on otp')) {
    return {
      category: FAILURE_CATEGORIES.ABANDON_OTP_DELAY,
      confidence: 0.85,
      reasoning: `User abandoned flow after waiting for OTP SMS. Alternate delivery channel recommended.`,
      matchedField: 'abandonment: otp_delay'
    };
  }

  if (reason === 'abandoned' || desc.includes('cart abandoned') || desc.includes('window closed')) {
    return {
      category: FAILURE_CATEGORIES.ABANDON_GENERAL_FRICTION,
      confidence: 0.80,
      reasoning: `General checkout drop-off detected without explicit gateway error code.`,
      matchedField: 'status: abandoned'
    };
  }

  // Fallback to soft decline or generic system error
  return {
    category: FAILURE_CATEGORIES.SOFT_TIMEOUT_SYSTEM_ERROR,
    confidence: 0.70,
    reasoning: `Unspecified transient failure (code: ${code || 'UNKNOWN'}, reason: ${reason || 'generic'}). Defaulting to non-disruptive alternate flow retry.`,
    matchedField: 'default_fallback'
  };
}

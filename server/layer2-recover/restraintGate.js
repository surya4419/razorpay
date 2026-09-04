import { DEFAULT_DECISION_TABLE } from './decisionTable.js';

/**
 * Evaluates whether an intervention is justified under the Restraint Principle.
 * Prevents spamming customers, respects hard stopping rules, and weighs expected recovery value against customer friction.
 *
 * @param {Object} params
 *   - category: string
 *   - attemptsSoFar: number
 *   - amount: number
 *   - customerSegment: string
 *   - banditWinRate: number
 *   - proposedAction: string
 * @returns {Object} { allowed: boolean, action: string, restraint: boolean, reason: string }
 */
export function evaluateRestraintGate({
  category,
  attemptsSoFar = 0,
  amount = 0,
  customerSegment = 'regular',
  banditWinRate = 0.5,
  proposedAction
}) {
  const meta = DEFAULT_DECISION_TABLE[category] || {
    maxAttempts: 1,
    frictionCost: 1,
    defaultAction: 'SUGGEST_ALT_METHOD'
  };

  const actionToUse = proposedAction || meta.defaultAction;
  const isHardDecline = category.startsWith('HARD_');

  // 1. Hard declines must NEVER auto-retry (only non-intrusive alternative link allowed once)
  if (isHardDecline) {
    if (actionToUse === 'DELAYED_RETRY' || actionToUse === 'RETRY_ALT_ROUTE' || actionToUse === 'CASCADE_BACKUP') {
      return {
        allowed: false,
        action: 'NO_RETRY_SUGGEST_ALT',
        restraint: true,
        reason: `Restraint enforcement: Hard declines (${category}) must never be retried automatically. Diverted to non-intrusive alternative payment link.`
      };
    }

    if (attemptsSoFar >= 1) {
      return {
        allowed: false,
        action: 'NO_ACTION_STOPPING_RULE',
        restraint: true,
        reason: `Stopping rule reached: Hard decline (${category}) already received initial alternative payment option. Zero auto-retries permitted.`
      };
    }
  }

  // 2. Check hard stopping rules (Max attempts reached)
  const effectiveMaxAttempts = isHardDecline ? 1 : meta.maxAttempts;
  if (attemptsSoFar >= effectiveMaxAttempts) {
    return {
      allowed: false,
      action: 'NO_ACTION_STOPPING_RULE',
      restraint: true,
      reason: `Stopping rule reached: Case has had ${attemptsSoFar} prior attempt(s) (maximum allowed for ${category} is ${meta.maxAttempts}). Ceasing interventions to preserve customer trust.`
    };
  }

  // 3. Friction vs Value Threshold calculation
  // For micro transactions (e.g. < ₹50) with high friction score and low win rate, avoid excessive nudges
  const frictionCost = meta.frictionCost || 1;
  const estimatedExpectedValue = amount * (banditWinRate || 0.5);
  const frictionThreshold = frictionCost * 30; // ₹30 nominal friction weight

  if (amount < 60 && estimatedExpectedValue < frictionThreshold) {
    return {
      allowed: false,
      action: 'NO_ACTION_LOW_VALUE',
      restraint: true,
      reason: `Restraint decision: Expected recovery value (₹${estimatedExpectedValue.toFixed(2)}) does not justify customer friction cost for micro-transaction amount ₹${amount}.`
    };
  }

  // Allowed to proceed with minimum-necessary intervention
  return {
    allowed: true,
    action: actionToUse,
    restraint: false,
    reason: `Intervention approved (attempt ${attemptsSoFar + 1}/${effectiveMaxAttempts}). Minimum-necessary action: ${actionToUse}.`
  };
}

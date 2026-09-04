import { BanditState } from '../models/BanditState.js';
import { DEFAULT_DECISION_TABLE } from '../layer2-recover/decisionTable.js';

/**
 * Computes context bucket string: "tier_<low|mid|high>|<method>|<peak|off_peak>"
 */
export function getContextBucket({ amount = 0, method = 'upi', timeOfDay = '14:00' }) {
  const numAmount = Number(amount) || 0;
  let tier = 'tier_mid';
  if (numAmount < 1000) tier = 'tier_low';
  else if (numAmount > 10000) tier = 'tier_high';

  const cleanMethod = (method || 'upi').toLowerCase();

  let hour = 14;
  if (typeof timeOfDay === 'string' && timeOfDay.includes(':')) {
    hour = parseInt(timeOfDay.split(':')[0], 10);
  }
  const timeBucket = (hour >= 19 && hour <= 22) ? 'peak' : 'off_peak';

  return `${tier}|${cleanMethod}|${timeBucket}`;
}

/**
 * Contextual Bandit Action Selector (Epsilon-Greedy with decay).
 * Returns { action, winRate, exploration, reasoning }
 */
export async function selectRecoveryAction({ category, contextBucket }) {
  const defaultMeta = DEFAULT_DECISION_TABLE[category] || {
    defaultAction: 'SUGGEST_ALT_METHOD',
    alternativeActions: ['SEND_PAYMENT_LINK', 'DELAYED_RETRY']
  };

  const candidateActions = [
    defaultMeta.defaultAction,
    ...(defaultMeta.alternativeActions || [])
  ];

  // Fetch all known bandit states for this (category, contextBucket)
  const states = await BanditState.find({ category, contextBucket });
  const totalAttempts = states.reduce((sum, s) => sum + (s.attempts || 0), 0);

  // Epsilon decay: starts at 0.20, floors at 0.05
  const epsilon = Math.max(0.05, 0.20 * Math.exp(-totalAttempts / 500));
  const isExploring = Math.random() < epsilon;

  if (isExploring && candidateActions.length > 1) {
    // Pick random alternative for exploration
    const randomAction = candidateActions[Math.floor(Math.random() * candidateActions.length)];
    const knownState = states.find(s => s.action === randomAction);
    const rate = knownState ? knownState.winRate : 0.5;

    return {
      action: randomAction,
      winRate: rate,
      exploration: true,
      epsilon,
      reasoning: `Layer 3 Bandit: Exploring alternative action '${randomAction}' (epsilon: ${(epsilon * 100).toFixed(1)}%) to continuously discover optimal conversion paths for ${contextBucket}.`
    };
  }

  // Exploitation: pick action with highest win rate
  if (states.length > 0) {
    // Sort descending by winRate with min attempt confidence
    states.sort((a, b) => {
      // Small Laplace smoothing / confidence weighting
      const scoreA = (a.successes + 1) / (a.attempts + 2);
      const scoreB = (b.successes + 1) / (b.attempts + 2);
      return scoreB - scoreA;
    });

    const best = states[0];
    const defaultState = states.find(s => s.action === defaultMeta.defaultAction);
    const defaultRate = defaultState ? (defaultState.winRate * 100).toFixed(0) : '60';

    return {
      action: best.action,
      winRate: best.winRate,
      exploration: false,
      epsilon,
      reasoning: `Layer 3 Bandit: Selected '${best.action}' for ${category} in context [${contextBucket}] based on ${(best.winRate * 100).toFixed(0)}% historical recovery rate across ${best.attempts} attempts (vs default benchmark ${defaultRate}%).`
    };
  }

  // Cold-start fallback
  return {
    action: defaultMeta.defaultAction,
    winRate: 0.65,
    exploration: false,
    epsilon,
    reasoning: `Layer 3 Bandit: Utilizing cold-start policy '${defaultMeta.defaultAction}' for ${category} (insufficient history in context ${contextBucket}).`
  };
}

/**
 * Updates bandit win-rate after an outcome is observed (real or simulated).
 */
export async function updateBanditOutcome({ category, contextBucket, action, recovered, frictionCost = 1 }) {
  if (!category || !action) return null;

  const bucket = contextBucket || 'tier_mid|upi|off_peak';

  let state = await BanditState.findOne({ category, contextBucket: bucket, action });
  if (!state) {
    state = new BanditState({
      category,
      contextBucket: bucket,
      action,
      attempts: 0,
      successes: 0,
      winRate: 0,
      frictionCost
    });
  }

  state.attempts += 1;
  if (recovered) {
    state.successes += 1;
  }
  state.winRate = state.attempts > 0 ? state.successes / state.attempts : 0;
  state.frictionCost = frictionCost;
  state.lastUpdated = new Date();

  await state.save();
  return state;
}

import { GatewayAmbiguityRate } from '../models/GatewayAmbiguityRate.js';

/**
 * Tracks whether a transaction landed in STUCK_AMBIGUOUS status, per gateway and time-of-day.
 * Per spec 2.6: if a gateway disproportionately produces ambiguous outcomes, feed that back
 * to Layer 1 routing as a negative signal.
 *
 * @param {Object} params
 *   - gateway: string (e.g. 'razorpay')
 *   - timeOfDay: string (e.g. '21:30')
 *   - wasAmbiguous: boolean
 */
export async function trackGatewayAmbiguity({ gateway = 'razorpay', timeOfDay = '14:00', wasAmbiguous = false }) {
  const hour = parseInt((timeOfDay || '14:00').split(':')[0], 10);
  const timeBucket = (hour >= 19 && hour <= 22) ? 'peak' : 'off_peak';

  let record = await GatewayAmbiguityRate.findOne({ gateway, timeBucket });
  if (!record) {
    record = new GatewayAmbiguityRate({ gateway, timeBucket, attempts: 0, ambiguousCount: 0, ambiguityRate: 0 });
  }

  record.attempts += 1;
  if (wasAmbiguous) record.ambiguousCount += 1;
  record.ambiguityRate = record.attempts > 0 ? record.ambiguousCount / record.attempts : 0;
  record.lastUpdated = new Date();
  await record.save();
  return record;
}

/**
 * Returns gateway ambiguity rates as a negative routing signal for Layer 1.
 * A gateway with ambiguityRate > 0.10 should be deprioritized in routing.
 */
export async function getGatewayAmbiguitySignals() {
  const records = await GatewayAmbiguityRate.find({}).sort({ ambiguityRate: -1 });
  return records.map(r => ({
    gateway: r.gateway,
    timeBucket: r.timeBucket,
    ambiguityRate: r.ambiguityRate,
    attempts: r.attempts,
    isHighRisk: r.ambiguityRate > 0.10
  }));
}

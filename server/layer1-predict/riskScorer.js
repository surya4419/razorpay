/**
 * Layer 1 Risk Scorer.
 * Computes an explainable risk score (0-100) from weighted inputs.
 * Transparent and grounded in real India fintech friction factors.
 */
export function calculateRiskScore({
  amount = 0,
  method = 'upi',
  timeOfDay = '14:00',
  device = 'mobile_web',
  customer = null,
  transactionType = 'one-off'
}) {
  let score = 10; // Baseline
  const breakdown = [];

  // 1. Amount friction weight
  const numericAmount = Number(amount) || 0;
  if (numericAmount > 20000) {
    score += 35;
    breakdown.push({ factor: 'High-value transaction (> ₹20,000) — elevated bank fraud-score risk', weight: +35 });
  } else if (numericAmount > 15000) {
    score += 30;
    breakdown.push({ factor: 'Amount > ₹15,000 (AFA friction boundary)', weight: +30 });
  } else if (numericAmount > 5000) {
    score += 15;
    breakdown.push({ factor: 'High transaction amount (> ₹5,000)', weight: +15 });
  } else if (numericAmount < 100) {
    score += 5;
    breakdown.push({ factor: 'Micro-transaction velocity band', weight: +5 });
  }

  // 2. Time of day weight (7-10 PM Peak Load Hours)
  let hour = 14;
  if (typeof timeOfDay === 'string' && timeOfDay.includes(':')) {
    hour = parseInt(timeOfDay.split(':')[0], 10);
  } else if (typeof timeOfDay === 'number') {
    hour = timeOfDay;
  }

  const isPeakHour = hour >= 19 && hour <= 22;
  if (isPeakHour) {
    score += 20;
    breakdown.push({ factor: `Peak bank load window (${hour}:00 hrs - 7 to 10 PM)`, weight: +20 });
  }

  // 3. Customer method history weight
  if (customer && customer.methodHistory && customer.methodHistory.length > 0) {
    const history = customer.methodHistory.find(m => m.method.toLowerCase() === method.toLowerCase());
    if (history) {
      if (history.successRate < 0.60) {
        score += 35;
        breakdown.push({ factor: `Customer low historical success rate on ${method} (${(history.successRate * 100).toFixed(0)}%)`, weight: +35 });
      } else if (history.successRate < 0.80) {
        score += 15;
        breakdown.push({ factor: `Moderate customer success rate on ${method} (${(history.successRate * 100).toFixed(0)}%)`, weight: +15 });
      } else {
        score -= 10;
        breakdown.push({ factor: `High historical reliability on ${method} (${(history.successRate * 100).toFixed(0)}%)`, weight: -10 });
      }
    }
  } else {
    // New customer without history — strong risk signal on high-value txn
    const noHistoryWeight = numericAmount > 20000 ? 20 : 10;
    score += noHistoryWeight;
    breakdown.push({
      factor: numericAmount > 20000
        ? 'First-time device + high-value purchase — elevated issuing bank fraud-screen probability'
        : 'First-time customer (no historical profile)',
      weight: +noHistoryWeight
    });
  }

  // 4. Device and Channel friction
  if (device === 'mobile_web') {
    score += 10;
    breakdown.push({ factor: 'Mobile web checkout (higher timeout & drop risk)', weight: +10 });
  }

  // 5. Stored card expiry check for recurring subscriptions
  if (transactionType === 'recurring' && customer && customer.cardTokens) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const expiringCard = customer.cardTokens.find(token => {
      return token.expiryYear < currentYear || (token.expiryYear === currentYear && token.expiryMonth <= currentMonth + 1);
    });

    if (expiringCard) {
      score += 35;
      breakdown.push({ factor: `Stored subscription card (*${expiringCard.last4}) expiring within 30 days`, weight: +35 });
    }
  }

  // Clamp score between 0 and 100
  const finalScore = Math.max(0, Math.min(100, score));

  // Determine Tier
  let tier = 'LOW';
  if (finalScore >= 70) {
    tier = 'HIGH';
  } else if (finalScore >= 40) {
    tier = 'MEDIUM';
  }

  return {
    riskScore: finalScore,
    tier,
    breakdown,
    isPeakHour
  };
}

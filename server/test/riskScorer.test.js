import test from 'node:test';
import assert from 'node:assert';
import { calculateRiskScore } from '../layer1-predict/riskScorer.js';
import { pickPreventionAction, LAYER1_ACTIONS } from '../layer1-predict/actionPicker.js';

test('Layer 1 Risk Scorer - Baseline Low Risk', () => {
  const result = calculateRiskScore({
    amount: 500,
    method: 'upi',
    timeOfDay: '14:00',
    device: 'desktop',
    customer: { methodHistory: [{ method: 'upi', successRate: 0.95 }] }
  });

  assert.strictEqual(result.tier, 'LOW');
  assert.ok(result.riskScore < 40);
});

test('Layer 1 Risk Scorer - Peak Hours (7-10 PM) adds weight', () => {
  const result = calculateRiskScore({
    amount: 1200,
    method: 'card',
    timeOfDay: '20:30', // 8:30 PM peak
    device: 'mobile_web',
    customer: null
  });

  assert.ok(result.isPeakHour);
  assert.ok(result.riskScore >= 40);
});

test('Layer 1 Action Picker - Deterministic E-Mandate > ₹15,000 Rule', () => {
  const result = pickPreventionAction({
    amount: 18000,
    method: 'upi',
    timeOfDay: '15:00',
    transactionType: 'recurring'
  });

  assert.strictEqual(result.action, LAYER1_ACTIONS.PRECOLLECT_AFA);
  assert.strictEqual(result.tier, 'HIGH');
  assert.ok(result.reasoning.includes('15,000'));
});

test('Layer 1 Action Picker - Customer Method Reordering', () => {
  const result = pickPreventionAction({
    amount: 1500,
    method: 'card',
    timeOfDay: '14:00',
    device: 'desktop',
    customer: {
      methodHistory: [
        { method: 'upi', successRate: 0.95 },
        { method: 'card', successRate: 0.40 }
      ]
    }
  });

  assert.strictEqual(result.action, LAYER1_ACTIONS.REORDER_METHODS);
  assert.strictEqual(result.details.preferredOrder[0], 'upi');
});

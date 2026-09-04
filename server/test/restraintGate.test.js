import test from 'node:test';
import assert from 'node:assert';
import { evaluateRestraintGate } from '../layer2-recover/restraintGate.js';
import { FAILURE_CATEGORIES } from '../layer2-recover/decisionTable.js';

test('Restraint Gate - Hard Stopping Rule Enforcement', () => {
  const result = evaluateRestraintGate({
    category: FAILURE_CATEGORIES.SOFT_INSUFFICIENT_FUNDS,
    attemptsSoFar: 3, // Max allowed is 3
    amount: 1500
  });

  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.restraint, true);
  assert.ok(result.reason.includes('Stopping rule reached'));
});

test('Restraint Gate - Hard Declines divert to non-auto-retry', () => {
  const result = evaluateRestraintGate({
    category: FAILURE_CATEGORIES.HARD_EXPIRED_CARD,
    attemptsSoFar: 0,
    amount: 2500,
    proposedAction: 'DELAYED_RETRY'
  });

  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.restraint, true);
  assert.ok(result.reason.includes('never be retried automatically'));
});

test('Restraint Gate - Micro transaction with low expected value triggers restraint', () => {
  const result = evaluateRestraintGate({
    category: FAILURE_CATEGORIES.ABANDON_PRICE_SHOCK,
    attemptsSoFar: 0,
    amount: 40, // ₹40 micro-transaction
    banditWinRate: 0.20
  });

  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.restraint, true);
  assert.ok(result.reason.includes('friction cost'));
});

test('Restraint Gate - Normal valid intervention approved', () => {
  const result = evaluateRestraintGate({
    category: FAILURE_CATEGORIES.SOFT_INSUFFICIENT_FUNDS,
    attemptsSoFar: 0,
    amount: 2000,
    banditWinRate: 0.75
  });

  assert.strictEqual(result.allowed, true);
  assert.strictEqual(result.restraint, false);
  assert.strictEqual(result.action, 'DELAYED_RETRY');
});

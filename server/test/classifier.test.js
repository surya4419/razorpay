import test from 'node:test';
import assert from 'node:assert';
import { classifyError } from '../layer2-recover/classifier.js';
import { FAILURE_CATEGORIES } from '../layer2-recover/decisionTable.js';

test('Classifier - Insufficient Funds (Soft Decline)', () => {
  const result = classifyError({
    error_code: 'BAD_REQUEST_ERROR',
    error_reason: 'insufficient_fund',
    error_source: 'bank',
    error_step: 'payment_authorization'
  });

  assert.strictEqual(result.category, FAILURE_CATEGORIES.SOFT_INSUFFICIENT_FUNDS);
  assert.strictEqual(result.confidence, 1.0);
});

test('Classifier - Payment Timeout (Soft Decline)', () => {
  const result = classifyError({
    error_code: 'GATEWAY_ERROR',
    error_reason: 'payment_timed_out',
    error_source: 'bank',
    error_step: 'payment_authorization'
  });

  assert.strictEqual(result.category, FAILURE_CATEGORIES.SOFT_TIMEOUT_SYSTEM_ERROR);
});

test('Classifier - Expired Card (Hard Decline)', () => {
  const result = classifyError({
    error_code: 'BAD_REQUEST_ERROR',
    error_reason: 'expired_card',
    error_source: 'customer',
    error_step: 'payment_authorization'
  });

  assert.strictEqual(result.category, FAILURE_CATEGORIES.HARD_EXPIRED_CARD);
});

test('Classifier - UPI Wrong PIN', () => {
  const result = classifyError({
    error_code: 'BAD_REQUEST_ERROR',
    error_reason: 'incorrect_pin',
    error_source: 'customer',
    method: 'upi'
  });

  assert.strictEqual(result.category, FAILURE_CATEGORIES.UPI_WRONG_PIN);
});

test('Classifier - E-mandate above ₹15,000 without fresh AFA', () => {
  const result = classifyError(
    { error_code: 'BAD_REQUEST_ERROR', error_reason: 'mandate_max_amount_exceeded' },
    { amount: 18000, transactionType: 'recurring' }
  );

  assert.strictEqual(result.category, FAILURE_CATEGORIES.REGULATORY_EMANDATE_AFA_REQUIRED);
});

test('Classifier - UPI Server Downtime', () => {
  const result = classifyError({
    error_code: 'GATEWAY_ERROR',
    error_reason: 'npci_switch_down',
    error_source: 'bank',
    method: 'upi'
  });

  assert.strictEqual(result.category, FAILURE_CATEGORIES.UPI_SERVER_DOWNTIME);
});

test('Classifier - OTP Delivery Failure', () => {
  const result = classifyError({
    error_code: 'BAD_REQUEST_ERROR',
    error_step: 'payment_authentication',
    error_reason: 'otp_expired'
  });

  assert.strictEqual(result.category, FAILURE_CATEGORIES.AUTH_OTP_DELIVERY_FAILURE);
});

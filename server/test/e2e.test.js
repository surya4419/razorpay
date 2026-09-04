import test, { before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

let serverProcess = null;

async function ensureServerReady(maxRetries = 35, delayMs = 500) {
  // Check if server is already running
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return true;
    } catch {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // Auto-spawn server.js for test suite
  if (!serverProcess) {
    serverProcess = spawn('node', [path.resolve(__dirname, '../server.js')], {
      stdio: 'inherit',
      env: { ...process.env, PORT: String(PORT) }
    });
  }

  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) {
        return true;
      }
    } catch {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error(`Server did not become ready on ${BASE_URL} after ${maxRetries * delayMs}ms`);
}

before(async () => {
  await ensureServerReady();
});

after(() => {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch {}
  }
});

async function fetchJson(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

test('E2E: 1. Server Health & Safe Config Check', async () => {
  const health = await fetchJson('/api/health');
  assert.strictEqual(health.status, 'ok');

  const configRes = await fetchJson('/api/razorpay/config');
  assert.ok(configRes.keyId);
  // Ensure secret is never exposed in public client config
  assert.strictEqual(configRes.keySecret, undefined);
});

test('E2E: 2. Playground Live Demo Trigger & Fetch Payment API Diagnosis', async () => {
  // Step A: Trigger Live Demo Call (withSystem: true)
  const triggerRes = await fetchJson('/api/razorpay/live-demo/trigger', {
    method: 'POST',
    body: JSON.stringify({
      scenario: 'insufficient_funds',
      amount: 3200,
      method: 'card',
      withSystem: true
    })
  });

  assert.strictEqual(triggerRes.success, true);
  assert.ok(triggerRes.transactionId);
  assert.ok(triggerRes.order.id);
  assert.ok(triggerRes.layer1Decision);

  // Step B: Synchronous Verify & Diagnose (Fetch Payment API path)
  const diagnoseRes = await fetchJson('/api/razorpay/verify-and-diagnose', {
    method: 'POST',
    body: JSON.stringify({
      transactionId: triggerRes.transactionId,
      orderId: triggerRes.order.id,
      scenario: 'insufficient_funds',
      status: 'failed',
      withSystem: true
    })
  });

  assert.strictEqual(diagnoseRes.success, true);
  assert.strictEqual(diagnoseRes.classification.category, 'SOFT_INSUFFICIENT_FUNDS');
  assert.strictEqual(diagnoseRes.restraintResult.restraint, false);
  assert.ok(diagnoseRes.recoveryExecution.actionTaken);
  assert.strictEqual(diagnoseRes.transaction.layer2.category, 'SOFT_INSUFFICIENT_FUNDS');

  // Step C: Test Hard Decline Scenario Generating Real Payment Link
  const hardTrigger = await fetchJson('/api/razorpay/live-demo/trigger', {
    method: 'POST',
    body: JSON.stringify({
      scenario: 'upi_instant_decline',
      amount: 1850,
      method: 'upi',
      withSystem: true
    })
  });

  const hardDiagnose = await fetchJson('/api/razorpay/verify-and-diagnose', {
    method: 'POST',
    body: JSON.stringify({
      transactionId: hardTrigger.transactionId,
      orderId: hardTrigger.order.id,
      scenario: 'upi_instant_decline',
      status: 'failed',
      rawError: {
        error_code: 'BAD_REQUEST_ERROR',
        error_reason: 'expired_card',
        error_source: 'customer',
        error_step: 'payment_authorization'
      },
      withSystem: true
    })
  });

  assert.strictEqual(hardDiagnose.classification.category, 'HARD_EXPIRED_CARD');
  assert.ok(
    hardDiagnose.recoveryExecution.actionTaken === 'NO_RETRY_SUGGEST_ALT' ||
    hardDiagnose.recoveryExecution.actionTaken === 'UPDATE_CARD_NUDGE'
  );
  assert.ok(hardDiagnose.recoveryExecution.razorpayPaymentLinkId);

  // Step D: Mark Payment Link as Paid (Simulate customer paying)
  const paidRes = await fetchJson('/api/razorpay/simulate-payment-link-paid', {
    method: 'POST',
    body: JSON.stringify({ transactionId: hardTrigger.transactionId })
  });

  assert.strictEqual(paidRes.success, true);
  assert.strictEqual(paidRes.transaction.finalOutcome.recovered, true);

  // Step E: Query saved transaction via REST endpoint to verify DB persistence & real call tag
  const savedTxnRes = await fetchJson(`/api/transactions/${hardTrigger.transactionId}`);
  assert.strictEqual(savedTxnRes.transaction.isRealRazorpayCall, true);
  assert.strictEqual(savedTxnRes.transaction.finalOutcome.recovered, true);
  assert.ok(savedTxnRes.auditLogs.length >= 2);
});

test('E2E: 3. E-Mandate > ₹15,000 AFA Regulatory Rule Trigger', async () => {
  const triggerRes = await fetchJson('/api/razorpay/live-demo/trigger', {
    method: 'POST',
    body: JSON.stringify({
      scenario: 'emandate_above_15k',
      amount: 18500,
      method: 'subscription',
      transactionType: 'recurring',
      withSystem: true
    })
  });

  assert.strictEqual(triggerRes.layer1Decision.action, 'PRECOLLECT_AFA');
  assert.strictEqual(triggerRes.layer1Decision.tier, 'HIGH');
});

test('E2E: 4. Batch Simulation Runner & Learning Curve Generation', async () => {
  const simRun = await fetchJson('/api/simulation/run', {
    method: 'POST',
    body: JSON.stringify({
      batchSize: 20,
      speedMs: 0,
      scenarioMix: 'standard'
    })
  });

  assert.strictEqual(simRun.status, 'started');
  assert.ok(simRun.runId);

  // Poll status until batch completes (allowing ample time for remote MongoDB Atlas latency)
  let completed = false;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 300));
    const status = await fetchJson('/api/simulation/status');
    if (!status.isRunning && status.processed >= 20) {
      completed = true;
      break;
    }
  }
  assert.strictEqual(completed, true);
});

test('E2E: 5. Aggregated Metrics, Learning Curve & Restraint Log', async () => {
  const summary = await fetchJson('/api/metrics/summary');
  assert.ok(summary.totalTransactions >= 10);
  assert.ok(summary.totalAtRisk > 0);
  assert.ok(summary.totalSaved > 0);
  assert.ok(summary.savedPercentage > 0);

  const curve = await fetchJson('/api/metrics/learning-curve');
  assert.ok(Array.isArray(curve.points));
  assert.ok(curve.points.length > 0);

  const bandit = await fetchJson('/api/bandit/state');
  assert.ok(bandit.totalStates > 0);

  const rules = await fetchJson('/api/risk-rules');
  assert.ok(rules.total > 0);

  const restraintLog = await fetchJson('/api/metrics/restraint-log');
  assert.ok(Array.isArray(restraintLog.cases));
});

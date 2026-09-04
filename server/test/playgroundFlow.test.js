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
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return true;
    } catch {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  if (!serverProcess) {
    serverProcess = spawn('node', [path.resolve(__dirname, '../server.js')], {
      stdio: 'inherit',
      env: { ...process.env, PORT: String(PORT) }
    });
  }

  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return true;
    } catch {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error(`Server did not become ready on ${BASE_URL}`);
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

async function postJson(endpointPath, body) {
  const res = await fetch(`${BASE_URL}${endpointPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

test('Playground Manual Step: 1. Init Pane Insufficient Funds', async () => {
  const initRes = await postJson('/api/playground/init-pane', { scenario: 'insufficient_funds', pane: 'with' });
  assert.strictEqual(initRes.success, true);
  assert.strictEqual(initRes.amount, 3200);
  assert.strictEqual(initRes.layer1Decision.action, 'PROCEED_NORMAL');
  assert.strictEqual(initRes.layer1Decision.tier, 'LOW');
});

test('Playground Manual Step: 2. Expiring Saved Card Layer 1 Nudge', async () => {
  const initRes = await postJson('/api/playground/init-pane', { scenario: 'expiring_saved_card', pane: 'with' });
  assert.strictEqual(initRes.success, true);
  assert.strictEqual(initRes.amount, 6800);
  assert.strictEqual(initRes.layer1Decision.action, 'CARD_EXPIRY_NUDGE');
  assert.strictEqual(initRes.layer1Decision.tier, 'HIGH');
});

test('Playground Manual Step: 3. E-Mandate > 15k Proactive AFA Flow', async () => {
  const initRes = await postJson('/api/playground/init-pane', { scenario: 'emandate_above_15k', pane: 'with' });
  assert.strictEqual(initRes.success, true);
  assert.strictEqual(initRes.amount, 18000);
  assert.strictEqual(initRes.layer1Decision.action, 'PRECOLLECT_AFA');
  assert.strictEqual(initRes.layer1Decision.tier, 'HIGH');

  const afaRes = await postJson('/api/playground/send-afa-auth-link', { transactionId: initRes.transactionId });
  assert.strictEqual(afaRes.success, true);
  assert.ok(afaRes.authLinkId);
});

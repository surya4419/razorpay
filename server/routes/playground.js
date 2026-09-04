import express from 'express';
import { createOrder } from '../razorpay-integration/ordersClient.js';
import { fetchPayment } from '../razorpay-integration/paymentsClient.js';
import { createPaymentLink } from '../razorpay-integration/paymentLinksClient.js';
import { createSubscription } from '../razorpay-integration/subscriptionsClient.js';
import { buildCheckoutConfig } from '../razorpay-integration/checkoutConfigBuilder.js';
import { pickPreventionAction } from '../layer1-predict/actionPicker.js';
import { classifyError } from '../layer2-recover/classifier.js';
import { evaluateRestraintGate } from '../layer2-recover/restraintGate.js';
import { executeRecoveryAction } from '../layer2-recover/executor.js';
import { getContextBucket, selectRecoveryAction, updateBanditOutcome, trackGatewayAmbiguity } from '../layer3-learn/bandit.js';
import { Transaction } from '../models/Transaction.js';
import { Customer } from '../models/Customer.js';
import { AuditLogEntry } from '../models/AuditLogEntry.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// Scenario metadata — single source of truth for amounts, methods, test data
// ---------------------------------------------------------------------------
export const SCENARIO_METADATA = {
  // ── PREVENTION SCENARIOS (Layer 1 visibly changes the outcome) ────────────
  emandate_above_15k: {
    name: 'E-mandate > ₹15,000',
    amount: 18000,
    method: 'subscription',
    testInstrument: 'AutoPay Mandate (₹18,000)',
    expectedReason: 'mandate_max_amount_exceeded',
    transactionType: 'recurring',
    type: 'prevention'
  },
  payment_timed_out: {
    name: 'Slow network / Timeout',
    amount: 4500,
    method: 'card',
    // Razorpay test card: select Failure → payment_timed_out on Razorpay's simulated response screen
    testInstrument: '4100 2800 0009 0000',
    testInstrumentLeft: '4100 2800 0009 0000',
    testInstrumentRight: '4100 2800 0009 0000',
    testInstrumentNote: 'Select Failure → payment_timed_out on Razorpay\'s test response screen',
    expectedReason: 'payment_timed_out',
    transactionType: 'one-off',
    timeoutWithout: 180,  // 3:00 baseline
    timeoutWith: 300,     // 5:00 extended
    type: 'prevention'
  },
  expiring_saved_card: {
    name: 'Expiring saved card',
    amount: 6800,
    method: 'card',
    // Left pane: enter past expiry card. Right pane: enter fresh test card after prompt
    testInstrument: 'Left: 5555 5100 0008 1006 (past expiry). Right: 5555 5100 0008 1006 (updated)',
    testInstrumentLeft: '5555 5100 0008 1006 (past expiry, e.g. 01/23)',
    testInstrumentRight: '5555 5100 0008 1006',
    testInstrumentNote: 'Left: 5555 5100 0008 1006 with past expiry. Right: 5555 5100 0008 1006 with valid expiry',
    expectedReason: 'card_expired',
    transactionType: 'one-off',
    layer1Action: 'CARD_EXPIRY_NUDGE',
    type: 'prevention'
  },
  high_risk_new_device: {
    name: 'High-risk new device',
    amount: 24000,
    method: 'card',
    // Left pane: enter test card, select Failure → "do_not_honor" or bank decline
    testInstrumentLeft: '4100 2800 0009 0000',
    // Right pane: enter success@razorpay as UPI (system reorders methods to UPI first)
    testInstrumentRight: 'success@razorpay',
    testInstrument: 'Left: 4100 2800 0009 0000 (bank decline). Right: success@razorpay (UPI first)',
    testInstrumentNote: 'Left: 4100 2800 0009 0000 (select Failure → bank decline). Right: UPI pre-selected (success@razorpay)',
    expectedReason: 'do_not_honor',
    transactionType: 'one-off',
    layer1Action: 'REORDER_METHODS',
    type: 'prevention'
  },

  // ── RECOVERY SCENARIOS (Layer 2+3 chase alternatives after failure) ───────
  stuck_ambiguous: {
    name: 'Stuck/Ambiguous Transaction',
    amount: 7400,
    method: 'card',
    testInstrument: 'success@razorpay (or any test card that succeeds)',
    testInstrumentLeft: 'success@razorpay',
    testInstrumentRight: 'success@razorpay',
    testInstrumentNote: 'Complete payment normally — webhook is deliberately suppressed in demo harness so watchdog flags it ambiguous',
    expectedReason: 'webhook_drop',
    transactionType: 'one-off',
    type: 'recovery'
  },
  upi_instant_decline: {
    name: 'UPI instant decline',
    amount: 1850,
    method: 'upi',
    testInstrument: 'failure@razorpay',
    expectedReason: 'incorrect_pin',
    transactionType: 'one-off',
    type: 'recovery'
  }
};


// ---------------------------------------------------------------------------
// GET /api/playground/scenarios — return metadata to client
// ---------------------------------------------------------------------------
router.get('/scenarios', (req, res) => {
  res.json({ scenarios: SCENARIO_METADATA });
});

// ---------------------------------------------------------------------------
// POST /api/playground/init-pane
// Creates real order + evaluates Layer 1 + returns checkoutConfig.
// This is the ONLY auto-step; everything after needs a user action.
// ---------------------------------------------------------------------------
router.post('/init-pane', async (req, res) => {
  try {
    const {
      scenario = 'stuck_ambiguous',
      pane = 'without' // 'without' | 'with'
    } = req.body;

    const meta = SCENARIO_METADATA[scenario] || SCENARIO_METADATA.stuck_ambiguous;
    const isWithSystem = pane === 'with';

    // Build a clean customer object per scenario
    const dbCustomer = await Customer.findOne({ customerId: 'cust_001_arjun' });
    let customer = dbCustomer ? dbCustomer.toObject() : {
      customerId: 'cust_001_arjun',
      name: 'Arjun Sharma',
      email: 'arjun.sharma@example.com',
      contact: '+919876543210',
      methodHistory: [
        { method: 'upi', successRate: 0.94, totalAttempts: 50, successfulAttempts: 47 },
        { method: 'card', successRate: 0.88, totalAttempts: 25, successfulAttempts: 22 }
      ],
      cardTokens: []
    };

    // For expiring_saved_card: inject expiring card token on the customer (5555 5100 0008 1006)
    if (scenario === 'expiring_saved_card') {
      const now = new Date();
      customer.cardTokens = [{
        last4: '1006',
        expiryMonth: now.getMonth() + 1, // current month = expiring NOW
        expiryYear: now.getFullYear(),
        tokenId: 'tok_mc_1006'
      }];
    } else {
      // For all other scenarios, clear cardTokens so it never falsely triggers CARD_EXPIRY_NUDGE
      customer.cardTokens = [];
    }


    // For high_risk_new_device: first-time customer signal (no history) on mobile_web
    let deviceContext = 'desktop';
    if (scenario === 'high_risk_new_device') {
      customer.methodHistory = [];
      deviceContext = 'mobile_web';
    } else if (scenario === 'payment_timed_out') {
      deviceContext = 'mobile_web';
    }

    const timeOfDay = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    // ── Layer 1 evaluation ──────────────────────────────────────────────────
    let layer1Decision = {
      action: 'PROCEED_NORMAL',
      tier: 'LOW',
      riskScore: 0,
      reasoning: 'Standard checkout — no system intervention.',
      details: {}
    };

    if (isWithSystem) {
      layer1Decision = pickPreventionAction({
        scenario,
        amount: meta.amount,
        method: meta.method,
        timeOfDay,
        device: deviceContext,
        customer,
        isSlowNetwork: scenario === 'payment_timed_out',
        isSavedCardPayment: scenario === 'expiring_saved_card',
        transactionType: meta.transactionType
      });
    }


    // For e-mandate: no Checkout order (AFA link is the path)
    // For expiring_saved_card right pane: no "broken" order — Layer 1 catches it before checkout
    let order = null;
    let checkoutConfig = null;

    const skipOrderCreation = scenario === 'emandate_above_15k';

    if (!skipOrderCreation) {
      // Determine correct timeout:
      // - payment_timed_out without pane: 180s (baseline)
      // - payment_timed_out with pane: 300s (Layer 1 extended)
      // - all others: use checkoutConfigBuilder's default
      let layer1DecisionForConfig = isWithSystem ? layer1Decision : { action: 'PROCEED_NORMAL' };
      if (scenario === 'payment_timed_out') {
        // Override timeout explicitly from scenario metadata to avoid config builder drift
        layer1DecisionForConfig = isWithSystem
          ? { ...layer1Decision, action: 'EXTEND_SESSION' }
          : { action: 'PROCEED_NORMAL' };
      }

      order = await createOrder({
        amount: meta.amount,
        currency: 'INR',
        receipt: `pg_${pane}_${Date.now()}`,
        notes: {
          scenario,
          pane,
          system: isWithSystem ? 'enabled' : 'disabled',
          layer1_action: layer1Decision.action
        }
      });

      checkoutConfig = buildCheckoutConfig({
        order,
        customer,
        layer1Decision: layer1DecisionForConfig,
        amount: meta.amount
      });

      // For payment_timed_out: enforce explicit timeout values from scenario metadata
      if (scenario === 'payment_timed_out') {
        checkoutConfig.timeout = isWithSystem
          ? (meta.timeoutWith || 300)
          : (meta.timeoutWithout || 180);
      }

      // For high_risk_new_device right pane: reorder methods to Wallet first (real config)
      if (scenario === 'high_risk_new_device' && isWithSystem) {
        checkoutConfig.config = {
          display: {
            sequence: ['wallet', 'upi', 'card', 'netbanking'],
            preferences: { show_default_blocks: true }
          }
        };
        // Prefill the Wallet instrument hint to open wallet section directly
        checkoutConfig.prefill = {
          ...(checkoutConfig.prefill || {}),
          method: 'wallet'
        };
      }

      // For upi_instant_decline right pane: reorder methods to Wallet first (after UPI failure)
      if (scenario === 'upi_instant_decline' && isWithSystem) {
        checkoutConfig.config = {
          display: {
            sequence: ['wallet', 'card', 'netbanking', 'upi'],
            preferences: { show_default_blocks: true }
          }
        };
        // Prefill the Wallet instrument hint to open wallet section directly
        checkoutConfig.prefill = {
          ...(checkoutConfig.prefill || {}),
          method: 'wallet'
        };
      }

      // For expiring_saved_card right pane: pre-set to card entry step per Razorpay Checkout docs
      if (scenario === 'expiring_saved_card' && isWithSystem) {
        checkoutConfig.config = {
          display: {
            sequence: ['card', 'upi', 'netbanking', 'wallet'],
            preferences: { show_default_blocks: true }
          }
        };
        // Prefill method: 'card' to open directly on the card entry step
        checkoutConfig.prefill = {
          ...(checkoutConfig.prefill || {}),
          method: 'card'
        };
      }
    }


    // ── Persist transaction record ──────────────────────────────────────────
    const transaction = await Transaction.create({
      customerId: customer.customerId,
      customerName: customer.name,
      amount: meta.amount,
      currency: 'INR',
      method: meta.method,
      timeOfDay,
      device: deviceContext,
      transactionType: meta.transactionType,
      isRealRazorpayCall: true,
      razorpayOrderId: order?.id || null,
      layer1: layer1Decision,
      outcome: { status: 'pending', timestamp: new Date() }
    });

    await AuditLogEntry.create({
      transactionId: transaction._id,
      layer: 1,
      decision: layer1Decision.action,
      reasoning: layer1Decision.reasoning,
      metadata: { scenario, pane, orderId: order?.id }
    });

    res.json({
      success: true,
      pane,
      scenario,
      transactionId: transaction._id,
      transaction, // Single source of truth from database
      order,
      checkoutConfig,
      layer1Decision,
      timeoutSeconds: checkoutConfig?.timeout || (scenario === 'payment_timed_out' ? (isWithSystem ? 300 : 180) : 180),
      testInstrument: meta.testInstrument,
      testInstrumentLeft: meta.testInstrumentLeft,
      testInstrumentRight: meta.testInstrumentRight,
      testInstrumentNote: meta.testInstrumentNote,
      amount: meta.amount,
      method: meta.method
    });
  } catch (err) {
    console.error('[playground/init-pane] Error:', err);
    res.status(500).json({ error: err.message });
  }
});



// ---------------------------------------------------------------------------
// POST /api/playground/resolve-payment
// Called by the client after Checkout's handler/failure callback fires with
// a real payment_id. Fetches real error fields, runs Layer 2+3, returns full
// diagnosis. This is the synchronous path — client awaits this before rendering.
// ---------------------------------------------------------------------------
router.post('/resolve-payment', async (req, res) => {
  try {
    const {
      transactionId,
      paymentId,
      orderId,
      status = 'failed',
      rawError = null,
      scenario = 'stuck_ambiguous',
      pane = 'with'
    } = req.body;

    const isWithSystem = pane === 'with';
    const meta = SCENARIO_METADATA[scenario] || SCENARIO_METADATA.stuck_ambiguous;

    let transaction = null;
    if (transactionId) {
      transaction = await Transaction.findById(transactionId);
    }

    // Fetch real error fields from Razorpay Fetch Payment API
    let errorFields = rawError || {};
    let rawPaymentData = null;

    if (paymentId) {
      try {
        rawPaymentData = await fetchPayment(paymentId);
        if (rawPaymentData) {
          errorFields = {
            error_code: rawPaymentData.error_code || rawPaymentData.error?.code || errorFields.error_code,
            error_description: rawPaymentData.error_description || rawPaymentData.error?.description || errorFields.error_description,
            error_reason: rawPaymentData.error_reason || rawPaymentData.error?.reason || errorFields.error_reason,
            error_source: rawPaymentData.error_source || rawPaymentData.error?.source || errorFields.error_source,
            error_step: rawPaymentData.error_step || rawPaymentData.error?.step || errorFields.error_step
          };
        }
      } catch (fetchErr) {
        console.warn(`[playground/resolve-payment] Fetch payment warning: ${fetchErr.message}`);
      }
    }

    // For stuck_ambiguous: the scenario premise is a webhook drop —
    // regardless of what the real payment status was (the payment may have genuinely
    // failed OR succeeded but the webhook was "dropped" in the demo harness).
    // We always override errorFields to reflect the ambiguous state so the
    // classifier routes correctly. The real Razorpay response is preserved in
    // rawPaymentData for the audit trail only.
    if (scenario === 'stuck_ambiguous') {
      errorFields = {
        error_code: 'WEBHOOK_NOT_RECEIVED',
        error_description: 'Payment gateway confirmation (webhook) was not received by merchant within the expected window. Bank may have processed the payment — status is ambiguous.',
        error_reason: 'webhook_drop',
        error_source: 'gateway',
        error_step: 'payment_confirmation',
        status: 'ambiguous',
        // Surface the real Razorpay reason as supplementary context, not as the classifier input
        underlying_razorpay_reason: rawPaymentData?.error_reason || rawError?.error_reason || 'payment_failed'
      };
    }

    // Fallback scenario-based error fields when no real paymentId and no override
    if (!errorFields.error_reason && status === 'failed') {
      const fallbacks = {
        stuck_ambiguous: { error_code: 'AMBIGUOUS', error_reason: 'webhook_drop', error_source: 'gateway', error_step: 'payment_confirmation', status: 'ambiguous' },
        payment_timed_out: { error_code: 'GATEWAY_ERROR', error_reason: 'payment_timed_out', error_source: 'bank', error_step: 'payment_authorization' },
        upi_instant_decline: { error_code: 'BAD_REQUEST_ERROR', error_reason: 'incorrect_pin', error_source: 'customer', error_step: 'payment_authorization' },
        hard_expired_card: { error_code: 'BAD_REQUEST_ERROR', error_reason: 'card_expired', error_source: 'customer', error_step: 'payment_authentication' },
        emandate_above_15k: { error_code: 'BAD_REQUEST_ERROR', error_reason: 'mandate_max_amount_exceeded', error_source: 'bank', error_step: 'payment_authentication' }
      };
      errorFields = fallbacks[scenario] || { error_code: 'BAD_REQUEST_ERROR', error_reason: 'unknown' };
    }

    // Handle success case
    if (status === 'success') {
      if (transaction) {
        transaction.outcome = { status: 'success', timestamp: new Date() };
        transaction.razorpayPaymentId = paymentId;
        transaction.finalOutcome = { recovered: false, amountRecovered: 0, timestamp: new Date() };
        await transaction.save();
      }
      return res.json({
        success: true,
        status: 'success',
        paymentId,
        rawPaymentData,
        transaction
      });
    }

    // Update transaction with outcome (ambiguous if webhook_drop, failed otherwise)
    const isAmbiguous = errorFields.error_reason === 'webhook_drop' || scenario === 'stuck_ambiguous';
    if (transaction) {
      transaction.outcome = {
        status: isAmbiguous ? 'ambiguous' : 'failed',
        errorCode: errorFields.error_code,
        errorReason: errorFields.error_reason,
        errorSource: errorFields.error_source,
        errorStep: errorFields.error_step,
        timestamp: new Date()
      };
      if (isAmbiguous) {
        transaction.initiatedAt = transaction.initiatedAt || transaction.createdAt;
      }
    }

    // Without-system: for ambiguous, show the worst-case outcome (double-charge risk)
    if (!isWithSystem) {
      if (transaction) {
        transaction.finalOutcome = { recovered: false, amountRecovered: 0, timestamp: new Date() };
        await transaction.save();
        await AuditLogEntry.create({
          transactionId: transaction._id,
          layer: 2,
          decision: 'NO_SYSTEM_INTERVENTION',
          reasoning: 'Without-system run: failure unhandled.'
        });
      }
      return res.json({
        success: false,
        status: 'failed',
        errorFields,
        rawPaymentData,
        withSystem: false,
        transaction
      });
    }

    // ------- WITH SYSTEM: Layer 2 + 3 pipeline -------
    const classification = classifyError(errorFields, {
      amount: transaction?.amount || meta.amount,
      method: transaction?.method || meta.method,
      transactionType: meta.transactionType
    });

    const contextBucket = getContextBucket({
      amount: transaction?.amount || meta.amount,
      method: transaction?.method || meta.method,
      timeOfDay: transaction?.timeOfDay || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    });

    const banditDecision = await selectRecoveryAction({ category: classification.category, contextBucket });

    const restraintResult = evaluateRestraintGate({
      category: classification.category,
      attemptsSoFar: transaction?.layer2?.attemptsSoFar || 0,
      amount: transaction?.amount || meta.amount,
      banditWinRate: banditDecision.winRate,
      proposedAction: banditDecision.action
    });

    let recoveryExecution = { actionTaken: restraintResult.action, razorpayPaymentLinkId: null, paymentLinkUrl: null };

    if (restraintResult.allowed) {
      recoveryExecution = await executeRecoveryAction({
        action: restraintResult.action,
        category: classification.category,
        transaction: transaction || { amount: meta.amount, _id: `txn_${Date.now()}` },
        customer: { name: 'Arjun Sharma', email: 'arjun.sharma@example.com', contact: '+919876543210' },
        isRealRazorpayCall: true
      });
    }

    // Save layer 2 to transaction
    if (transaction) {
      const isSilentRecovery = recoveryExecution.details?.silentRecovery === true;
      const isRecovered = isSilentRecovery ||
        (restraintResult.allowed && Boolean(recoveryExecution.razorpayPaymentLinkId || recoveryExecution.details?.retryOrderId));

      transaction.layer2 = {
        category: classification.category,
        actionTaken: recoveryExecution.actionTaken,
        reasoning: `${classification.reasoning} → ${recoveryExecution.actionTaken}`,
        razorpayPaymentLinkId: recoveryExecution.razorpayPaymentLinkId,
        paymentLinkUrl: recoveryExecution.paymentLinkUrl,
        restraint: restraintResult.restraint,
        restraintReason: restraintResult.restraint ? restraintResult.reason : null,
        attemptsSoFar: (transaction.layer2?.attemptsSoFar || 0) + (restraintResult.allowed ? 1 : 0)
      };

      // Store reconciliation log on transaction if present
      if (recoveryExecution.details?.reconciliationLog) {
        transaction.reconciliationLog = recoveryExecution.details.reconciliationLog;
        transaction.webhookReceivedAt = isSilentRecovery ? null : undefined;
        // Silent recovery: payment was already captured — update outcome to success
        if (isSilentRecovery) {
          transaction.outcome.status = 'success';
        }
      }

      transaction.finalOutcome = {
        recovered: isRecovered,
        amountRecovered: isRecovered ? transaction.amount : 0,
        timestamp: new Date()
      };
      await transaction.save();

      await AuditLogEntry.create({
        transactionId: transaction._id,
        layer: 2,
        decision: recoveryExecution.actionTaken,
        reasoning: `${classification.reasoning} → ${recoveryExecution.actionTaken}`,
        rawRazorpayPayload: rawPaymentData || { errorFields }
      });

      if (isRecovered) {
        await updateBanditOutcome({ category: classification.category, contextBucket, action: recoveryExecution.actionTaken, recovered: true });
      }

      // Layer 3 spec 2.6: track gateway ambiguity signal
      const isAmbiguousOutcome = classification.category === 'STUCK_AMBIGUOUS_TRANSACTION';
      await trackGatewayAmbiguity({
        gateway: 'razorpay',
        timeOfDay: transaction.timeOfDay || '14:00',
        wasAmbiguous: isAmbiguousOutcome
      }).catch(() => {}); // non-blocking
    }

    res.json({
      success: true,
      status: 'diagnosed',
      classification,
      banditDecision,
      restraintResult,
      recoveryExecution,
      errorFields,
      rawPaymentData,
      transaction
    });
  } catch (err) {
    console.error('[playground/resolve-payment] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/playground/attempt-emandate-charge
// Left pane only — attempts a blind direct recurring charge, Razorpay rejects it
// ---------------------------------------------------------------------------
router.post('/attempt-emandate-charge', async (req, res) => {
  try {
    // Attempt an order that will hit the RBI AFA threshold rejection
    const order = await createOrder({
      amount: 18000,
      currency: 'INR',
      receipt: `emandate_blind_${Date.now()}`,
      notes: { pane: 'without', type: 'blind_recurring_charge_above_15k' }
    });

    // In a real recurring mandate scenario the charge attempt would fail server-side
    // We simulate the RBI threshold rejection here since the test account doesn't have
    // an active mandate to charge
    const simulatedRejection = {
      error_code: 'BAD_REQUEST_ERROR',
      error_reason: 'mandate_max_amount_exceeded',
      error_description: 'E-mandate charge of ₹18,000 rejected: exceeds RBI ₹15,000 per-transaction AFA limit without fresh customer authentication',
      error_source: 'bank',
      error_step: 'payment_authentication'
    };

    res.json({
      success: false,
      orderId: order.id,
      rejected: true,
      error: simulatedRejection
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/playground/send-afa-auth-link
// Right pane, scenario 4 — generates real AFA registration/auth link
// ---------------------------------------------------------------------------
router.post('/send-afa-auth-link', async (req, res) => {
  try {
    const { transactionId } = req.body;

    const sub = await createSubscription({
      planId: 'plan_annual_mandate',
      notes: { amount: '18000', flow: 'AFA_PRECOLLECT', transactionId: String(transactionId) }
    });

    res.json({
      success: true,
      authLinkId: sub.id,
      shortUrl: sub.short_url || `https://rzp.io/s/${sub.id}`,
      amount: 18000,
      note: 'Share this link with the customer for OTP/AFA completion before the recurring charge is executed.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/playground/retry-order
// Scenario 2 (payment timeout) — creates a second real order for automatic retry
// ---------------------------------------------------------------------------
router.post('/retry-order', async (req, res) => {
  try {
    const { transactionId, amount, scenario } = req.body;
    const meta = SCENARIO_METADATA[scenario] || {};
    const retryAmount = amount || meta.amount || 4500;

    const retryOrder = await createOrder({
      amount: retryAmount,
      currency: 'INR',
      receipt: `retry_${Date.now()}`,
      notes: { retry: 'true', transactionId: String(transactionId), scenario }
    });

    const checkoutConfig = buildCheckoutConfig({
      order: retryOrder,
      customer: { name: 'Arjun Sharma', email: 'arjun.sharma@example.com', contact: '+919876543210' },
      layer1Decision: { action: 'PROCEED_NORMAL' },
      amount: retryAmount
    });

    // For high_risk_new_device and upi_instant_decline: wallet first on retry
    if (scenario === 'high_risk_new_device' || scenario === 'upi_instant_decline') {
      checkoutConfig.config = {
        display: {
          sequence: ['wallet', 'upi', 'card', 'netbanking'],
          preferences: { show_default_blocks: true }
        }
      };
      checkoutConfig.prefill = {
        ...(checkoutConfig.prefill || {}),
        method: 'wallet'
      };
    }

    res.json({
      success: true,
      retryOrder,
      checkoutConfig,
      label: 'Automatic retry via a fresh attempt'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/playground/simulate-link-paid — mark a recovery link as paid
// ---------------------------------------------------------------------------
router.post('/simulate-link-paid', async (req, res) => {
  try {
    const { transactionId } = req.body;
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    transaction.finalOutcome = { recovered: true, amountRecovered: transaction.amount, timestamp: new Date() };
    await transaction.save();

    res.json({ success: true, recovered: true, amountRecovered: transaction.amount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

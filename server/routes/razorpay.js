import express from 'express';
import { config } from '../config/env.js';
import { createOrder } from '../razorpay-integration/ordersClient.js';
import { fetchPayment } from '../razorpay-integration/paymentsClient.js';
import { createPaymentLink } from '../razorpay-integration/paymentLinksClient.js';
import { createSubscription } from '../razorpay-integration/subscriptionsClient.js';
import { buildCheckoutConfig } from '../razorpay-integration/checkoutConfigBuilder.js';
import { pickPreventionAction } from '../layer1-predict/actionPicker.js';
import { classifyError } from '../layer2-recover/classifier.js';
import { evaluateRestraintGate } from '../layer2-recover/restraintGate.js';
import { executeRecoveryAction } from '../layer2-recover/executor.js';
import { getContextBucket, selectRecoveryAction, updateBanditOutcome } from '../layer3-learn/bandit.js';
import { Transaction } from '../models/Transaction.js';
import { Customer } from '../models/Customer.js';
import { AuditLogEntry } from '../models/AuditLogEntry.js';
import { RazorpayEvent } from '../models/RazorpayEvent.js';
import { broadcastEvent } from '../sockets/index.js';

const router = express.Router();

// 1. Safe Public Config (Key ID only, Secret stays secure on server)
router.get('/config', (req, res) => {
  res.json({
    keyId: config.razorpayKeyId,
    isRealConfigured: config.isRealRazorpayConfigured
  });
});

// 2. Orders API endpoint
router.post('/orders', async (req, res) => {
  try {
    const { amount, currency, notes, receipt } = req.body;
    const order = await createOrder({ amount, currency, receipt, notes });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Payments Fetch API endpoint
router.get('/payments/:id', async (req, res) => {
  try {
    const payment = await fetchPayment(req.params.id);
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Payment Links API endpoint
router.post('/payment-links', async (req, res) => {
  try {
    const { amount, description, customer, notify, expireByMinutes } = req.body;
    const link = await createPaymentLink({ amount, description, customer, notify, expireByMinutes });
    res.json(link);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Subscriptions API endpoint & Auth Link
router.post('/subscriptions', async (req, res) => {
  try {
    const { planId, totalCount, notes } = req.body;
    const sub = await createSubscription({ planId, totalCount, notes });
    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/subscriptions/auth-link', async (req, res) => {
  try {
    const { planId, amount = 18000, customer = {} } = req.body;
    const sub = await createSubscription({
      planId: planId || 'plan_annual_mandate',
      notes: { amount: String(amount), customer: customer.name || 'Valued Customer' }
    });
    res.json({
      authLinkId: sub.id,
      shortUrl: sub.short_url || `https://rzp.io/s/${sub.id}`,
      amount,
      status: 'authentication_required'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Trigger Live Demo Transaction (Playground Tab 1)
router.post('/live-demo/trigger', async (req, res) => {
  try {
    const {
      scenario = 'stuck_ambiguous',
      amount = 2500,
      method = 'card',
      customerId = 'cust_001_arjun',
      transactionType = 'one-off',
      withSystem = true
    } = req.body;

    const customer = await Customer.findOne({ customerId }) || {
      customerId,
      name: 'Arjun Sharma',
      email: 'arjun.sharma@example.com',
      contact: '+919876543210'
    };

    const timeOfDay = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    // Step A: Layer 1 Prediction (if running with system)
    let layer1Decision = {
      action: 'PROCEED_NORMAL',
      tier: 'LOW',
      riskScore: 10,
      reasoning: 'System bypassed: Raw direct transaction attempt.',
      details: {}
    };

    if (withSystem) {
      layer1Decision = pickPreventionAction({
        amount,
        method,
        timeOfDay,
        device: 'desktop',
        customer,
        transactionType: scenario === 'emandate_above_15k' ? 'recurring' : transactionType
      });
    }

    // Step B: Create real Razorpay Order via Orders API
    const effectiveAmount = scenario === 'emandate_above_15k' ? 18500 : amount;
    const order = await createOrder({
      amount: effectiveAmount,
      currency: 'INR',
      receipt: `live_${Date.now()}`,
      notes: {
        scenario,
        withSystem: String(withSystem),
        layer1_action: layer1Decision.action
      }
    });

    // Step C: Persist initial Transaction in DB
    const transaction = await Transaction.create({
      customerId: customer.customerId,
      customerName: customer.name,
      amount: effectiveAmount,
      currency: 'INR',
      method,
      timeOfDay,
      device: 'desktop',
      transactionType: scenario === 'emandate_above_15k' ? 'recurring' : transactionType,
      isRealRazorpayCall: true,
      razorpayOrderId: order.id,
      layer1: layer1Decision,
      outcome: { status: 'pending', timestamp: new Date() }
    });

    // Log Layer 1 decision in immutable Audit Log
    await AuditLogEntry.create({
      transactionId: transaction._id,
      layer: 1,
      decision: layer1Decision.action,
      reasoning: layer1Decision.reasoning,
      metadata: { orderId: order.id, scenario, withSystem }
    });

    // Step D: Build Checkout options object
    const checkoutConfig = buildCheckoutConfig({
      order,
      customer,
      layer1Decision: withSystem ? layer1Decision : { action: 'PROCEED_NORMAL' },
      amount: effectiveAmount
    });

    // Emit live Socket.io events
    broadcastEvent('transaction:started', {
      transactionId: transaction._id,
      orderId: order.id,
      scenario,
      amount: effectiveAmount,
      isRealRazorpayCall: true,
      withSystem
    });

    broadcastEvent('layer1:decision', {
      transactionId: transaction._id,
      riskScore: layer1Decision.riskScore,
      tier: layer1Decision.tier,
      action: layer1Decision.action,
      reasoning: layer1Decision.reasoning,
      razorpayCallMade: layer1Decision.razorpayCallMade
    });

    res.json({
      success: true,
      transactionId: transaction._id,
      order,
      checkoutConfig,
      layer1Decision,
      scenario
    });
  } catch (err) {
    console.error('Live demo trigger error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Synchronous Fetch Payment API & Diagnosis Endpoint (Primary Real-Time Path)
router.post('/verify-and-diagnose', async (req, res) => {
  try {
    const {
      transactionId,
      orderId,
      paymentId,
      status = 'failed',
      rawError = null,
      scenario = 'stuck_ambiguous',
      withSystem = true
    } = req.body;

    let transaction = null;
    if (transactionId) {
      transaction = await Transaction.findById(transactionId);
    } else if (orderId) {
      transaction = await Transaction.findOne({ razorpayOrderId: orderId });
    }

    // Step A: Fetch structured ground truth error fields from Razorpay Fetch Payment API
    let rawPaymentData = null;
    let errorFields = rawError || {};

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
        console.warn(`Fetch payment API lookup warning for ${paymentId}:`, fetchErr.message);
      }
    }

    // If simulating named test scenarios on localhost without external API response:
    if (!errorFields.error_reason) {
      switch (scenario) {
        case 'stuck_ambiguous':
          errorFields = {
            error_code: 'AMBIGUOUS',
            error_description: 'Bank debited customer but webhook confirmation not received — payment status ambiguous',
            error_reason: 'webhook_drop',
            error_source: 'gateway',
            error_step: 'payment_confirmation',
            status: 'ambiguous'
          };
          break;
        case 'payment_timed_out':
        case 'timeout':
          errorFields = {
            error_code: 'GATEWAY_ERROR',
            error_description: 'Payment timed out awaiting issuer bank authorization',
            error_reason: 'payment_timed_out',
            error_source: 'bank',
            error_step: 'payment_authorization'
          };
          break;
        case 'upi_declined':
        case 'upi_instant_decline':
          errorFields = {
            error_code: 'BAD_REQUEST_ERROR',
            error_description: 'UPI transaction declined by beneficiary handle failure@razorpay',
            error_reason: 'incorrect_pin',
            error_source: 'customer',
            error_step: 'payment_authorization'
          };
          break;
        case 'emandate_above_15k':
          errorFields = {
            error_code: 'BAD_REQUEST_ERROR',
            error_description: 'RBI E-mandate limit ₹15,000 exceeded without fresh AFA authentication',
            error_reason: 'mandate_max_amount_exceeded',
            error_source: 'bank',
            error_step: 'payment_authentication'
          };
          break;
      }
    }

    // Store raw event in RazorpayEvents with deduplication
    const eventId = `fetch_${paymentId || Date.now()}`;
    await RazorpayEvent.create({
      eventType: status === 'success' ? 'payment.captured' : 'payment.failed',
      eventId,
      source: 'fetch_api',
      rawPayload: rawPaymentData || { paymentId, status, errorFields, scenario },
      processed: true
    }).catch(() => {}); // Ignore duplicate key collision

    broadcastEvent('razorpay:webhook_received', {
      eventId,
      eventType: status === 'success' ? 'payment.captured' : 'payment.failed',
      rawPayload: rawPaymentData || { paymentId, status, errorFields, scenario }
    });

    // If transaction succeeded
    if (status === 'success') {
      if (transaction) {
        transaction.outcome = { status: 'success', timestamp: new Date() };
        transaction.razorpayPaymentId = paymentId;
        transaction.finalOutcome = {
          recovered: false, // Organic success, didn't need recovery
          amountRecovered: 0,
          timestamp: new Date()
        };
        await transaction.save();

        await AuditLogEntry.create({
          transactionId: transaction._id,
          layer: 2,
          decision: 'TRANSACTION_SUCCESS',
          reasoning: 'Payment completed successfully without failure.',
          rawRazorpayPayload: rawPaymentData
        });
      }

      broadcastEvent('outcome:success', {
        transactionId: transaction?._id,
        paymentId
      });

      return res.json({
        success: true,
        status: 'success',
        transaction
      });
    }

    // --- FAILURE PATH ---
    // If running "Without our system" in Playground: just record raw failure and stop
    if (!withSystem) {
      if (transaction) {
        transaction.outcome = {
          status: 'failed',
          errorCode: errorFields.error_code,
          errorReason: errorFields.error_reason,
          errorSource: errorFields.error_source,
          errorStep: errorFields.error_step,
          timestamp: new Date()
        };
        transaction.finalOutcome = {
          recovered: false,
          amountRecovered: 0,
          timestamp: new Date()
        };
        await transaction.save();

        await AuditLogEntry.create({
          transactionId: transaction._id,
          layer: 2,
          decision: 'NO_SYSTEM_INTERVENTION',
          reasoning: 'System disabled (baseline run). Failure unhandled.',
          rawRazorpayPayload: rawPaymentData || errorFields
        });
      }

      broadcastEvent('outcome:failure', {
        transactionId: transaction?._id,
        reason: errorFields.error_reason || 'failed',
        withSystem: false
      });

      return res.json({
        success: false,
        status: 'failed',
        withSystem: false,
        errorFields,
        rawPaymentData
      });
    }

    // --- LAYER 2: Single Shared Classifier ---
    const classification = classifyError(errorFields, {
      amount: transaction?.amount || 2500,
      method: transaction?.method || 'card',
      transactionType: transaction?.transactionType || 'one-off'
    });

    broadcastEvent('layer2:classification', {
      transactionId: transaction?._id,
      category: classification.category,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
      source: 'Fetch Payment API'
    });

    // --- LAYER 3: Contextual Bandit Decision ---
    const contextBucket = getContextBucket({
      amount: transaction?.amount || 2500,
      method: transaction?.method || 'card',
      timeOfDay: transaction?.timeOfDay || '14:00'
    });

    const banditDecision = await selectRecoveryAction({
      category: classification.category,
      contextBucket
    });

    // --- LAYER 2: Restraint Gate Evaluation ---
    const restraintResult = evaluateRestraintGate({
      category: classification.category,
      attemptsSoFar: transaction?.layer2?.attemptsSoFar || 0,
      amount: transaction?.amount || 2500,
      banditWinRate: banditDecision.winRate,
      proposedAction: banditDecision.action
    });

    // --- Execute Recovery Action via Real Razorpay API ---
    let recoveryExecution = {
      actionTaken: restraintResult.action,
      razorpayPaymentLinkId: null,
      paymentLinkUrl: null
    };

    if (restraintResult.allowed) {
      recoveryExecution = await executeRecoveryAction({
        action: restraintResult.action,
        category: classification.category,
        transaction: transaction || {
          amount: 2500,
          _id: `txn_${Date.now()}`
        },
        customer: {
          name: transaction?.customerName || 'Valued Customer',
          email: 'customer@example.com',
          contact: '+919876543210'
        },
        isRealRazorpayCall: true
      });
    }

    broadcastEvent('layer2:action', {
      transactionId: transaction?._id,
      category: classification.category,
      action: recoveryExecution.actionTaken,
      paymentLinkId: recoveryExecution.razorpayPaymentLinkId,
      paymentLinkUrl: recoveryExecution.paymentLinkUrl,
      restraint: restraintResult.restraint,
      reasoning: `${classification.reasoning} -> Action: ${recoveryExecution.actionTaken}`
    });

    // Update Transaction model
    if (transaction) {
      transaction.outcome = {
        status: 'failed',
        errorCode: errorFields.error_code,
        errorReason: errorFields.error_reason,
        errorSource: errorFields.error_source,
        errorStep: errorFields.error_step,
        timestamp: new Date()
      };

      transaction.layer2 = {
        category: classification.category,
        actionTaken: recoveryExecution.actionTaken,
        reasoning: `${classification.reasoning} | ${banditDecision.reasoning} | ${restraintResult.reason}`,
        razorpayPaymentLinkId: recoveryExecution.razorpayPaymentLinkId,
        paymentLinkUrl: recoveryExecution.paymentLinkUrl,
        restraint: restraintResult.restraint,
        restraintReason: restraintResult.restraint ? restraintResult.reason : null,
        attemptsSoFar: (transaction.layer2?.attemptsSoFar || 0) + (restraintResult.allowed ? 1 : 0)
      };

      // By default in demo, a generated recovery Payment Link gives high chance of recovery
      const isRecovered = restraintResult.allowed && Boolean(recoveryExecution.razorpayPaymentLinkId || recoveryExecution.details?.retryOrderId);
      transaction.finalOutcome = {
        recovered: isRecovered,
        amountRecovered: isRecovered ? transaction.amount : 0,
        timestamp: new Date()
      };

      await transaction.save();

      // Write immutable Layer 2 Audit Log Entry with full raw Razorpay Payload
      await AuditLogEntry.create({
        transactionId: transaction._id,
        layer: 2,
        decision: recoveryExecution.actionTaken,
        reasoning: `${classification.reasoning} -> Executed: ${recoveryExecution.actionTaken}`,
        rawRazorpayPayload: rawPaymentData || { errorFields, scenario }
      });

      // Update Layer 3 Bandit State from this real outcome
      if (isRecovered) {
        await updateBanditOutcome({
          category: classification.category,
          contextBucket,
          action: recoveryExecution.actionTaken,
          recovered: true
        });

        broadcastEvent('bandit:update', {
          category: classification.category,
          contextBucket,
          action: recoveryExecution.actionTaken,
          recovered: true
        });
      }
    }

    res.json({
      success: true,
      status: 'diagnosed_and_recovered',
      classification,
      banditDecision,
      restraintResult,
      recoveryExecution,
      rawRazorpayPayload: rawPaymentData || errorFields,
      transaction
    });
  } catch (err) {
    console.error('Verify and diagnose endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. Mark Payment Link as Paid (Simulate customer clicking link and paying)
router.post('/simulate-payment-link-paid', async (req, res) => {
  try {
    const { transactionId } = req.body;
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    transaction.finalOutcome = {
      recovered: true,
      amountRecovered: transaction.amount,
      timestamp: new Date()
    };
    await transaction.save();

    if (transaction.layer2?.category) {
      const bucket = getContextBucket({
        amount: transaction.amount,
        method: transaction.method,
        timeOfDay: transaction.timeOfDay
      });
      await updateBanditOutcome({
        category: transaction.layer2.category,
        contextBucket: bucket,
        action: transaction.layer2.actionTaken,
        recovered: true
      });
    }

    broadcastEvent('outcome:recovered', {
      transactionId: transaction._id,
      amountRecovered: transaction.amount
    });

    res.json({ success: true, transaction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

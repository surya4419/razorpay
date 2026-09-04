import crypto from 'crypto';
import { config } from '../config/env.js';
import { RazorpayEvent } from '../models/RazorpayEvent.js';
import { Transaction } from '../models/Transaction.js';
import { AuditLogEntry } from '../models/AuditLogEntry.js';
import { classifyError } from '../layer2-recover/classifier.js';
import { evaluateRestraintGate } from '../layer2-recover/restraintGate.js';
import { executeRecoveryAction } from '../layer2-recover/executor.js';
import { getContextBucket, selectRecoveryAction, updateBanditOutcome } from '../layer3-learn/bandit.js';
import { broadcastEvent } from '../sockets/index.js';

/**
 * Verifies Razorpay webhook signature (HMAC SHA256) using raw body.
 */
export function verifyWebhookSignature(rawBody, signature, secret) {
  if (!signature || !secret || secret === 'placeholder_webhook_secret') {
    return true; // Bypass in local dev/testing if placeholder secret
  }
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
}

/**
 * Inbound webhook handler with deduplication and secondary Layer 2 processing.
 */
export async function handleWebhookEvent(req, res) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.body; // Buffer or raw string from body-parser
    const secret = config.razorpayWebhookSecret;

    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    const eventType = payload.event || 'unknown';
    const eventId = payload.id || `evt_${payload.payload?.payment?.entity?.id || Date.now()}`;

    // 1. Webhook signature verification
    const isValid = verifyWebhookSignature(req.rawBody || JSON.stringify(payload), signature, secret);
    if (!isValid) {
      console.warn('Invalid Razorpay webhook signature received.');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    // 2. Deduplication check
    const existingEvent = await RazorpayEvent.findOne({ eventId });
    if (existingEvent) {
      console.log(`[Deduplication] Webhook event ${eventId} already received. Acknowledging without duplicate processing.`);
      return res.status(200).json({ status: 'ok', message: 'Event already processed' });
    }

    // Store raw event
    const razorpayEvent = await RazorpayEvent.create({
      eventType,
      eventId,
      source: 'webhook',
      rawPayload: payload,
      receivedAt: new Date(),
      processed: true
    });

    broadcastEvent('razorpay:webhook_received', {
      eventId,
      eventType,
      rawPayload: payload
    });

    const paymentEntity = payload.payload?.payment?.entity;
    if (!paymentEntity) {
      return res.status(200).json({ status: 'ok', received: true });
    }

    // 3. Check if transaction was already processed by synchronous Fetch Payment API
    const orderId = paymentEntity.order_id;
    let transaction = null;
    if (orderId) {
      transaction = await Transaction.findOne({ razorpayOrderId: orderId });
    }

    if (transaction && transaction.outcome.status !== 'pending') {
      console.log(`Transaction for order ${orderId} already diagnosed via Fetch API.`);
      return res.status(200).json({ status: 'ok', alreadyHandled: true });
    }

    // If payment failed and needs diagnosis
    if (eventType === 'payment.failed' || paymentEntity.status === 'failed') {
      const errorObj = {
        error_code: paymentEntity.error_code,
        error_description: paymentEntity.error_description,
        error_reason: paymentEntity.error_reason,
        error_source: paymentEntity.error_source,
        error_step: paymentEntity.error_step
      };

      const classification = classifyError(errorObj, {
        amount: paymentEntity.amount / 100,
        method: paymentEntity.method,
        transactionType: 'one-off'
      });

      broadcastEvent('layer2:classification', {
        category: classification.category,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
        source: 'real_webhook'
      });

      const contextBucket = getContextBucket({
        amount: paymentEntity.amount / 100,
        method: paymentEntity.method
      });

      const banditDecision = await selectRecoveryAction({
        category: classification.category,
        contextBucket
      });

      const restraintResult = evaluateRestraintGate({
        category: classification.category,
        attemptsSoFar: transaction?.layer2?.attemptsSoFar || 0,
        amount: paymentEntity.amount / 100,
        banditWinRate: banditDecision.winRate,
        proposedAction: banditDecision.action
      });

      let recoveryResult = { actionTaken: restraintResult.action };
      if (restraintResult.allowed) {
        recoveryResult = await executeRecoveryAction({
          action: restraintResult.action,
          category: classification.category,
          transaction: transaction || {
            amount: paymentEntity.amount / 100,
            _id: `txn_${Date.now()}`
          },
          isRealRazorpayCall: true
        });
      }

      if (transaction) {
        transaction.outcome = {
          status: 'failed',
          errorCode: errorObj.error_code,
          errorReason: errorObj.error_reason,
          errorSource: errorObj.error_source,
          errorStep: errorObj.error_step,
          timestamp: new Date()
        };
        transaction.layer2 = {
          category: classification.category,
          actionTaken: recoveryResult.actionTaken,
          reasoning: `${classification.reasoning} | ${banditDecision.reasoning} | ${restraintResult.reason}`,
          razorpayPaymentLinkId: recoveryResult.razorpayPaymentLinkId,
          paymentLinkUrl: recoveryResult.paymentLinkUrl,
          restraint: restraintResult.restraint,
          restraintReason: restraintResult.restraint ? restraintResult.reason : null,
          attemptsSoFar: (transaction.layer2?.attemptsSoFar || 0) + (restraintResult.allowed ? 1 : 0)
        };
        await transaction.save();

        await AuditLogEntry.create({
          transactionId: transaction._id,
          layer: 2,
          decision: recoveryResult.actionTaken,
          reasoning: `${classification.reasoning} -> Action: ${recoveryResult.actionTaken}`,
          rawRazorpayPayload: payload
        });
      }
    } else if (eventType === 'payment.captured' || paymentEntity.status === 'captured') {
      if (transaction) {
        transaction.finalOutcome = {
          recovered: true,
          amountRecovered: paymentEntity.amount / 100,
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
      }
    }

    return res.status(200).json({ status: 'ok', processed: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).json({ error: err.message });
  }
}

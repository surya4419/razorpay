import { getRazorpayClient } from '../config/razorpay.js';
import { config } from '../config/env.js';

/**
 * Reconciliation client for stuck/ambiguous transactions.
 * Queries real Razorpay APIs to determine true payment status
 * when a webhook was dropped or delayed.
 *
 * Sequence per spec 2.3:
 *   1. GET /v1/payments/{payment_id}  — fetch payment status
 *   2. GET /v1/orders/{order_id}      — cross-check order status
 *   3. GET /v1/orders/{order_id}/payments — catch retry/double-attempt
 *
 * Decision outcomes: captured | authorized | failed | created (abandoned)
 */

export async function reconcileAmbiguousTransaction({ paymentId, orderId }) {
  const log = [];

  // Step 1: Fetch Payment
  let paymentStatus = 'unknown';
  let paymentData = null;

  if (paymentId) {
    try {
      if (config.isRealRazorpayConfigured) {
        const client = getRazorpayClient();
        paymentData = await client.payments.fetch(paymentId);
      } else {
        // Sandbox: simulate a captured payment — the webhook was dropped but bank succeeded
        paymentData = {
          id: paymentId,
          entity: 'payment',
          status: 'captured',
          amount: 740000,
          currency: 'INR',
          method: 'card',
          order_id: orderId,
          captured: true,
          created_at: Math.floor(Date.now() / 1000) - 25
        };
        console.log(`[Sandbox] Reconciliation: GET /v1/payments/${paymentId} → captured`);
      }

      paymentStatus = paymentData.status;
      log.push({
        step: 'fetch_payment',
        endpoint: `GET /v1/payments/${paymentId}`,
        result: { status: paymentStatus, captured: paymentData.captured },
        timestamp: new Date()
      });
    } catch (err) {
      log.push({ step: 'fetch_payment', endpoint: `GET /v1/payments/${paymentId}`, error: err.message, timestamp: new Date() });
    }
  }

  // Step 2: Fetch Order
  let orderStatus = 'unknown';
  let orderData = null;

  if (orderId) {
    try {
      if (config.isRealRazorpayConfigured) {
        const client = getRazorpayClient();
        orderData = await client.orders.fetch(orderId);
      } else {
        orderData = {
          id: orderId,
          entity: 'order',
          status: paymentStatus === 'captured' ? 'paid' : 'created',
          amount_paid: paymentStatus === 'captured' ? 740000 : 0
        };
        console.log(`[Sandbox] Reconciliation: GET /v1/orders/${orderId} → ${orderData.status}`);
      }

      orderStatus = orderData.status;
      log.push({
        step: 'fetch_order',
        endpoint: `GET /v1/orders/${orderId}`,
        result: { status: orderStatus, amount_paid: orderData.amount_paid },
        timestamp: new Date()
      });
    } catch (err) {
      log.push({ step: 'fetch_order', endpoint: `GET /v1/orders/${orderId}`, error: err.message, timestamp: new Date() });
    }
  }

  // Step 3: Fetch all payments for order (catch retry / double-attempt)
  let orderPayments = [];

  if (orderId) {
    try {
      if (config.isRealRazorpayConfigured) {
        const client = getRazorpayClient();
        const result = await client.orders.fetchPayments(orderId);
        orderPayments = result.items || [];
      } else {
        orderPayments = paymentData ? [paymentData] : [];
        console.log(`[Sandbox] Reconciliation: GET /v1/orders/${orderId}/payments → ${orderPayments.length} payment(s)`);
      }

      log.push({
        step: 'fetch_order_payments',
        endpoint: `GET /v1/orders/${orderId}/payments`,
        result: { count: orderPayments.length, statuses: orderPayments.map(p => p.status) },
        timestamp: new Date()
      });
    } catch (err) {
      log.push({ step: 'fetch_order_payments', endpoint: `GET /v1/orders/${orderId}/payments`, error: err.message, timestamp: new Date() });
    }
  }

  // Decision logic per spec 2.3
  let decision = 'unknown';
  let resolutionAction = 'SEND_PAYMENT_LINK';
  let resolutionNote = '';

  const hasCaptured = paymentStatus === 'captured' || orderStatus === 'paid' ||
    orderPayments.some(p => p.status === 'captured');

  if (hasCaptured) {
    decision = 'already_captured';
    resolutionAction = 'MARK_RECOVERED_SILENT';
    resolutionNote = 'Payment was already captured at the bank. Merchant system marked recovered silently — no customer contact needed.';
  } else if (paymentStatus === 'authorized') {
    decision = 'authorized_not_captured';
    resolutionAction = 'TRIGGER_CAPTURE';
    resolutionNote = 'Payment authorized but not yet captured. Triggering capture call.';
  } else if (paymentStatus === 'failed') {
    decision = 'genuinely_failed';
    resolutionAction = 'SEND_PAYMENT_LINK';
    resolutionNote = 'API confirms genuine failure — reclassified into standard Layer 2 recovery taxonomy.';
  } else {
    decision = 'checkout_abandoned';
    resolutionAction = 'SEND_PAYMENT_LINK';
    resolutionNote = 'No bank activity detected — treated as genuine abandonment.';
  }

  return {
    decision,
    resolutionAction,
    resolutionNote,
    paymentStatus,
    orderStatus,
    orderPaymentCount: orderPayments.length,
    reconciliationLog: log
  };
}

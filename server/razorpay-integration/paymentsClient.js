import { getRazorpayClient } from '../config/razorpay.js';
import { config } from '../config/env.js';

/**
 * Fetches real payment details from Razorpay via Fetch Payment API (GET /v1/payments/:id).
 * Ground truth source for error_code, error_description, error_reason, error_source, error_step.
 */
export async function fetchPayment(paymentId) {
  if (!paymentId) {
    throw new Error('paymentId is required for fetchPayment');
  }

  // If real Razorpay credentials are configured, call the real Razorpay API
  if (config.isRealRazorpayConfigured) {
    try {
      const client = getRazorpayClient();
      const payment = await client.payments.fetch(paymentId);
      return payment;
    } catch (err) {
      console.error(`Razorpay fetchPayment API error for ${paymentId}:`, err.message);
      throw err;
    }
  }

  // Realistic mock response when running in local sandbox without API keys
  console.log(`[Sandbox Mode] Simulating Fetch Payment API for ${paymentId}`);
  return {
    id: paymentId,
    entity: 'payment',
    amount: 500000,
    currency: 'INR',
    status: 'captured',
    captured: true,
    method: 'card',
    error_code: null,
    error_description: null,
    error_reason: null,
    error_source: null,
    error_step: null,
    created_at: Math.floor(Date.now() / 1000)
  };
}

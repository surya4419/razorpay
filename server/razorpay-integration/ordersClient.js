import { getRazorpayClient } from '../config/razorpay.js';
import { config } from '../config/env.js';

/**
 * Creates an order via Razorpay Orders API (POST /v1/orders).
 */
export async function createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
  const amountInPaise = Math.round(Number(amount) * 100);

  if (config.isRealRazorpayConfigured) {
    try {
      const client = getRazorpayClient();
      const order = await client.orders.create({
        amount: amountInPaise,
        currency,
        receipt: receipt || `rcpt_${Date.now()}`,
        notes: {
          ...notes,
          platform: 'ai_revenue_recovery_engine',
          version: '2.0'
        }
      });
      return order;
    } catch (err) {
      console.error('Razorpay Orders API error:', err.message);
      throw err;
    }
  }

  // Sandbox fallback
  const mockId = `order_${Math.random().toString(36).substring(2, 11)}`;
  return {
    id: mockId,
    entity: 'order',
    amount: amountInPaise,
    amount_paid: 0,
    amount_due: amountInPaise,
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
    status: 'created',
    notes,
    created_at: Math.floor(Date.now() / 1000)
  };
}

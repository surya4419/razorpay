import { config } from '../config/env.js';

/**
 * Builds Checkout configuration object applying Layer 1 prevention modifications:
 * - Method reordering (UPI first vs Card first)
 * - Session timeout extension (180s default, 300s when EXTEND_SESSION)
 * - Prefill customer info
 * - Theme and order metadata
 */
export function buildCheckoutConfig({
  order,
  customer = {},
  layer1Decision = {},
  amount,
  notes = {}
}) {
  const methodPreference = layer1Decision.action === 'REORDER_METHODS'
    ? (layer1Decision.details?.preferredOrder || ['wallet', 'upi', 'card', 'netbanking'])
    : ['card', 'upi', 'netbanking', 'wallet'];

  // EXTEND_SESSION → 300s (5:00 displayed), default → 180s (3:00)
  const timeoutSeconds = layer1Decision.action === 'EXTEND_SESSION' ? 300 : 180;

  return {
    key: config.razorpayKeyId,
    amount: order ? order.amount : Math.round(Number(amount) * 100),
    currency: order ? order.currency : 'INR',
    name: 'AI Revenue Recovery Engine',
    description: `Order ${order ? order.id : 'Live Demo'} — Smart Checkout`,
    order_id: order ? order.id : undefined,
    timeout: timeoutSeconds,
    prefill: {
      name: customer.name || 'Valued Customer',
      email: customer.email || 'customer@example.com',
      contact: customer.contact || '+919876543210'
    },
    notes: {
      ...notes,
      layer1_action: layer1Decision.action || 'PROCEED_NORMAL',
      risk_score: layer1Decision.riskScore || 0,
      timeout_applied: `${timeoutSeconds}s`
    },
    config: {
      display: {
        sequence: methodPreference,
        preferences: {
          show_default_blocks: true
        }
      }
    },
    theme: {
      color: '#14304D'
    }
  };
}

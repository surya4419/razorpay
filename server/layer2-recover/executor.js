import { createPaymentLink } from '../razorpay-integration/paymentLinksClient.js';
import { createOrder } from '../razorpay-integration/ordersClient.js';
import { createSubscription } from '../razorpay-integration/subscriptionsClient.js';
import { reconcileAmbiguousTransaction } from '../razorpay-integration/reconciliationClient.js';

/**
 * Layer 2 Recovery Executor.
 * Executes the recovery action through real Razorpay APIs (Payment Links, Orders, Subscriptions).
 */
export async function executeRecoveryAction({
  action,
  category,
  transaction,
  customer = {},
  isRealRazorpayCall = false
}) {
  const amount = transaction.amount;
  const customerEmail = customer.email || transaction.customerEmail || 'customer@example.com';
  const customerName = customer.name || transaction.customerName || 'Valued Customer';
  const customerContact = customer.contact || '+919876543210';

  const recoveryResult = {
    actionTaken: action,
    razorpayPaymentLinkId: null,
    paymentLinkUrl: null,
    details: {},
    executedAt: new Date()
  };

  switch (action) {
    case 'RECONCILE_VIA_API':
    case 'MARK_RECOVERED_SILENT': {
      // Ambiguous transaction: query real Razorpay APIs to determine true status
      const reconciliation = await reconcileAmbiguousTransaction({
        paymentId: transaction.razorpayPaymentId,
        orderId: transaction.razorpayOrderId
      });

      recoveryResult.actionTaken = reconciliation.resolutionAction;
      recoveryResult.details = {
        decision: reconciliation.decision,
        resolutionNote: reconciliation.resolutionNote,
        paymentStatus: reconciliation.paymentStatus,
        orderStatus: reconciliation.orderStatus,
        reconciliationLog: reconciliation.reconciliationLog
      };

      // If already captured, no payment link needed — silently mark recovered
      if (reconciliation.decision === 'already_captured') {
        recoveryResult.details.silentRecovery = true;
      }
      break;
    }
    case 'SUGGEST_ALT_METHOD':
    case 'NO_RETRY_SUGGEST_ALT':
    case 'SEND_PAYMENT_LINK':
    case 'TIMED_NUDGE_NO_DISCOUNT':
    case 'SINGLE_NUDGE':
    case 'RESEND_ALT_CHANNEL':
    case 'WHATSAPP_NUDGE_LINK': {
      const link = await createPaymentLink({
        amount,
        description: `Recovery for Order ${transaction.razorpayOrderId || transaction._id} (${category})`,
        customer: {
          name: customerName,
          email: customerEmail,
          contact: customerContact
        },
        notify: {
          sms: true,
          email: true
        },
        notes: {
          original_transaction_id: String(transaction._id || ''),
          category,
          recovery_action: action
        }
      });

      recoveryResult.razorpayPaymentLinkId = link.id;
      recoveryResult.paymentLinkUrl = link.short_url || `https://rzp.io/i/${link.id}`;
      recoveryResult.details = {
        channel: action.includes('WHATSAPP') ? 'whatsapp' : 'email_sms',
        paymentLink: link
      };
      break;
    }

    case 'DELAYED_RETRY':
    case 'RETRY_ALT_ROUTE':
    case 'CASCADE_BACKUP': {
      const retryOrder = await createOrder({
        amount,
        receipt: `retry_${Date.now()}`,
        notes: {
          original_transaction_id: String(transaction._id || ''),
          retry_type: action,
          category
        }
      });

      recoveryResult.details = {
        retryOrderId: retryOrder.id,
        scheduledFor: action === 'DELAYED_RETRY' ? '24h-48h window' : 'immediate alternate switch'
      };
      break;
    }

    case 'SEND_AUTH_LINK':
    case 'SEND_REMINDER_THEN_RETRY': {
      const sub = await createSubscription({
        notes: {
          transaction_id: String(transaction._id || ''),
          category
        }
      });

      recoveryResult.details = {
        subscriptionId: sub.id,
        authLinkUrl: sub.short_url
      };
      break;
    }

    case 'IMMEDIATE_REPROMPT':
    case 'STEP_UP_VERIFY':
    default: {
      recoveryResult.details = {
        clientAction: 'checkout_modal_reinvocation',
        message: 'Re-prompting payment UI directly on client.'
      };
      break;
    }
  }

  return recoveryResult;
}

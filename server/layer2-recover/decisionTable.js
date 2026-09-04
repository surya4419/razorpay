export const FAILURE_CATEGORIES = {
  STUCK_AMBIGUOUS_TRANSACTION: 'STUCK_AMBIGUOUS_TRANSACTION',
  SOFT_DO_NOT_HONOR: 'SOFT_DO_NOT_HONOR',
  SOFT_TIMEOUT_SYSTEM_ERROR: 'SOFT_TIMEOUT_SYSTEM_ERROR',
  SOFT_LIMIT_EXCEEDED: 'SOFT_LIMIT_EXCEEDED',
  HARD_EXPIRED_CARD: 'HARD_EXPIRED_CARD',
  HARD_LOST_STOLEN_CARD: 'HARD_LOST_STOLEN_CARD',
  HARD_INVALID_CARD: 'HARD_INVALID_CARD',
  HARD_FRAUD_BLOCK: 'HARD_FRAUD_BLOCK',
  UPI_WRONG_PIN: 'UPI_WRONG_PIN',
  UPI_SERVER_DOWNTIME: 'UPI_SERVER_DOWNTIME',
  UPI_DAILY_LIMIT_EXCEEDED: 'UPI_DAILY_LIMIT_EXCEEDED',
  UPI_INVALID_VPA: 'UPI_INVALID_VPA',
  REGULATORY_EMANDATE_AFA_REQUIRED: 'REGULATORY_EMANDATE_AFA_REQUIRED',
  REGULATORY_MISSED_PREDEBIT_ALERT: 'REGULATORY_MISSED_PREDEBIT_ALERT',
  AUTH_OTP_DELIVERY_FAILURE: 'AUTH_OTP_DELIVERY_FAILURE',
  INFRA_GATEWAY_DOWNTIME: 'INFRA_GATEWAY_DOWNTIME',
  INFRA_SESSION_TIMEOUT: 'INFRA_SESSION_TIMEOUT',
  INFRA_NETWORK_DROP: 'INFRA_NETWORK_DROP',
  ABANDON_PRICE_SHOCK: 'ABANDON_PRICE_SHOCK',
  ABANDON_OTP_DELAY: 'ABANDON_OTP_DELAY',
  ABANDON_GENERAL_FRICTION: 'ABANDON_GENERAL_FRICTION',
  FRAUD_RULE_FALSE_POSITIVE: 'FRAUD_RULE_FALSE_POSITIVE'
};

export const DEFAULT_DECISION_TABLE = {
  [FAILURE_CATEGORIES.STUCK_AMBIGUOUS_TRANSACTION]: {
    name: 'Stuck/Ambiguous Transaction — Webhook Drop',
    defaultAction: 'RECONCILE_VIA_API',
    maxAttempts: 1,
    frictionCost: 0,
    channel: 'api_reconciliation',
    executionType: 'RECONCILIATION_API',
    alternativeActions: ['SEND_PAYMENT_LINK'],
    description: 'Bank debited customer but merchant system shows no confirmation. Query real Razorpay payment/order status before any customer contact — may already be captured.'
  },
  [FAILURE_CATEGORIES.SOFT_TIMEOUT_SYSTEM_ERROR]: {
    name: 'Soft Decline — Timeout / System Error',
    defaultAction: 'RETRY_ALT_ROUTE',
    maxAttempts: 2,
    frictionCost: 1,
    channel: 'instant_switch',
    executionType: 'ORDERS_API',
    alternativeActions: ['SEND_PAYMENT_LINK', 'DELAYED_RETRY'],
    description: 'Immediate retry via an alternative bank gateway or processing flow.'
  },
  [FAILURE_CATEGORIES.SOFT_DO_NOT_HONOR]: {
    name: 'Soft Decline — Do Not Honor',
    defaultAction: 'DELAYED_RETRY',
    maxAttempts: 2,
    frictionCost: 2,
    channel: 'scheduled_order',
    executionType: 'ORDERS_API',
    alternativeActions: ['SUGGEST_ALT_METHOD', 'SEND_PAYMENT_LINK'],
    description: 'Generic bank decline code; retrying after cooling-off period often succeeds.'
  },
  [FAILURE_CATEGORIES.SOFT_LIMIT_EXCEEDED]: {
    name: 'Soft Decline — Limit Exceeded',
    defaultAction: 'SUGGEST_ALT_METHOD',
    maxAttempts: 1,
    frictionCost: 1,
    channel: 'payment_link',
    executionType: 'PAYMENT_LINKS_API',
    alternativeActions: ['SPLIT_PAYMENT_NUDGE', 'DELAYED_RETRY'],
    description: 'Prompt user with a Payment Link configured for alternative payment instruments (e.g. Netbanking/UPI).'
  },
  [FAILURE_CATEGORIES.HARD_EXPIRED_CARD]: {
    name: 'Hard Decline — Expired Card',
    defaultAction: 'NO_RETRY_SUGGEST_ALT',
    maxAttempts: 0,
    frictionCost: 1,
    channel: 'payment_link',
    executionType: 'PAYMENT_LINKS_API',
    alternativeActions: ['UPDATE_CARD_NUDGE'],
    description: 'Never auto-retry expired cards. Send a method-flexible Payment Link to update details.'
  },
  [FAILURE_CATEGORIES.HARD_LOST_STOLEN_CARD]: {
    name: 'Hard Decline — Lost / Stolen Card',
    defaultAction: 'NO_RETRY_SUGGEST_ALT',
    maxAttempts: 0,
    frictionCost: 1,
    channel: 'payment_link',
    executionType: 'PAYMENT_LINKS_API',
    alternativeActions: ['SECURE_METHOD_LINK'],
    description: 'Zero auto-retries. Send secure multi-method Payment Link to avoid merchant account penalties.'
  },
  [FAILURE_CATEGORIES.HARD_INVALID_CARD]: {
    name: 'Hard Decline — Invalid Card Number / Details',
    defaultAction: 'NO_RETRY_SUGGEST_ALT',
    maxAttempts: 0,
    frictionCost: 1,
    channel: 'payment_link',
    executionType: 'PAYMENT_LINKS_API',
    alternativeActions: ['SEND_PAYMENT_LINK'],
    description: 'Permanent invalid details. Prompt with clean Checkout Link.'
  },
  [FAILURE_CATEGORIES.HARD_FRAUD_BLOCK]: {
    name: 'Hard Decline — Issuer Fraud Block',
    defaultAction: 'NO_RETRY_SUGGEST_ALT',
    maxAttempts: 0,
    frictionCost: 1,
    channel: 'payment_link',
    executionType: 'PAYMENT_LINKS_API',
    alternativeActions: ['VERIFIED_PAYMENT_LINK'],
    description: 'Issuer blocked card. No auto-retries. Offer alternative trusted payment rails.'
  },
  [FAILURE_CATEGORIES.UPI_WRONG_PIN]: {
    name: 'UPI — Wrong PIN Entered',
    defaultAction: 'IMMEDIATE_REPROMPT',
    maxAttempts: 1,
    frictionCost: 1,
    channel: 'checkout_modal',
    executionType: 'CHECKOUT_REINVOKE',
    alternativeActions: ['SEND_PAYMENT_LINK'],
    description: 'User entry mistake. Re-prompt immediately on checkout interface with existing VPA.'
  },
  [FAILURE_CATEGORIES.UPI_SERVER_DOWNTIME]: {
    name: 'UPI — PSP / NPCI Server Downtime',
    defaultAction: 'DELAYED_RETRY',
    maxAttempts: 2,
    frictionCost: 2,
    channel: 'scheduled_order',
    executionType: 'ORDERS_API',
    alternativeActions: ['SUGGEST_ALT_METHOD', 'SEND_PAYMENT_LINK'],
    description: 'NPCI / Bank UPI gateway down. Retry when banking switch recovers or route to Netbanking.'
  },
  [FAILURE_CATEGORIES.UPI_DAILY_LIMIT_EXCEEDED]: {
    name: 'UPI — Daily Limit Exceeded',
    defaultAction: 'SUGGEST_ALT_METHOD',
    maxAttempts: 1,
    frictionCost: 1,
    channel: 'payment_link',
    executionType: 'PAYMENT_LINKS_API',
    alternativeActions: ['DELAYED_RETRY_NEXT_DAY'],
    description: 'Customer hit ₹1L/day UPI ceiling. Provide Payment Link restricted to Cards / Netbanking.'
  },
  [FAILURE_CATEGORIES.UPI_INVALID_VPA]: {
    name: 'UPI — Invalid or Inactive VPA',
    defaultAction: 'IMMEDIATE_REPROMPT',
    maxAttempts: 1,
    frictionCost: 1,
    channel: 'checkout_modal',
    executionType: 'CHECKOUT_REINVOKE',
    alternativeActions: ['SEND_PAYMENT_LINK'],
    description: 'Typo in VPA string. Prompt user to re-enter handle or choose QR / Intent flow.'
  },
  [FAILURE_CATEGORIES.REGULATORY_EMANDATE_AFA_REQUIRED]: {
    name: 'Regulatory — E-Mandate > ₹15,000 AFA Required',
    defaultAction: 'SEND_AUTH_LINK',
    maxAttempts: 2,
    frictionCost: 1,
    channel: 'subscriptions_flow',
    executionType: 'SUBSCRIPTIONS_API',
    alternativeActions: ['SEND_PAYMENT_LINK'],
    description: "RBI rules require explicit OTP/AFA verification for recurring amounts > ₹15,000. Send authenticated approval flow."
  },
  [FAILURE_CATEGORIES.REGULATORY_MISSED_PREDEBIT_ALERT]: {
    name: 'Regulatory — Missed Mandatory 24h Pre-Debit Alert',
    defaultAction: 'SEND_REMINDER_THEN_RETRY',
    maxAttempts: 1,
    frictionCost: 1,
    channel: 'predebit_notification',
    executionType: 'SUBSCRIPTIONS_API',
    alternativeActions: ['SEND_AUTH_LINK'],
    description: 'Notify customer 24 hours prior to scheduled charge to comply with RBI mandate, then execute debit.'
  },
  [FAILURE_CATEGORIES.AUTH_OTP_DELIVERY_FAILURE]: {
    name: 'Authentication — 3DS / OTP Delivery Failure',
    defaultAction: 'RESEND_ALT_CHANNEL',
    maxAttempts: 2,
    frictionCost: 1,
    channel: 'sms_whatsapp_otp',
    executionType: 'CHECKOUT_REINVOKE',
    alternativeActions: ['SEND_PAYMENT_LINK', 'EXTEND_AUTH_WINDOW'],
    description: 'SMS gateway delay. Resend authentication prompt via WhatsApp / email with extended expiry.'
  },
  [FAILURE_CATEGORIES.INFRA_GATEWAY_DOWNTIME]: {
    name: 'Infrastructure — Payment Gateway Downtime',
    defaultAction: 'RETRY_ALT_ROUTE',
    maxAttempts: 2,
    frictionCost: 1,
    channel: 'optimizer_switch',
    executionType: 'ORDERS_API',
    alternativeActions: ['SEND_PAYMENT_LINK'],
    description: 'Bank or gateway gateway error. Route transaction through secondary healthy payment partner.'
  },
  [FAILURE_CATEGORIES.INFRA_SESSION_TIMEOUT]: {
    name: 'Infrastructure — Session / Checkout Timeout',
    defaultAction: 'RETRY_ALT_ROUTE',
    maxAttempts: 2,
    frictionCost: 1,
    channel: 'payment_link',
    executionType: 'PAYMENT_LINKS_API',
    alternativeActions: ['IMMEDIATE_REPROMPT'],
    description: 'Customer took too long or session expired. Generate fresh active Payment Link.'
  },
  [FAILURE_CATEGORIES.INFRA_NETWORK_DROP]: {
    name: 'Infrastructure — Network Dropped Mid-Transaction',
    defaultAction: 'RETRY_ALT_ROUTE',
    maxAttempts: 2,
    frictionCost: 1,
    channel: 'payment_link',
    executionType: 'PAYMENT_LINKS_API',
    alternativeActions: ['SINGLE_NUDGE'],
    description: 'Network handshake broken. Send resume Payment Link directly to phone/email.'
  },
  [FAILURE_CATEGORIES.ABANDON_PRICE_SHOCK]: {
    name: 'Abandonment — Price / Shipping Fee Friction',
    defaultAction: 'TIMED_NUDGE_NO_DISCOUNT',
    maxAttempts: 1,
    frictionCost: 2,
    channel: 'whatsapp_nudge',
    executionType: 'PAYMENT_LINKS_API',
    alternativeActions: ['CART_RESERVE_LINK', 'EMAIL_NUDGE'],
    description: 'Send timed reminder with reserved-cart urgency without training customer with blanket discounts.'
  },
  [FAILURE_CATEGORIES.ABANDON_OTP_DELAY]: {
    name: 'Abandonment — OTP Delay / Frustration Drop',
    defaultAction: 'RESEND_ALT_CHANNEL',
    maxAttempts: 1,
    frictionCost: 1,
    channel: 'payment_link',
    executionType: 'PAYMENT_LINKS_API',
    alternativeActions: ['WHATSAPP_NUDGE_LINK'],
    description: 'Customer gave up waiting for OTP. Deliver frictionless 1-click Payment Link.'
  },
  [FAILURE_CATEGORIES.ABANDON_GENERAL_FRICTION]: {
    name: 'Abandonment — General Cart Abandonment',
    defaultAction: 'SINGLE_NUDGE',
    maxAttempts: 1,
    frictionCost: 1,
    channel: 'payment_link',
    executionType: 'PAYMENT_LINKS_API',
    alternativeActions: ['RESERVED_CART_REMINDER'],
    description: 'Send one polite, well-timed nudge with a quick pay link, then respect customer decision.'
  },
  [FAILURE_CATEGORIES.FRAUD_RULE_FALSE_POSITIVE]: {
    name: 'Risk — Fraud Rule False Positive',
    defaultAction: 'STEP_UP_VERIFY',
    maxAttempts: 1,
    frictionCost: 1,
    channel: 'light_stepup',
    executionType: 'CHECKOUT_REINVOKE',
    alternativeActions: ['SEND_PAYMENT_LINK'],
    description: 'Genuine customer caught by aggressive velocity filter. Prompt with lightweight step-up verification.'
  }
};

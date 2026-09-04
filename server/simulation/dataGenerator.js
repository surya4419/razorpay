import { Customer } from '../models/Customer.js';

const MOCK_NAMES = [
  'Aarav Sharma', 'Aditi Rao', 'Rohan Mehta', 'Sneha Nair', 'Kavita Joshi',
  'Deepak Gupta', 'Meera Kapoor', 'Siddharth Jain', 'Pooja Iyer', 'Rahul Varma',
  'Ananya Das', 'Vikram Singh', 'Tanvi Kulkarni', 'Amitabh Reddy', 'Divya Menon'
];

const FAILURE_SCENARIO_PROBS = [
  { reason: 'webhook_drop', code: 'AMBIGUOUS', source: 'gateway', step: 'payment_confirmation', weight: 35 },
  { reason: 'payment_timed_out', code: 'GATEWAY_ERROR', source: 'bank', step: 'payment_authorization', weight: 18 },
  { reason: 'incorrect_pin', code: 'BAD_REQUEST_ERROR', source: 'customer', step: 'payment_authorization', weight: 14 },
  { reason: 'do_not_honor', code: 'BAD_REQUEST_ERROR', source: 'bank', step: 'payment_authorization', weight: 8 },
  { reason: 'mandate_max_amount_exceeded', code: 'BAD_REQUEST_ERROR', source: 'bank', step: 'payment_authentication', weight: 6 },
  { reason: 'expired_card', code: 'BAD_REQUEST_ERROR', source: 'customer', step: 'payment_authorization', weight: 5 },
  { reason: 'vpa_not_found', code: 'BAD_REQUEST_ERROR', source: 'customer', step: 'payment_authorization', weight: 4 },
  { reason: 'gateway_error', code: 'SERVER_ERROR', source: 'gateway', step: 'payment_authorization', weight: 4 },
  { reason: 'session_expired', code: 'CUSTOMER_ERROR', source: 'customer', step: 'payment_initiation', weight: 3 },
  { reason: 'price_friction', code: 'CUSTOMER_ERROR', source: 'customer', step: 'payment_initiation', weight: 3 }
];

function sampleWeighted(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    if (random < item.weight) return item;
    random -= item.weight;
  }
  return items[0];
}

/**
 * Generates synthetic transaction context matching real India stats.
 */
export function generateSyntheticTransaction(index = 0) {
  // Method distribution: UPI 65%, Card 22%, Netbanking 9%, Wallet 4%
  const methodRand = Math.random();
  let method = 'upi';
  if (methodRand < 0.65) method = 'upi';
  else if (methodRand < 0.87) method = 'card';
  else if (methodRand < 0.96) method = 'netbanking';
  else method = 'wallet';

  // Amount distribution: ₹100 - ₹22,000 (weighted towards ₹500 - ₹4,500)
  let amount = 500;
  const amountRand = Math.random();
  if (amountRand < 0.50) {
    amount = Math.floor(250 + Math.random() * 1500);
  } else if (amountRand < 0.82) {
    amount = Math.floor(1800 + Math.random() * 6500);
  } else if (amountRand < 0.94) {
    amount = Math.floor(8500 + Math.random() * 7000);
  } else {
    // High-value e-mandate boundary test cases
    amount = Math.floor(15500 + Math.random() * 9500);
  }

  // Device distribution: mobile_web 68%, app 22%, desktop 10%
  const deviceRand = Math.random();
  let device = 'mobile_web';
  if (deviceRand < 0.68) device = 'mobile_web';
  else if (deviceRand < 0.90) device = 'app';
  else device = 'desktop';

  // Time of day (simulation spreads over hours with 35% concentration in 19:00 - 22:00 peak)
  let hour = Math.floor(Math.random() * 24);
  if (Math.random() < 0.35) {
    hour = 19 + Math.floor(Math.random() * 4); // Peak 19, 20, 21, 22
  }
  const minute = String(Math.floor(Math.random() * 60)).padStart(2, '0');
  const timeOfDay = `${String(hour).padStart(2, '0')}:${minute}`;

  // Transaction type (18% recurring subscriptions)
  const isRecurring = Math.random() < 0.18 || amount > 15000;
  const transactionType = isRecurring ? 'recurring' : 'one-off';

  const customerName = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];
  const customerId = `cust_sim_${index}_${Math.random().toString(36).substring(2, 7)}`;

  // Sample failure details for synthetic failure injection
  const failureProfile = sampleWeighted(FAILURE_SCENARIO_PROBS);

  return {
    customerId,
    customerName,
    amount,
    currency: 'INR',
    method,
    device,
    timeOfDay,
    transactionType,
    isRealRazorpayCall: false,
    failureProfile
  };
}

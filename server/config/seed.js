import { Customer } from '../models/Customer.js';
import { RiskRule } from '../models/RiskRule.js';
import { BanditState } from '../models/BanditState.js';
import { DEFAULT_DECISION_TABLE } from '../layer2-recover/decisionTable.js';

export const SEED_CUSTOMERS = [
  {
    customerId: 'cust_001_arjun',
    name: 'Arjun Sharma',
    email: 'arjun.sharma@example.com',
    contact: '+919876543210',
    segment: 'vip',
    methodHistory: [
      { method: 'upi', successRate: 0.94, totalAttempts: 50, successfulAttempts: 47 },
      { method: 'card', successRate: 0.88, totalAttempts: 25, successfulAttempts: 22 },
      { method: 'netbanking', successRate: 0.70, totalAttempts: 10, successfulAttempts: 7 }
    ],
    cardTokens: [
      { tokenId: 'tok_visa_0000', last4: '0000', network: 'Visa', expiryMonth: 12, expiryYear: 2028 },
      { tokenId: 'tok_mc_1006', last4: '1006', network: 'MasterCard', expiryMonth: 10, expiryYear: 2026 }
    ]
  },

  {
    customerId: 'cust_002_priya',
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    contact: '+919823456789',
    segment: 'regular',
    methodHistory: [
      { method: 'upi', successRate: 0.96, totalAttempts: 80, successfulAttempts: 77 },
      { method: 'card', successRate: 0.65, totalAttempts: 20, successfulAttempts: 13 }
    ],
    cardTokens: [
      { tokenId: 'tok_visa_1111', last4: '1111', network: 'Visa', expiryMonth: 2, expiryYear: 2026 } // Expiring soon!
    ]
  },
  {
    customerId: 'cust_003_rohit',
    name: 'Rohit Verma',
    email: 'rohit.verma@example.com',
    contact: '+919811223344',
    segment: 'price_sensitive',
    methodHistory: [
      { method: 'upi', successRate: 0.75, totalAttempts: 32, successfulAttempts: 24 },
      { method: 'netbanking', successRate: 0.60, totalAttempts: 15, successfulAttempts: 9 }
    ],
    cardTokens: []
  },
  {
    customerId: 'cust_004_ananya',
    name: 'Ananya Iyer',
    email: 'ananya.iyer@example.com',
    contact: '+919833445566',
    segment: 'regular',
    methodHistory: [
      { method: 'card', successRate: 0.92, totalAttempts: 40, successfulAttempts: 37 },
      { method: 'upi', successRate: 0.85, totalAttempts: 20, successfulAttempts: 17 }
    ],
    cardTokens: [
      { tokenId: 'tok_rupay_8888', last4: '8888', network: 'RuPay', expiryMonth: 8, expiryYear: 2029 }
    ]
  },
  {
    customerId: 'cust_005_vikram',
    name: 'Vikram Malhotra',
    email: 'vikram.m@example.com',
    contact: '+919844556677',
    segment: 'high_risk',
    methodHistory: [
      { method: 'card', successRate: 0.50, totalAttempts: 12, successfulAttempts: 6 },
      { method: 'upi', successRate: 0.62, totalAttempts: 16, successfulAttempts: 10 }
    ],
    cardTokens: []
  }
];

export const INITIAL_RISK_RULES = [
  {
    ruleName: 'RBI E-Mandate ₹15,000 AFA Rule',
    ruleType: 'regulatory',
    condition: { transactionType: 'recurring', amountThreshold: 15000 },
    action: 'PRECOLLECT_AFA',
    source: 'cold-start',
    supportingSampleSize: 1000,
    winRateDelta: 0.45,
    description: "RBI's Digital Payments E-mandate Framework requires fresh OTP/AFA for recurring debits above ₹15,000.",
    active: true
  },
  {
    ruleName: 'Peak-Hour Bank Load Shifting (19:00 - 22:00)',
    ruleType: 'peak_hours',
    condition: { timeRange: ['19:00', '22:00'], bankLoadMultiplier: 1.4 },
    action: 'TIME_AWARE_ROUTE',
    source: 'cold-start',
    supportingSampleSize: 500,
    winRateDelta: 0.18,
    description: 'Multiple issuing banks experience peak volume from 7-10 PM; shifts traffic to lower-congestion routes.',
    active: true
  },
  {
    ruleName: 'Stored Card Expiry Proactive Nudge',
    ruleType: 'card_expiry',
    condition: { cardExpiryWithinMonths: 1 },
    action: 'CARD_EXPIRY_NUDGE',
    source: 'cold-start',
    supportingSampleSize: 250,
    winRateDelta: 0.35,
    description: 'Proactively alerts customer when stored subscription card is within 30 days of expiration.',
    active: true
  },
  {
    ruleName: 'High Value First Time Mobile Web Flow',
    ruleType: 'high_value_device',
    condition: { amountThreshold: 20000, device: 'mobile_web', customerSegment: 'new' },
    action: 'STEP_UP_VERIFY',
    source: 'cold-start',
    supportingSampleSize: 150,
    winRateDelta: 0.22,
    description: 'Offers lightweight step-up authentication on high-value mobile web transactions to prevent fraud false-positives.',
    active: true
  },
  {
    ruleName: 'High Friction Network Timeout Extension',
    ruleType: 'timeout_extension',
    condition: { device: 'mobile_web', networkRisk: 'slow' },
    action: 'EXTEND_SESSION',
    source: 'cold-start',
    supportingSampleSize: 400,
    winRateDelta: 0.15,
    description: 'Extends checkout validity from 3 minutes to 6 minutes for mobile web shoppers.',
    active: true
  }
];

export async function seedDatabase() {
  try {
    // Seed Customers
    const customerCount = await Customer.countDocuments();
    if (customerCount === 0) {
      console.log('Seeding initial customers...');
      await Customer.insertMany(SEED_CUSTOMERS);
      console.log(`Seeded ${SEED_CUSTOMERS.length} customers.`);
    }

    // Seed Risk Rules
    const ruleCount = await RiskRule.countDocuments();
    if (ruleCount === 0) {
      console.log('Seeding initial risk rules...');
      await RiskRule.insertMany(INITIAL_RISK_RULES);
      console.log(`Seeded ${INITIAL_RISK_RULES.length} initial risk rules.`);
    }

    // Seed Bandit Initial State if empty
    const banditCount = await BanditState.countDocuments();
    if (banditCount === 0) {
      console.log('Seeding initial cold-start bandit states...');
      const banditSeeds = [];
      const methods = ['upi', 'card', 'netbanking', 'wallet', 'subscription'];
      const tiers = ['tier_low', 'tier_mid', 'tier_high'];
      const times = ['peak', 'off_peak'];

      for (const [category, meta] of Object.entries(DEFAULT_DECISION_TABLE)) {
        for (const tier of tiers) {
          for (const method of methods) {
            for (const time of times) {
              const contextBucket = `${tier}|${method}|${time}`;
              banditSeeds.push({
                category,
                contextBucket,
                action: meta.defaultAction,
                attempts: 10,
                successes: 7,
                winRate: 0.70,
                frictionCost: meta.frictionCost || 1
              });
            }
          }
        }
      }
      await BanditState.insertMany(banditSeeds);
      console.log(`Seeded ${banditSeeds.length} cold-start bandit states.`);
    }
  } catch (err) {
    console.error('Error during database seeding:', err);
  }
}

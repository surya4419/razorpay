import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  customerId: { type: String, required: true },
  customerName: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  method: { 
    type: String, 
    enum: ['card', 'upi', 'netbanking', 'wallet', 'subscription', 'other'], 
    default: 'upi' 
  },
  timeOfDay: { type: String, default: '14:30' },
  device: { 
    type: String, 
    enum: ['mobile_web', 'app', 'desktop'], 
    default: 'mobile_web' 
  },
  transactionType: { 
    type: String, 
    enum: ['one-off', 'recurring'], 
    default: 'one-off' 
  },
  isRealRazorpayCall: { type: Boolean, default: false },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  runId: { type: String }, // For grouping batch simulations

  layer1: {
    riskScore: { type: Number },
    tier: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'] },
    action: { type: String },
    reasoning: { type: String },
    details: { type: mongoose.Schema.Types.Mixed }
  },

  outcome: {
    status: { type: String, enum: ['success', 'failed', 'abandoned', 'pending', 'ambiguous'], default: 'pending' },
    errorReason: { type: String },
    errorCode: { type: String },
    errorSource: { type: String },
    errorStep: { type: String },
    timestamp: { type: Date, default: Date.now }
  },

  // Reconciliation tracking for STUCK_AMBIGUOUS_TRANSACTION scenario
  initiatedAt: { type: Date },
  webhookReceivedAt: { type: Date },
  reconciliationLog: [{ type: mongoose.Schema.Types.Mixed }],

  layer2: {
    category: { type: String },
    actionTaken: { type: String },
    reasoning: { type: String },
    razorpayPaymentLinkId: { type: String },
    paymentLinkUrl: { type: String },
    restraint: { type: Boolean, default: false },
    restraintReason: { type: String },
    attemptsSoFar: { type: Number, default: 0 }
  },

  finalOutcome: {
    recovered: { type: Boolean, default: false },
    amountRecovered: { type: Number, default: 0 },
    timestamp: { type: Date }
  }
}, {
  timestamps: true
});

// Index for dashboard querying and audit drill-down
TransactionSchema.index({ createdAt: -1 });
TransactionSchema.index({ isRealRazorpayCall: 1, createdAt: -1 });
TransactionSchema.index({ runId: 1 });
TransactionSchema.index({ 'outcome.status': 1 });
TransactionSchema.index({ 'layer2.category': 1 });

export const Transaction = mongoose.model('Transaction', TransactionSchema);

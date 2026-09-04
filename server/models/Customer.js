import mongoose from 'mongoose';

const MethodHistorySchema = new mongoose.Schema({
  method: { type: String, required: true },
  successRate: { type: Number, required: true, default: 0.8 },
  totalAttempts: { type: Number, default: 0 },
  successfulAttempts: { type: Number, default: 0 }
}, { _id: false });

const CardTokenSchema = new mongoose.Schema({
  tokenId: { type: String, required: true },
  last4: { type: String, default: '1111' },
  network: { type: String, default: 'Visa' },
  expiryMonth: { type: Number, required: true },
  expiryYear: { type: Number, required: true }
}, { _id: false });

const CustomerSchema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  contact: { type: String, default: '+919876543210' },
  segment: { 
    type: String, 
    enum: ['vip', 'regular', 'new', 'high_risk', 'price_sensitive'], 
    default: 'regular' 
  },
  methodHistory: [MethodHistorySchema],
  cardTokens: [CardTokenSchema]
}, {
  timestamps: true
});

export const Customer = mongoose.model('Customer', CustomerSchema);

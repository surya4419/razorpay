import mongoose from 'mongoose';

const BanditStateSchema = new mongoose.Schema({
  category: { type: String, required: true },
  contextBucket: { type: String, required: true }, // e.g. "tier_mid|upi|peak"
  action: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  successes: { type: Number, default: 0 },
  winRate: { type: Number, default: 0 }, // successes / attempts
  frictionCost: { type: Number, default: 1 },
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

BanditStateSchema.index({ category: 1, contextBucket: 1, action: 1 }, { unique: true });
BanditStateSchema.index({ category: 1, winRate: -1 });

export const BanditState = mongoose.model('BanditState', BanditStateSchema);

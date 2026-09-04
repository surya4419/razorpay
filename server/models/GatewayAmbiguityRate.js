import mongoose from 'mongoose';

/**
 * Tracks per-gateway, per-time-of-day rate of STUCK_AMBIGUOUS_TRANSACTION outcomes.
 * Fed back to Layer 1 routing as a negative signal per spec 2.6.
 */
const GatewayAmbiguityRateSchema = new mongoose.Schema({
  gateway: { type: String, required: true },       // e.g. 'razorpay', 'payu', 'ccavenue'
  timeBucket: { type: String, required: true },    // 'peak' | 'off_peak'
  attempts: { type: Number, default: 0 },
  ambiguousCount: { type: Number, default: 0 },
  ambiguityRate: { type: Number, default: 0 },     // ambiguousCount / attempts
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

GatewayAmbiguityRateSchema.index({ gateway: 1, timeBucket: 1 }, { unique: true });

export const GatewayAmbiguityRate = mongoose.model('GatewayAmbiguityRate', GatewayAmbiguityRateSchema);

import mongoose from 'mongoose';

const RazorpayEventSchema = new mongoose.Schema({
  eventType: { type: String, required: true },
  eventId: { type: String, unique: true, sparse: true }, // For deduplication
  source: { type: String, enum: ['webhook', 'fetch_api', 'checkout_client'], default: 'fetch_api' },
  rawPayload: { type: mongoose.Schema.Types.Mixed, required: true },
  receivedAt: { type: Date, default: Date.now },
  processed: { type: Boolean, default: false }
}, {
  timestamps: true
});

RazorpayEventSchema.index({ eventId: 1 });
RazorpayEventSchema.index({ receivedAt: -1 });

export const RazorpayEvent = mongoose.model('RazorpayEvent', RazorpayEventSchema);

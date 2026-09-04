import mongoose from 'mongoose';

const AuditLogEntrySchema = new mongoose.Schema({
  transactionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Transaction', 
    required: true 
  },
  layer: { 
    type: Number, 
    enum: [1, 2, 3], 
    required: true 
  },
  decision: { type: String, required: true },
  reasoning: { type: String, required: true },
  rawRazorpayPayload: { type: mongoose.Schema.Types.Mixed }, // populated for real events & detailed fetch responses
  metadata: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

AuditLogEntrySchema.index({ transactionId: 1, layer: 1 });
AuditLogEntrySchema.index({ timestamp: -1 });

export const AuditLogEntry = mongoose.model('AuditLogEntry', AuditLogEntrySchema);

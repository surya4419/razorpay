import mongoose from 'mongoose';

const RiskRuleSchema = new mongoose.Schema({
  ruleName: { type: String, required: true },
  ruleType: { type: String, required: true }, // 'regulatory', 'peak_hours', 'route_preference', 'card_expiry', 'high_value_device'
  condition: { type: mongoose.Schema.Types.Mixed, required: true },
  action: { type: String, required: true },
  source: { 
    type: String, 
    enum: ['cold-start', 'learned'], 
    default: 'cold-start' 
  },
  supportingSampleSize: { type: Number, default: 0 },
  winRateDelta: { type: Number, default: 0 },
  description: { type: String },
  active: { type: Boolean, default: true },
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

RiskRuleSchema.index({ ruleType: 1, active: 1 });

export const RiskRule = mongoose.model('RiskRule', RiskRuleSchema);

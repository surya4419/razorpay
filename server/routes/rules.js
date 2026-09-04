import express from 'express';
import { RiskRule } from '../models/RiskRule.js';

const router = express.Router();

// Get all Layer 1 Risk Rules
router.get('/', async (req, res) => {
  try {
    const rules = await RiskRule.find().sort({ source: 1, lastUpdated: -1 }).lean();
    const learnedCount = rules.filter(r => r.source === 'learned').length;
    const coldStartCount = rules.filter(r => r.source === 'cold-start').length;

    res.json({
      rules,
      total: rules.length,
      learnedCount,
      coldStartCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

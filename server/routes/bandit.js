import express from 'express';
import { BanditState } from '../models/BanditState.js';
import { DEFAULT_DECISION_TABLE } from '../layer2-recover/decisionTable.js';

const router = express.Router();

// Get Bandit State matrix and highest-performing strategies
router.get('/state', async (req, res) => {
  try {
    const states = await BanditState.find().sort({ winRate: -1, attempts: -1 }).lean();

    // Top diverging strategies vs cold-start default
    const divergences = [];
    for (const [category, meta] of Object.entries(DEFAULT_DECISION_TABLE)) {
      const catStates = states.filter(s => s.category === category);
      const defaultState = catStates.find(s => s.action === meta.defaultAction);
      const defaultRate = defaultState ? defaultState.winRate : 0.55;

      const nonDefaults = catStates.filter(s => s.action !== meta.defaultAction && s.attempts >= 2);
      for (const nd of nonDefaults) {
        if (nd.winRate > defaultRate) {
          divergences.push({
            category,
            categoryName: meta.name,
            contextBucket: nd.contextBucket,
            learnedAction: nd.action,
            defaultAction: meta.defaultAction,
            learnedWinRate: Number((nd.winRate * 100).toFixed(1)),
            defaultWinRate: Number((defaultRate * 100).toFixed(1)),
            winRateDelta: Number(((nd.winRate - defaultRate) * 100).toFixed(1)),
            attempts: nd.attempts
          });
        }
      }
    }

    divergences.sort((a, b) => b.winRateDelta - a.winRateDelta);

    res.json({
      states,
      totalStates: states.length,
      divergences: divergences.slice(0, 10),
      categories: DEFAULT_DECISION_TABLE
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

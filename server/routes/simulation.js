import express from 'express';
import { runBatchSimulation, getSimulationStatus } from '../simulation/batchRunner.js';

const router = express.Router();

router.post('/run', async (req, res) => {
  try {
    const { batchSize = 100, speedMs = 60, scenarioMix = 'standard' } = req.body;
    const result = await runBatchSimulation({
      batchSize: Number(batchSize),
      speedMs: Number(speedMs),
      scenarioMix
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/status', (req, res) => {
  res.json(getSimulationStatus());
});

router.get('/status/:runId', (req, res) => {
  const status = getSimulationStatus();
  res.json(status);
});

export default router;

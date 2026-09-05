import express from 'express';
import { Transaction } from '../models/Transaction.js';

const router = express.Router();

// 1. Headline Metrics Summary
router.get('/summary', async (req, res) => {
  try {
    const transactions = await Transaction.find().lean();

    let totalAtRisk = 0;
    let totalPrevented = 0;
    let totalRecovered = 0;
    let restraintCount = 0;
    let realCount = 0;
    let simulatedCount = 0;

    for (const t of transactions) {
      if (t.isRealRazorpayCall) {
        realCount++;
      } else {
        simulatedCount++;
      }

      totalAtRisk += t.amount;

      // Layer 1 Prevention — only count genuine Layer 1 interventions
      if (t.outcome?.status === 'success' && t.layer1?.action && t.layer1.action !== 'PROCEED_NORMAL') {
        totalPrevented += t.amount;
      }

      // Layer 2 Recovery — failed payment subsequently recovered (including silent reconciliation)
      if (t.finalOutcome?.recovered && t.outcome?.status !== 'success') {
        totalRecovered += (t.finalOutcome.amountRecovered || t.amount);
      }
      // Silent recovery: outcome was flipped to success but layer2 ran and recovered
      if (t.finalOutcome?.recovered && t.outcome?.status === 'success' && t.layer2?.category) {
        totalRecovered += (t.finalOutcome.amountRecovered || t.amount);
      }

      // Restraint count
      if (t.layer2?.restraint) {
        restraintCount++;
      }
    }

    const totalSaved = totalPrevented + totalRecovered;
    const savedPercentage = totalAtRisk > 0 ? (totalSaved / totalAtRisk) * 100 : 0;

    // Naive baseline: 36% applied only to transactions that actually failed
    const failedAtRisk = transactions
      .filter(t => t.outcome?.status === 'failed')
      .reduce((s, t) => s + t.amount, 0);
    const naiveBaselineRecovered = Math.round(failedAtRisk * 0.36);
    const naivePercentage = totalAtRisk > 0 ? (naiveBaselineRecovered / totalAtRisk) * 100 : 36.0;
    const liftPercentage = savedPercentage - naivePercentage;

    res.json({
      totalTransactions: transactions.length,
      totalAtRisk,
      totalPrevented,
      totalRecovered,
      totalSaved,
      savedPercentage: Number(savedPercentage.toFixed(1)),
      naiveBaselineRecovered,
      naivePercentage: Number(naivePercentage.toFixed(1)),
      liftPercentage: Number(liftPercentage.toFixed(1)),
      restraintCount,
      realCount,
      simulatedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Learning Curve Time-Series (Cumulative Recovery Rate Rising)
router.get('/learning-curve', async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .sort({ createdAt: 1 })
      .select('amount outcome finalOutcome layer1 layer2 isRealRazorpayCall createdAt')
      .lean();

    if (transactions.length === 0) {
      return res.json({ points: [] });
    }

    const points = [];
    let cumulativeSaved = 0;
    let cumulativeAtRisk = 0;
    let cumulativeNaive = 0;

    const step = Math.max(1, Math.floor(transactions.length / 30));

    transactions.forEach((t, idx) => {
      cumulativeAtRisk += t.amount;

      // Unified save: L1 prevention OR L2 recovery (including silent reconciliation)
      const isL1Prevented = t.outcome?.status === 'success'
        && t.layer1?.action
        && t.layer1.action !== 'PROCEED_NORMAL'
        && !t.layer2?.category; // not a silent recovery

      const isL2Recovered = t.finalOutcome?.recovered
        && t.layer2?.category; // has layer2 classification = genuine recovery

      if (isL1Prevented || isL2Recovered) {
        cumulativeSaved += t.amount;
      }

      // Naive baseline: 36% of genuinely failed transactions only
      const isFailed = t.outcome?.status === 'failed';
      if (isFailed) {
        cumulativeNaive += t.amount * 0.36;
      }

      if ((idx + 1) % step === 0 || idx === transactions.length - 1) {
        const recoveryRate = cumulativeAtRisk > 0
          ? (cumulativeSaved / cumulativeAtRisk) * 100
          : 0;

        const naiveRate = cumulativeAtRisk > 0
          ? (cumulativeNaive / cumulativeAtRisk) * 100
          : 0;

        points.push({
          sequence: idx + 1,
          recoveryRate: Number(recoveryRate.toFixed(1)),
          naiveRate: Number(Math.max(naiveRate, 0).toFixed(1)),
          totalSaved: cumulativeSaved,
          totalAtRisk: cumulativeAtRisk
        });
      }
    });

    res.json({ points, totalProcessed: transactions.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Restraint Log
router.get('/restraint-log', async (req, res) => {
  try {
    const restraintCases = await Transaction.find({ 'layer2.restraint': true })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      count: restraintCases.length,
      cases: restraintCases
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

import express from 'express';
import { Transaction } from '../models/Transaction.js';
import { AuditLogEntry } from '../models/AuditLogEntry.js';

const router = express.Router();

// List transactions with filtering
router.get('/', async (req, res) => {
  try {
    const {
      isRealRazorpayCall,
      status,
      category,
      runId,
      search,
      limit = 100,
      page = 1
    } = req.query;

    const query = {};

    if (isRealRazorpayCall !== undefined && isRealRazorpayCall !== '') {
      query.isRealRazorpayCall = isRealRazorpayCall === 'true';
    }

    if (status) {
      if (status === 'prevented') {
        query['outcome.status'] = 'success';
        query['layer1.action'] = { $ne: 'PROCEED_NORMAL' };
      } else if (status === 'recovered') {
        query['finalOutcome.recovered'] = true;
      } else if (status === 'failed' || status === 'lost') {
        query['outcome.status'] = 'failed';
        query['finalOutcome.recovered'] = false;
      }
    }

    if (category) {
      query['layer2.category'] = category;
    }

    if (runId) {
      query.runId = runId;
    }

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
        { razorpayOrderId: { $regex: search, $options: 'i' } },
        { 'layer2.razorpayPaymentLinkId': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Transaction.countDocuments(query)
    ]);

    res.json({
      transactions,
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single transaction details
router.get('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const auditLogs = await AuditLogEntry.find({ transactionId: transaction._id }).sort({ layer: 1, timestamp: 1 });

    res.json({
      transaction,
      auditLogs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Audit log for transaction
router.get('/audit-log/:transactionId', async (req, res) => {
  try {
    const logs = await AuditLogEntry.find({ transactionId: req.params.transactionId }).sort({ layer: 1, timestamp: 1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update transaction status (single source of truth in DB)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status = 'failed', errorReason, errorCode, errorDescription } = req.body;
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    transaction.outcome = {
      ...(transaction.outcome || {}),
      status: status || 'failed',
      errorCode: errorCode || transaction.outcome?.errorCode,
      errorReason: errorReason || transaction.outcome?.errorReason,
      errorDescription: errorDescription || transaction.outcome?.errorDescription,
      timestamp: new Date()
    };
    if (status === 'failed') {
      transaction.finalOutcome = {
        recovered: false,
        amountRecovered: 0,
        timestamp: new Date()
      };
    }
    await transaction.save();

    await AuditLogEntry.create({
      transactionId: transaction._id,
      layer: 2,
      decision: status === 'failed' ? 'PAYMENT_FAILED_DISMISSED' : 'STATUS_UPDATED',
      reasoning: `Transaction marked as ${status} (persisted to DB)`
    });

    res.json({ success: true, transaction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;


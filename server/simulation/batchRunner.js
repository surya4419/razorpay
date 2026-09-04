import { generateSyntheticTransaction } from './dataGenerator.js';
import { pickPreventionAction } from '../layer1-predict/actionPicker.js';
import { classifyError } from '../layer2-recover/classifier.js';
import { evaluateRestraintGate } from '../layer2-recover/restraintGate.js';
import { getContextBucket, selectRecoveryAction, updateBanditOutcome } from '../layer3-learn/bandit.js';
import { scanAndUpdateRules } from '../layer3-learn/ruleUpdater.js';
import { Transaction } from '../models/Transaction.js';
import { AuditLogEntry } from '../models/AuditLogEntry.js';
import { broadcastEvent } from '../sockets/index.js';

let activeSimulation = null;

/**
 * Runs a synthetic batch simulation.
 */
export async function runBatchSimulation({
  batchSize = 100,
  speedMs = 80, // Delay between transactions in ms
  scenarioMix = 'standard',
  runId = `run_${Date.now()}`
}) {
  if (activeSimulation && activeSimulation.isRunning) {
    throw new Error('A batch simulation is already running.');
  }

  activeSimulation = {
    runId,
    batchSize,
    processed: 0,
    isRunning: true,
    stats: {
      totalAtRisk: 0,
      totalPrevented: 0,
      totalRecovered: 0,
      restraintCount: 0,
      naiveBaselineRecovered: 0
    }
  };

  // Run asynchronously in background without blocking response
  (async () => {
    try {
      console.log(`[Simulation] Starting batch run ${runId} with ${batchSize} transactions...`);
      broadcastEvent('simulation:started', { runId, batchSize });

      for (let i = 0; i < batchSize; i++) {
        if (!activeSimulation.isRunning) break;

        const synthetic = generateSyntheticTransaction(i + 1);
        const { failureProfile } = synthetic;

        // --- LAYER 1: Predict & Prevent ---
        const layer1Decision = pickPreventionAction({
          amount: synthetic.amount,
          method: synthetic.method,
          timeOfDay: synthetic.timeOfDay,
          device: synthetic.device,
          transactionType: synthetic.transactionType
        });

        // Prevention calculation: realistic Layer 1 prevention rates
        let isPrevented = false;
        if (layer1Decision.action === 'PRECOLLECT_AFA' && synthetic.transactionType === 'recurring' && synthetic.amount > 15000) {
          isPrevented = true; // Deterministic — RBI AFA always saves this
        } else if (layer1Decision.action === 'REORDER_METHODS' && Math.random() < 0.20) {
          isPrevented = true;
        } else if (layer1Decision.action === 'TIME_AWARE_ROUTE' && Math.random() < 0.16) {
          isPrevented = true;
        } else if (layer1Decision.action === 'EXTEND_SESSION' && Math.random() < 0.14) {
          isPrevented = true;
        }

        const transaction = new Transaction({
          customerId: synthetic.customerId,
          customerName: synthetic.customerName,
          amount: synthetic.amount,
          currency: 'INR',
          method: synthetic.method,
          timeOfDay: synthetic.timeOfDay,
          device: synthetic.device,
          transactionType: synthetic.transactionType,
          isRealRazorpayCall: false,
          runId,
          layer1: layer1Decision
        });

        activeSimulation.stats.totalAtRisk += synthetic.amount;

        // If prevented at Layer 1
        if (isPrevented) {
          transaction.outcome = { status: 'success', timestamp: new Date() };
          transaction.finalOutcome = {
            prevented: true,       // Layer 1 prevention — NOT counted as Layer 2 recovery
            recovered: false,
            amountRecovered: synthetic.amount,
            timestamp: new Date()
          };
          activeSimulation.stats.totalPrevented += synthetic.amount;

          await transaction.save();

          await AuditLogEntry.create({
            transactionId: transaction._id,
            layer: 1,
            decision: layer1Decision.action,
            reasoning: `Layer 1 Prevention Successful: ${layer1Decision.reasoning}`
          });

          broadcastEvent('transaction:started', {
            transactionId: transaction._id,
            amount: synthetic.amount,
            isRealRazorpayCall: false,
            runId,
            layer1: layer1Decision,
            status: 'prevented'
          });
        } else {
          // Failure occurred -> Flows to Layer 2 Diagnose & Recover
          transaction.outcome = {
            status: 'failed',
            errorCode: failureProfile.code,
            errorReason: failureProfile.reason,
            errorSource: failureProfile.source,
            errorStep: failureProfile.step,
            timestamp: new Date()
          };

          // --- LAYER 2: Shared Classifier ---
          const errorPayload = {
            error_code: failureProfile.code,
            error_reason: failureProfile.reason,
            error_source: failureProfile.source,
            error_step: failureProfile.step,
            error_description: `Simulation failure: ${failureProfile.reason}`
          };

          const classification = classifyError(errorPayload, {
            amount: synthetic.amount,
            method: synthetic.method,
            transactionType: synthetic.transactionType
          });

          // --- LAYER 3: Contextual Bandit Action Selection ---
          const contextBucket = getContextBucket({
            amount: synthetic.amount,
            method: synthetic.method,
            timeOfDay: synthetic.timeOfDay
          });

          const banditDecision = await selectRecoveryAction({
            category: classification.category,
            contextBucket
          });

          // --- LAYER 2: Restraint Gate Evaluation ---
          const restraintResult = evaluateRestraintGate({
            category: classification.category,
            attemptsSoFar: 0,
            amount: synthetic.amount,
            banditWinRate: banditDecision.winRate,
            proposedAction: banditDecision.action
          });

          if (restraintResult.restraint) {
            activeSimulation.stats.restraintCount += 1;
          }

          // Compute recovery success probability — realistic L2 recovery rates
          let recovered = false;
          if (restraintResult.allowed) {
            const baseRecoveryChance = classification.category.startsWith('HARD_') ? 0.15 : 0.42;
            const actionBonus = banditDecision.action.includes('PAYMENT_LINK') ? 0.07 : 0.02;
            recovered = Math.random() < Math.min(0.52, baseRecoveryChance + actionBonus);
          }

          // Naive baseline benchmark (fixed retry everything blindly: ~38% success)
          const naiveRecovered = classification.category.startsWith('HARD_') ? false : (Math.random() < 0.38);
          if (naiveRecovered) {
            activeSimulation.stats.naiveBaselineRecovered += synthetic.amount;
          }

          const mockLinkId = `plink_sim_${Math.random().toString(36).substring(2, 9)}`;

          transaction.layer2 = {
            category: classification.category,
            actionTaken: restraintResult.action,
            reasoning: `${classification.reasoning} | ${banditDecision.reasoning} | ${restraintResult.reason}`,
            razorpayPaymentLinkId: mockLinkId,
            paymentLinkUrl: `https://rzp.io/i/${mockLinkId}`,
            restraint: restraintResult.restraint,
            restraintReason: restraintResult.restraint ? restraintResult.reason : null,
            attemptsSoFar: restraintResult.allowed ? 1 : 0
          };

          transaction.finalOutcome = {
            recovered,
            amountRecovered: recovered ? synthetic.amount : 0,
            timestamp: new Date()
          };

          if (recovered) {
            activeSimulation.stats.totalRecovered += synthetic.amount;
          }

          await transaction.save();

          // Write Layer 2 Audit Log Entry
          await AuditLogEntry.create({
            transactionId: transaction._id,
            layer: 2,
            decision: restraintResult.action,
            reasoning: `${classification.reasoning} -> Action: ${restraintResult.action}`
          });

          // --- LAYER 3: Bandit Win-Rate Update ---
          if (restraintResult.allowed) {
            const updatedBandit = await updateBanditOutcome({
              category: classification.category,
              contextBucket,
              action: banditDecision.action,
              recovered
            });

            broadcastEvent('bandit:update', {
              category: classification.category,
              contextBucket,
              action: banditDecision.action,
              winRate: updatedBandit.winRate,
              attempts: updatedBandit.attempts,
              successes: updatedBandit.successes
            });
          }

          broadcastEvent('transaction:started', {
            transactionId: transaction._id,
            amount: synthetic.amount,
            isRealRazorpayCall: false,
            runId,
            layer1: layer1Decision,
            layer2: transaction.layer2,
            recovered,
            status: recovered ? 'recovered' : (restraintResult.restraint ? 'restrained' : 'lost')
          });
        }

        activeSimulation.processed = i + 1;

        // Periodic Rule Updater trigger (every 50 transactions)
        if ((i + 1) % 50 === 0) {
          const ruleUpdates = await scanAndUpdateRules();
          if (ruleUpdates.length > 0) {
            broadcastEvent('rules:updated', { count: ruleUpdates.length, rules: ruleUpdates });
          }
        }

        // Progress broadcast
        broadcastEvent('simulation:progress', {
          runId,
          processed: activeSimulation.processed,
          total: batchSize,
          percent: Math.round(((i + 1) / batchSize) * 100),
          stats: activeSimulation.stats
        });

        if (speedMs > 0) {
          await new Promise(res => setTimeout(res, speedMs));
        }
      }

      activeSimulation.isRunning = false;
      console.log(`[Simulation] Completed batch run ${runId}.`);
      broadcastEvent('simulation:completed', {
        runId,
        stats: activeSimulation.stats
      });
    } catch (simErr) {
      console.error('[Simulation] Batch runner error:', simErr);
      activeSimulation.isRunning = false;
    }
  })();

  return {
    runId,
    batchSize,
    status: 'started'
  };
}

export function getSimulationStatus() {
  return activeSimulation || { isRunning: false, processed: 0, batchSize: 0 };
}

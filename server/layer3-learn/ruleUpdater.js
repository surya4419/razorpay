import { BanditState } from '../models/BanditState.js';
import { RiskRule } from '../models/RiskRule.js';
import { DEFAULT_DECISION_TABLE } from '../layer2-recover/decisionTable.js';

/**
 * Scans bandit win-rates and dynamically promotes high-performing strategies to RiskRules.
 */
export async function scanAndUpdateRules() {
  const updates = [];
  const categories = Object.keys(DEFAULT_DECISION_TABLE);

  for (const category of categories) {
    const defaultMeta = DEFAULT_DECISION_TABLE[category];
    const defaultAction = defaultMeta.defaultAction;

    // Find all bandit states for this category with minimum sample size
    const states = await BanditState.find({
      category,
      attempts: { $gte: 12 }
    });

    if (states.length === 0) continue;

    // Group by contextBucket
    const bucketMap = {};
    for (const s of states) {
      if (!bucketMap[s.contextBucket]) bucketMap[s.contextBucket] = [];
      bucketMap[s.contextBucket].push(s);
    }

    for (const [bucket, bucketStates] of Object.entries(bucketMap)) {
      const defaultState = bucketStates.find(s => s.action === defaultAction);
      const defaultRate = defaultState ? defaultState.winRate : 0.50;

      // Check if another action significantly outperforms default
      const contenders = bucketStates.filter(s => s.action !== defaultAction);
      for (const contender of contenders) {
        const delta = contender.winRate - defaultRate;
        if (delta >= 0.12 && contender.attempts >= 12) {
          // Promote to learned risk rule
          const ruleName = `Bandit Learned Strategy: ${contender.action} for ${category} [${bucket}]`;
          
          let rule = await RiskRule.findOne({ ruleName });
          if (!rule) {
            rule = new RiskRule({
              ruleName,
              ruleType: 'bandit_promoted',
              condition: { category, contextBucket: bucket },
              action: contender.action,
              source: 'learned',
              supportingSampleSize: contender.attempts,
              winRateDelta: Number(delta.toFixed(3)),
              description: `Learned preference: '${contender.action}' achieved ${(contender.winRate * 100).toFixed(1)}% recovery vs ${(defaultRate * 100).toFixed(1)}% for default across ${contender.attempts} transactions.`,
              active: true,
              lastUpdated: new Date()
            });
          } else {
            rule.supportingSampleSize = contender.attempts;
            rule.winRateDelta = Number(delta.toFixed(3));
            rule.lastUpdated = new Date();
          }

          await rule.save();
          updates.push(rule);
        }
      }
    }
  }

  return updates;
}

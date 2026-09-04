import React from 'react';
import { ScenarioPicker, SCENARIOS } from './ScenarioPicker.jsx';
import { SplitView } from './SplitView.jsx';
import { OutcomeStrip } from './OutcomeStrip.jsx';
import { usePaneStateMachine } from './usePaneStateMachine.js';

/**
 * PlaygroundTab
 * Pure composition/logic component — no design tokens of its own.
 * All styling is delegated to ScenarioPicker, SplitView, and OutcomeStrip,
 * which already follow the shared monochrome design system.
 */
export function PlaygroundTab() {
  const [selectedScenario, setSelectedScenario] = React.useState(SCENARIOS[0]);

  // Independent per-pane state machines (each auto-resets & auto-initializes when selectedScenario changes)
  const withoutMachine = usePaneStateMachine({ scenario: selectedScenario, pane: 'without' });
  const withMachine = usePaneStateMachine({ scenario: selectedScenario, pane: 'with' });

  const handleSelectScenario = (sc) => {
    setSelectedScenario(sc);
  };

  // Derive summary states for OutcomeStrip
  const withoutResult = withoutMachine.state === 'RESOLVED' ? {
    status: withoutMachine.paymentResult?.status === 'success' ? 'success' : 'failed',
    amount: selectedScenario.amount,
    errorReason: withoutMachine.paymentResult?.errorFields?.error_reason
  } : null;

  const withResult = withMachine.state === 'RESOLVED' ? {
    amountSaved: selectedScenario.amount,
    isPrevented: selectedScenario.type === 'prevention',
    isRecovered: withMachine.isPaid || (withMachine.paymentResult?.status === 'success'),
    isSilentRecovery: withMachine.diagnosis?.recoveryExecution?.details?.silentRecovery === true,
    isRestrained: withMachine.diagnosis?.restraintResult?.restraint,
    paymentLinkId: withMachine.recoveryLink?.paymentLinkId,
    paymentLinkUrl: withMachine.recoveryLink?.shortUrl,
    actionTaken: withMachine.diagnosis?.recoveryExecution?.actionTaken,
    isPaid: withMachine.isPaid
  } : null;

  return (
    <div className="space-y-6" style={{ background: '#FBFCFE' }}>
      {/* Scenario Picker */}
      <ScenarioPicker
        selectedScenario={selectedScenario}
        onSelectScenario={handleSelectScenario}
        isRunning={false}
        hideRunButton
      />

      {/* Split view with two independent pane state machines */}
      <SplitView
        scenario={selectedScenario}
        withoutMachine={withoutMachine}
        withMachine={withMachine}
      />

      {/* Outcome Strip */}
      <OutcomeStrip
        withoutSystemResult={withoutResult}
        withSystemResult={withResult}
        onSimulatePaymentLinkPaid={withMachine.actions.simulateLinkPaid}
        isPaying={false}
      />
    </div>
  );
}
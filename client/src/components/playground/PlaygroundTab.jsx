import React from 'react';
import { ScenarioPicker, SCENARIOS } from './ScenarioPicker.jsx';
import { SplitView } from './SplitView.jsx';
import { OutcomeStrip } from './OutcomeStrip.jsx';
import { usePaneStateMachine } from './usePaneStateMachine.js';

export function PlaygroundTab() {
  const [selectedScenario, setSelectedScenario] = React.useState(SCENARIOS[0]);

  const withoutMachine = usePaneStateMachine({ scenario: selectedScenario, pane: 'without' });
  const withMachine    = usePaneStateMachine({ scenario: selectedScenario, pane: 'with' });

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

  // Everything lives directly on the page background (#F7F8FA from App.jsx)
  // Only the two pane cards (inside SplitView) are elevated/floating
  return (
    <div className="space-y-8">
      {/* Scenario picker — borderless, sits on the page background */}
      <ScenarioPicker
        selectedScenario={selectedScenario}
        onSelectScenario={setSelectedScenario}
        isRunning={false}
        hideRunButton
      />

      {/* Two floating pane cards — their own elevation */}
      <div>
        <p className="text-xs font-semibold mb-4" style={{ color: '#8B98AC', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Side-by-side comparison
        </p>
        <SplitView
          scenario={selectedScenario}
          withoutMachine={withoutMachine}
          withMachine={withMachine}
        />
      </div>

      {/* Outcome — only when there's a result */}
      {(withoutResult || withResult) && (
        <div>
          <p className="text-xs font-semibold mb-4" style={{ color: '#8B98AC', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Result
          </p>
          <OutcomeStrip
            withoutSystemResult={withoutResult}
            withSystemResult={withResult}
            onSimulatePaymentLinkPaid={withMachine.actions.simulateLinkPaid}
            isPaying={false}
          />
        </div>
      )}
    </div>
  );
}

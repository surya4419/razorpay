import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../../services/api.js';
import { openRazorpayCheckout } from './RazorpayModal.jsx';

/**
 * PANE STATE MACHINE
 * States: IDLE → CREATED → CHECKOUT_OPEN → AWAITING_RESULT → RESOLVED
 * Every transition requires an explicit user action or a real API callback.
 * No timeouts, no auto-advancing.
 *
 * Single Source of Truth:
 * The `transaction` object stored in the DB (`transaction.outcome.status`).
 * Closing the Razorpay popup will NEVER revert a failed transaction back to "Pay Now".
 */
export function usePaneStateMachine({ scenario, pane }) {
  const [state, setState] = useState('IDLE');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Single Source of Truth: DB transaction record
  const [transaction, setTransaction] = useState(null);

  // Created state data
  const [orderData, setOrderData] = useState(null);        // { order, checkoutConfig, transactionId, ... }
  const [layer1Decision, setLayer1Decision] = useState(null);
  const [timeoutSeconds, setTimeoutSeconds] = useState(180);
  const [timerRunning, setTimerRunning] = useState(false);

  // Checkout open state
  const [checkoutInstance, setCheckoutInstance] = useState(null);

  // Resolved state data
  const [paymentResult, setPaymentResult] = useState(null);  // raw payment outcome
  const [diagnosis, setDiagnosis] = useState(null);          // Layer 2+3 result

  // Recovery link data (right pane only)
  const [recoveryLink, setRecoveryLink] = useState(null);    // { paymentLinkId, shortUrl, amount }
  const [isPaid, setIsPaid] = useState(false);

  // AFA auth link (right pane, scenario 4 only)
  const [afaLink, setAfaLink] = useState(null);
  const [afaComplete, setAfaComplete] = useState(false);

  // Retry order (right pane, scenario 2 only)
  const [retryOrderData, setRetryOrderData] = useState(null);
  const [retryTimerRunning, setRetryTimerRunning] = useState(false);

  // Keep refs to avoid stale closure issues in modal callbacks
  const stateRef = useRef(state);
  const transactionRef = useRef(transaction);
  const orderDataRef = useRef(orderData);
  const isResolvingRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    transactionRef.current = transaction;
  }, [transaction]);

  useEffect(() => {
    orderDataRef.current = orderData;
  }, [orderData]);

  // -------------------------------------------------------------------------
  // Reset to IDLE (clears all previous data cleanly)
  // -------------------------------------------------------------------------
  const reset = useCallback(() => {
    setState('IDLE');
    setError(null);
    setLoading(false);
    setTransaction(null);
    setOrderData(null);
    setLayer1Decision(null);
    setTimeoutSeconds(180);
    setTimerRunning(false);
    setCheckoutInstance(null);
    setPaymentResult(null);
    setDiagnosis(null);
    setRecoveryLink(null);
    setIsPaid(false);
    setAfaLink(null);
    setAfaComplete(false);
    setRetryOrderData(null);
    setRetryTimerRunning(false);
    isResolvingRef.current = false;
  }, []);

  // -------------------------------------------------------------------------
  // STEP 1: Init pane — creates real Razorpay order + Layer 1 evaluation
  // -------------------------------------------------------------------------
  const initPane = useCallback(async (scenarioId) => {
    const targetScenarioId = scenarioId || scenario?.id;
    if (!targetScenarioId) return;

    setLoading(true);
    setError(null);
    // Clear previous data immediately so stale cards never leak into another scenario
    setTransaction(null);
    setOrderData(null);
    setLayer1Decision(null);
    setPaymentResult(null);
    setDiagnosis(null);
    setRecoveryLink(null);
    setIsPaid(false);
    setAfaLink(null);
    setAfaComplete(false);
    setRetryOrderData(null);
    setRetryTimerRunning(false);
    setTimerRunning(false);
    isResolvingRef.current = false;
    setState('IDLE');

    try {
      const res = await api.initPane({ scenario: targetScenarioId, pane });
      setOrderData(res);
      setLayer1Decision(res.layer1Decision);
      setTimeoutSeconds(res.timeoutSeconds || 180);
      // Persist transaction as single source of truth
      const txn = res.transaction || { _id: res.transactionId, outcome: { status: 'pending' } };
      setTransaction(txn);
      transactionRef.current = txn;
      setState('CREATED');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to initialise pane');
    } finally {
      setLoading(false);
    }
  }, [scenario?.id, pane]);

  // Automatically initialise fresh whenever scenario changes
  useEffect(() => {
    if (scenario?.id) {
      initPane(scenario.id);
    }
  }, [scenario?.id, pane]);

  // -------------------------------------------------------------------------
  // Status updater: writes status to DB (single source of truth) & updates state
  // -------------------------------------------------------------------------
  const resolvePayment = useCallback(async ({ paymentId, rawError, status }) => {
    setLoading(true);
    isResolvingRef.current = true;
    try {
      const activeTxnId = orderDataRef.current?.transactionId || transactionRef.current?._id;
      const res = await api.resolvePayment({
        transactionId: activeTxnId,
        paymentId,
        orderId: orderDataRef.current?.order?.id,
        status,
        rawError,
        scenario: scenario.id,
        pane
      });

      // Update single source of truth in state and ref
      if (res.transaction) {
        setTransaction(res.transaction);
        transactionRef.current = res.transaction;
      } else if (activeTxnId) {
        // Fallback update to transaction status
        const updatedTxn = {
          ...(transactionRef.current || {}),
          _id: activeTxnId,
          outcome: {
            status: status || 'failed',
            errorCode: rawError?.error_code,
            errorReason: rawError?.error_reason || scenario.expectedReason,
            errorDescription: rawError?.error_description,
            timestamp: new Date()
          }
        };
        setTransaction(updatedTxn);
        transactionRef.current = updatedTxn;
      }

      setPaymentResult(res);

      if (pane === 'with' && res.recoveryExecution) {
        setDiagnosis(res);
        if (res.recoveryExecution.razorpayPaymentLinkId) {
          setRecoveryLink({
            paymentLinkId: res.recoveryExecution.razorpayPaymentLinkId,
            shortUrl: res.recoveryExecution.paymentLinkUrl,
            amount: orderDataRef.current?.amount || scenario.amount
          });
        }
        // Silent recovery (stuck_ambiguous): already captured — mark paid immediately
        if (res.recoveryExecution.details?.silentRecovery) {
          setIsPaid(true);
        }
      }

      setState('RESOLVED');
    } catch (err) {
      setError(err.message);
      setState('RESOLVED');
    } finally {
      setLoading(false);
      isResolvingRef.current = false;
    }
  }, [scenario.id, scenario.amount, scenario.expectedReason, pane]);

  // -------------------------------------------------------------------------
  // STEP 2a: Pay Now — opens real Razorpay Checkout widget
  // -------------------------------------------------------------------------
  const openCheckout = useCallback(() => {
    if (state !== 'CREATED' || !orderData?.checkoutConfig) return;

    setState('CHECKOUT_OPEN');
    setTimerRunning(true);

    const instance = openRazorpayCheckout({
      config: orderData.checkoutConfig,
      onPaymentSuccess: async (response) => {
        setTimerRunning(false);
        setState('AWAITING_RESULT');
        await resolvePayment({ paymentId: response.razorpay_payment_id, status: 'success' });
      },
      onPaymentFailure: async (response) => {
        setTimerRunning(false);
        setState('AWAITING_RESULT');
        await resolvePayment({
          paymentId: response.error?.metadata?.payment_id,
          rawError: response.error,
          status: 'failed'
        });
      },
      onModalDismiss: async () => {
        setTimerRunning(false);

        // 1. Check if payment is already resolving or already marked as resolved/failed in DB
        const currentTxn = transactionRef.current;
        const isAlreadyFailed = currentTxn?.outcome?.status === 'failed' || stateRef.current === 'RESOLVED';
        const isAlreadySuccess = currentTxn?.outcome?.status === 'success';

        if (isAlreadyFailed || isAlreadySuccess || isResolvingRef.current) {
          // Keep UI in RESOLVED state — DO NOT revert to CREATED!
          setState('RESOLVED');
          return;
        }

        // 2. If the user dismissed the modal before completing, persist the failed
        // status to DB via the same status-update function (resolvePayment).
        setState('AWAITING_RESULT');
        await resolvePayment({
          status: 'failed',
          rawError: {
            error_code: 'BAD_REQUEST_ERROR',
            error_reason: scenario.expectedReason || 'payment_cancelled_by_user',
            error_description: 'Checkout modal closed by user'
          }
        });
      }
    });
    setCheckoutInstance(instance);
  }, [state, orderData, resolvePayment, scenario.expectedReason]);

  // -------------------------------------------------------------------------
  // STEP 2b: Emandate scenario left pane — attempt direct charge (no Checkout)
  // -------------------------------------------------------------------------
  const attemptDirectCharge = useCallback(async () => {
    if (state !== 'CREATED') return;
    setLoading(true);
    setState('AWAITING_RESULT');
    try {
      const res = await api.attemptEmandateCharge();
      setPaymentResult(res);
      // Persist failure to transaction record
      const failedTxn = {
        ...(transactionRef.current || {}),
        outcome: {
          status: 'failed',
          errorCode: res.error?.error_code,
          errorReason: res.error?.error_reason,
          errorDescription: res.error?.error_description,
          timestamp: new Date()
        }
      };
      setTransaction(failedTxn);
      transactionRef.current = failedTxn;
      setState('RESOLVED');
    } catch (err) {
      setError(err.message);
      setState('RESOLVED');
    } finally {
      setLoading(false);
    }
  }, [state]);

  // -------------------------------------------------------------------------
  // STEP 2c: Emandate scenario right pane — send AFA auth link
  // -------------------------------------------------------------------------
  const sendAfaAuthLink = useCallback(async () => {
    if (state !== 'CREATED' || !orderData?.transactionId) return;
    setLoading(true);
    try {
      const res = await api.sendAfaAuthLink({ transactionId: orderData.transactionId });
      setAfaLink({ authLinkId: res.authLinkId, shortUrl: res.shortUrl });
      setState('AWAITING_RESULT');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [state, orderData]);

  // -------------------------------------------------------------------------
  // STEP 2d: Mark AFA as complete (user clicked "Mark OTP complete")
  // -------------------------------------------------------------------------
  const markAfaComplete = useCallback(async () => {
    setAfaComplete(true);
    const successTxn = {
      ...(transactionRef.current || {}),
      outcome: {
        status: 'success',
        source: 'afa_authentication',
        timestamp: new Date()
      }
    };
    setTransaction(successTxn);
    transactionRef.current = successTxn;
    setState('RESOLVED');
    setPaymentResult({ status: 'success', source: 'afa_authentication' });

    // Persist to DB so ledger shows correctly as Prevented (Layer 1)
    const txnId = orderDataRef.current?.transactionId || transactionRef.current?._id;
    if (txnId) {
      try {
        await api.confirmAfaComplete(txnId);
      } catch (e) {
        // Non-blocking — UI already resolved
      }
    }
  }, []);

  // -------------------------------------------------------------------------
  // Retry order flow (scenario 2, right pane only)
  // -------------------------------------------------------------------------
  const openRetryCheckout = useCallback(async () => {
    if (!diagnosis?.recoveryExecution) return;
    setLoading(true);
    try {
      const retryRes = await api.retryOrder({
        transactionId: orderData?.transactionId,
        amount: orderData?.amount,
        scenario: scenario.id
      });
      setRetryOrderData(retryRes);
      setRetryTimerRunning(true);

      openRazorpayCheckout({
        config: retryRes.checkoutConfig,
        onPaymentSuccess: async (response) => {
          setRetryTimerRunning(false);
          setIsPaid(true);
          const successTxn = {
            ...(transactionRef.current || {}),
            outcome: { status: 'success', timestamp: new Date() },
            finalOutcome: { recovered: true, amountRecovered: orderData?.amount || scenario.amount }
          };
          setTransaction(successTxn);
          transactionRef.current = successTxn;
          setPaymentResult((prev) => ({ ...(prev || {}), retryStatus: 'success', retryPaymentId: response.razorpay_payment_id }));
        },
        onPaymentFailure: async (response) => {
          setRetryTimerRunning(false);
          await resolvePayment({
            paymentId: response.error?.metadata?.payment_id,
            rawError: response.error,
            status: 'failed'
          });
        },
        onModalDismiss: () => {
          setRetryTimerRunning(false);
        }
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [diagnosis, orderData, scenario, resolvePayment]);

  // -------------------------------------------------------------------------
  // Simulate link paid
  // -------------------------------------------------------------------------
  const simulateLinkPaid = useCallback(async () => {
    try {
      await api.simulateLinkPaid(orderData?.transactionId || transactionRef.current?._id);
      setIsPaid(true);
      const recoveredTxn = {
        ...(transactionRef.current || {}),
        finalOutcome: { recovered: true, amountRecovered: orderData?.amount || scenario.amount }
      };
      setTransaction(recoveredTxn);
      transactionRef.current = recoveredTxn;
    } catch {
      setIsPaid(true); // Best-effort
    }
  }, [orderData, scenario.amount]);

  return {
    state,
    error,
    loading,
    transaction, // Single source of truth from database
    orderData,
    layer1Decision,
    timeoutSeconds,
    timerRunning,
    paymentResult,
    diagnosis,
    recoveryLink,
    isPaid,
    afaLink,
    afaComplete,
    retryOrderData,
    retryTimerRunning,
    actions: {
      initPane,
      openCheckout,
      attemptDirectCharge,
      sendAfaAuthLink,
      markAfaComplete,
      openRetryCheckout,
      simulateLinkPaid,
      reset
    }
  };
}

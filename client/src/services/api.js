import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

export const api = {
  // Config
  getConfig: () => client.get('/razorpay/config').then(r => r.data),

  // Playground manual-gated step API
  initPane: (data) => client.post('/playground/init-pane', data).then(r => r.data),
  resolvePayment: (data) => client.post('/playground/resolve-payment', data).then(r => r.data),
  attemptEmandateCharge: () => client.post('/playground/attempt-emandate-charge').then(r => r.data),
  sendAfaAuthLink: (data) => client.post('/playground/send-afa-auth-link', data).then(r => r.data),
  confirmAfaComplete: (transactionId) => client.post('/playground/confirm-afa-complete', { transactionId }).then(r => r.data),
  retryOrder: (data) => client.post('/playground/retry-order', data).then(r => r.data),
  simulateLinkPaid: (transactionId) => client.post('/playground/simulate-link-paid', { transactionId }).then(r => r.data),

  // Legacy endpoints still used by batch simulation and existing tests
  runPlayground: (data) => client.post('/playground/run', data).then(r => r.data),
  triggerLiveDemo: (data) => client.post('/razorpay/live-demo/trigger', data).then(r => r.data),
  verifyAndDiagnose: (data) => client.post('/razorpay/verify-and-diagnose', data).then(r => r.data),
  getPaymentById: (id) => client.get(`/razorpay/payments/${id}`).then(r => r.data),
  simulatePaymentLinkPaid: (transactionId) =>
    client.post('/razorpay/simulate-payment-link-paid', { transactionId }).then(r => r.data),

  // Simulation
  runSimulation: (params) => client.post('/simulation/run', params).then(r => r.data),
  getSimulationStatus: () => client.get('/simulation/status').then(r => r.data),

  // Transactions & Audit
  getTransactions: (params) => client.get('/transactions', { params }).then(r => r.data),
  getTransactionById: (id) => client.get(`/transactions/${id}`).then(r => r.data),
  getAuditLog: (transactionId) => client.get(`/transactions/audit-log/${transactionId}`).then(r => r.data),
  updateTransactionStatus: (id, data) => client.patch(`/transactions/${id}/status`, data).then(r => r.data),

  // Metrics
  getMetricsSummary: () => client.get('/metrics/summary').then(r => r.data),
  getLearningCurve: () => client.get('/metrics/learning-curve').then(r => r.data),
  getRestraintLog: () => client.get('/metrics/restraint-log').then(r => r.data),

  // Layer 3 & Rules
  getBanditState: () => client.get('/bandit/state').then(r => r.data),
  getRiskRules: () => client.get('/risk-rules').then(r => r.data)
};

export default api;


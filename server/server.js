import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { seedDatabase } from './config/seed.js';
import { initSocketIO } from './sockets/index.js';

// Route imports
import razorpayRoutes from './routes/razorpay.js';
import simulationRoutes from './routes/simulation.js';
import transactionRoutes from './routes/transactions.js';
import metricsRoutes from './routes/metrics.js';
import banditRoutes from './routes/bandit.js';
import rulesRoutes from './routes/rules.js';
import playgroundRoutes from './routes/playground.js';
import { handleWebhookEvent } from './webhooks/receiver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);

// Initialize Socket.io
initSocketIO(httpServer, config.clientUrl);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Body parser with raw body retention for HMAC SHA256 Webhook signature validation
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(bodyParser.urlencoded({ extended: true }));

// Inbound Webhook Route
app.post('/webhooks/razorpay', handleWebhookEvent);

// API Routes
app.use('/api/razorpay', razorpayRoutes);
app.use('/api/playground', playgroundRoutes);
app.use('/api/simulation', simulationRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/bandit', banditRoutes);
app.use('/api/risk-rules', rulesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    razorpayConfigured: config.isRealRazorpayConfigured
  });
});

// Serve React build in production
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Start Server
async function startServer() {
  try {
    console.log('--- Initializing AI Revenue Recovery Engine ---');
    await connectDB();
    await seedDatabase();

    httpServer.listen(config.port, () => {
      console.log(`AI Revenue Recovery Server running on port ${config.port}`);
      console.log(`Razorpay configured: ${config.isRealRazorpayConfigured ? 'yes' : 'no (placeholder keys)'}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

export { app, httpServer };

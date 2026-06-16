import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import * as dotenv from 'dotenv';
import redisConfig from './config/redis';
import { connectRedis } from './utils/redis';
import { initWebsocketService } from './services/websocketService';
import { setSyncWebsocketEmitter } from './services/syncService';
import { initCollaborationService } from './services/initCollaboration';
import SecureRealtimeCommunication from './services/secureRealtimeCommunication';
import logger from './utils/logger';

// Import services and workers (assuming they have TS versions or can be required)
const transactionQueue = require('./services/transactionQueue');
const transactionProcessor = require('./workers/transactionProcessor');
const transactionEvents = require('./events/transactionEvents');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = createServer(app);
const websocketService = initWebsocketService(server);
const collaborationService = initCollaborationService(server);

// Helper for default-exported route modules
const resolveRoute = (routeModule: any) => routeModule.default || routeModule;

// Import routes (handling potential CJS/ESM mix)
const quizRoutes = resolveRoute(require('./routes/quizRoutes'));
const eventLoggerRoutes = resolveRoute(require('./routes/eventLoggerRoutes'));
const syncRoutes = resolveRoute(require('./routes/syncRoutes'));
const rbacRoutes = resolveRoute(require('./routes/rbacRoutes'));
const contentRoutes = require('./routes/content');
const transactionRoutes = require('./routes/transactions');
const notificationRoutes = resolveRoute(require('./routes/notificationRoutes'));
const collaborationRoutes = resolveRoute(require('./routes/collaborationRoutes'));
const holographicRoutes = resolveRoute(require('./routes/holographicRoutes'));
const secureCommRoutes = resolveRoute(require('./routes/secureCommRoutes'));
const acoRoutes = require('./routes/aco');
const federatedLearningRoutes = require('./routes/federatedLearning');
const swarmLearningRoutes = require('./routes/swarmLearning');
const smartWalletRoutes = resolveRoute(require('./routes/smartWallet'));
const agiTutorRoutes = require('./routes/agiTutorRoutes');
const analyticsRoutes = require('./routes/analytics');
const autonomousAgentsRoutes = require('./routes/autonomousAgents');
const gamificationRoutes = require('./routes/gamification');
const bridgeRoutes = require('./routes/bridge');
const timeLockCredentialsRoutes = require('./routes/timeLockCredentials');
const vrfRoutes = require('./routes/vrf');
const translationRoutes = require('./routes/translation');
const crossProtocolBridgeRoutes = require('./routes/crossProtocolBridge');

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API routes
app.use('/api/quizzes', quizRoutes);
app.use('/api/events', eventLoggerRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/rbac', rbacRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/holographic', holographicRoutes);
app.use('/api/aco', acoRoutes);
app.use('/api/federated-learning', federatedLearningRoutes);
app.use('/api/swarm-learning', swarmLearningRoutes);
app.use('/api/smart-wallet', smartWalletRoutes);
app.use('/api/secure-comm', secureCommRoutes);
app.use('/api/agi-tutor', agiTutorRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/autonomous-agents', autonomousAgentsRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/bridge', bridgeRoutes);
app.use('/api/time-lock', timeLockCredentialsRoutes);
app.use('/api/vrf', vrfRoutes);
app.use('/api/translate', translationRoutes);
app.use('/api/cross-protocol-bridge', crossProtocolBridgeRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'AetherMint Education Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint with Redis status
app.get('/api/health', async (req: Request, res: Response) => {
  const redisHealth = await redisConfig.healthCheck();
  
  res.json({
    status: redisHealth.status === 'connected' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    redis: redisHealth
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Connect to Redis using the new pool
    await connectRedis();
    
    // Initialize secure communication with the pooled Redis client
    const rawRedis = redisConfig.getRawClient();
    if (rawRedis) {
      new SecureRealtimeCommunication(websocketService.getIO(), rawRedis);
    } else {
      logger.error('Failed to initialize SecureRealtimeCommunication: Redis client not available');
    }

    setSyncWebsocketEmitter((userId: string, event: string, data: any) => {
      websocketService.emitToUser(userId, event, data);
    });

    await transactionQueue.startProcessing();
    await transactionProcessor.start();
    await transactionEvents.startListening();

    server.listen(PORT, () => {
      console.log(`🚀 AetherMint Education Backend running on port ${PORT}`);
      console.log(`🏥 Health check available at /api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await transactionQueue.stopProcessing();
  await transactionProcessor.stop();
  await transactionEvents.stopListening();
  await redisConfig.disconnect();
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

export default app;
export { server };

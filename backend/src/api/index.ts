import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Import routes
import userRoutes from './routes/user.js';
import leaderboardRoutes from './routes/leaderboard.js';
import nftRoutes from './routes/nft.js';
import referralRoutes from './routes/referral.js';
import achievementRoutes from './routes/achievements.js';

// Import middleware
import { apiLimiter } from './middleware/rateLimit.js';

export function createApiServer(): Express {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors({
    origin: config.miniApp.url || '*',
    credentials: true
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Rate limiting for API routes
  app.use('/api', apiLimiter);

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // API routes
  app.get('/api', (req: Request, res: Response) => {
    res.json({
      name: 'Ice Rating Bot API',
      version: '1.0.0',
      endpoints: {
        user: '/api/user',
        leaderboard: '/api/leaderboard',
        nft: '/api/nft',
        referral: '/api/referral',
        achievements: '/api/achievements'
      },
    });
  });

  // Register route modules
  app.use('/api/user', userRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/nft', nftRoutes);
  app.use('/api/referral', referralRoutes);
  app.use('/api/achievements', achievementRoutes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      path: req.path,
    });
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('API error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: config.isDev ? err.message : 'Something went wrong',
    });
  });

  return app;
}

export async function startApiServer(): Promise<void> {
  const app = createApiServer();

  app.listen(config.api.port, () => {
    logger.info(`API server listening on port ${config.api.port}`);
    logger.info(`API URL: ${config.api.url}`);
  });
}

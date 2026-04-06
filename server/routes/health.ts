import { Router, Request, Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const healthRouter = Router();

// Simple health check for Railway - NO database dependency
healthRouter.get('/', async (req: Request, res: Response) => {
  try {
    const health: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      service: 'AIMS Medical Platform'
    };

    // Try database but don't fail health check if DB is down
    // Railway just needs 200 OK to mark deployment healthy
    try {
      if (process.env.DATABASE_URL) {
        const result = await db.execute(sql`SELECT 1 as check`);
        health.database = result.rows[0]?.check === 1 ? 'connected' : 'error';
      } else {
        health.database = 'not_configured';
      }
    } catch (dbError) {
      health.database = 'disconnected';
      // Still return 200 - Railway needs this for deployment
    }

    res.status(200).json(health);
  } catch (error) {
    // Even on error, return 200 for Railway health check
    res.status(200).json({
      status: 'starting',
      timestamp: new Date().toISOString(),
      message: 'Service is initializing'
    });
  }
});

healthRouter.get('/detailed', async (req: Request, res: Response) => {
  try {
    const memUsage = process.memoryUsage();

    const detailedHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      system: {
        memory: {
          rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
        },
        uptime: process.uptime(),
        platform: process.platform,
        nodeVersion: process.version
      },
      database: {
        configured: !!process.env.DATABASE_URL
      },
      services: {
        openai: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
        deepgram: process.env.DEEPGRAM_API_KEY ? 'configured' : 'not_configured',
        gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not_configured'
      }
    };

    res.json(detailedHealth);
  } catch (error) {
    res.status(200).json({
      status: 'degraded',
      error: String(error)
    });
  }
});

export default healthRouter;

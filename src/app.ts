import express, { Express, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ContactRepository } from './repositories/ContactRepository';
import { IdentityService } from './services/IdentityService';
import { IdentityController } from './controllers/IdentityController';

// Create Express application
const app: Express = express();

// Initialize Prisma client and dependencies
const prisma = new PrismaClient();
const contactRepository = new ContactRepository(prisma);
const identityService = new IdentityService(contactRepository);
const identityController = new IdentityController(identityService);

// Middleware: JSON body parser with error handling
app.use(express.json());

// Middleware: Handle JSON parsing errors
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: 'Invalid JSON in request body'
    });
    return;
  }
  next(err);
});

// Middleware: Basic request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Root endpoint - API information
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Bitespeed Identity Reconciliation API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /health',
      identify: 'POST /identify'
    },
    documentation: 'https://github.com/yourusername/bitespeed-identity-reconciliation'
  });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// POST /identify endpoint
app.post('/identify', (req: Request, res: Response) => {
  identityController.identify(req, res);
});

// Error handling middleware (must be last)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[ERROR] ${err.message}`);
  console.error(err.stack);
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

export default app;
export { prisma };

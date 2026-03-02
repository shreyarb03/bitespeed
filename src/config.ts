import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

interface Config {
  port: number;
  databaseUrl: string;
  nodeEnv: string;
}

function loadConfig(): Config {
  const port = parseInt(process.env.PORT || '3000', 10);
  const databaseUrl = process.env.DATABASE_URL;
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return {
    port,
    databaseUrl,
    nodeEnv,
  };
}

export const config = loadConfig();

import { describe, it, expect } from 'vitest';
import { config } from './config';

describe('Configuration', () => {
  it('should load configuration from environment variables', () => {
    expect(config).toBeDefined();
    expect(config.port).toBe(3000);
    expect(config.databaseUrl).toBe('file:./prisma/dev.db');
    // NODE_ENV is set to 'test' by vitest
    expect(['development', 'test']).toContain(config.nodeEnv);
  });

  it('should have valid port number', () => {
    expect(config.port).toBeGreaterThan(0);
    expect(config.port).toBeLessThan(65536);
  });

  it('should have database URL defined', () => {
    expect(config.databaseUrl).toBeDefined();
    expect(config.databaseUrl.length).toBeGreaterThan(0);
  });

  it('should have valid node environment', () => {
    expect(['development', 'production', 'test']).toContain(config.nodeEnv);
  });
});

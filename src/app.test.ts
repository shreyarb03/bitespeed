import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app, { prisma } from './app';

describe('App - Input Validation', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should return 400 for invalid JSON', async () => {
    const response = await request(app)
      .post('/identify')
      .set('Content-Type', 'application/json')
      .send('{"email": "test@example.com"'); // Invalid JSON - missing closing brace

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Invalid JSON in request body',
    });
  });

  it('should return 400 for missing required fields', async () => {
    const response = await request(app)
      .post('/identify')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Email or phoneNumber must be provided',
    });
  });

  it('should return 400 for invalid data types', async () => {
    const response = await request(app)
      .post('/identify')
      .send({ email: 123 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Email must be a string',
    });
  });
});

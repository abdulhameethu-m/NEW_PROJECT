/* global describe, it, expect, beforeAll, process, require */
const request = require('supertest');
const { createApp } = require('../src/app');


let app;

beforeAll(() => {
  // Suppress logs during tests to keep console clean
  process.env.NODE_ENV = 'test';
  app = createApp();
});

describe('API Health Check', () => {
  it('GET /health should return 200 OK', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('ok', true);
    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('GET /non-existent-route should return 404', async () => {
    const response = await request(app).get('/non-existent-route');
    
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('success', false);
  });
});

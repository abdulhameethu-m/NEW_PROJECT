/* global describe, it, expect, beforeAll, process, require, vi */
const request = require('supertest');

function clearFromCache(filename) {
  const resolved = require.resolve(filename).toLowerCase().replace(/\\/g, "/");
  Object.keys(require.cache).forEach(key => {
    const normalizedKey = key.toLowerCase().replace(/\\/g, "/");
    if (normalizedKey === resolved) {
      delete require.cache[key];
    }
  });
}

// Clear and spy on maintenance service to prevent database query hang
clearFromCache('../src/services/maintenance.service');
const maintenanceService = require('../src/services/maintenance.service');
vi.spyOn(maintenanceService, 'getMaintenanceConfig').mockResolvedValue({ enabled: false });

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
    const response = await request(app).get('/api/non-existent-route');
    
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('success', false);
  });
});

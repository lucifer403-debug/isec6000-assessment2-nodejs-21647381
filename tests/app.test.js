// Unit tests for the Express application, run by "npm test" in the pipeline.
const request = require('supertest');
const app = require('../app');

describe('Express sample application', () => {
  test('GET / returns Hello World!', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Hello World!');
  });

  test('GET /health returns status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('unknown route returns 404', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.statusCode).toBe(404);
  });

  test('X-Powered-By header is not exposed', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

import request from 'supertest';
import { createTestApp } from './testUtils/createTestApp';

describe('GET /health', () => {
  it('returns 200 ok', async () => {
    const { sequelize, app } = await createTestApp();

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });

    await sequelize.close();
  });
});

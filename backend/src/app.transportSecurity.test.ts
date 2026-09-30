import request from 'supertest';
import { StubAiClient } from './services/anthropicClient';
import { StubMlsClient } from './services/mlsClient';
import { createTestApp } from './testUtils/createTestApp';

// REQ-006 / STORY-012: sensitive data must only travel encrypted. In production the
// app sits behind a TLS-terminating proxy, so these tests drive the real createApp
// wiring with nodeEnv 'production' and simulate the proxy's X-Forwarded-Proto header.
async function productionApp() {
  return createTestApp('test-secret', new StubMlsClient(), new StubAiClient(), 'production');
}

describe('transport security (production wiring)', () => {
  it('rejects a plain-HTTP login before the password reaches the auth handler', async () => {
    const { sequelize, app } = await productionApp();

    const res = await request(app)
      .post('/auth/login')
      .set('X-Forwarded-Proto', 'http')
      .send({ email: 'buyer@example.com', password: 'CorrectHorse1!' });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'HttpsRequired' });

    await sequelize.close();
  });

  it('rejects a request with no forwarded protocol at all', async () => {
    const { sequelize, app } = await productionApp();

    const res = await request(app).get('/health');

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'HttpsRequired' });

    await sequelize.close();
  });

  it('serves HTTPS requests with HSTS and nosniff headers', async () => {
    const { sequelize, app } = await productionApp();

    const res = await request(app).get('/health').set('X-Forwarded-Proto', 'https');

    expect(res.status).toBe(200);
    expect(res.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
    expect(res.headers['x-content-type-options']).toBe('nosniff');

    await sequelize.close();
  });

  it('does not enforce HTTPS outside production, so local dev and tests keep working', async () => {
    const { sequelize, app } = await createTestApp();

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.headers['strict-transport-security']).toBeUndefined();

    await sequelize.close();
  });
});

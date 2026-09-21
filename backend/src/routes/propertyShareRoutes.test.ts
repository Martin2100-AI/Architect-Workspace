import request from 'supertest';
import { MlsClient, MlsUnavailableError } from '../services/mlsClient';
import { createTestApp, TestApp } from '../testUtils/createTestApp';

async function signUpAndLogIn(ctx: TestApp): Promise<string> {
  await request(ctx.app).post('/auth/signup').send({ email: 'buyer@example.com', password: 'super-secret-1' });
  const loginRes = await request(ctx.app)
    .post('/auth/login')
    .send({ email: 'buyer@example.com', password: 'super-secret-1' });
  return loginRes.body.token;
}

describe('POST /properties/:id/share', () => {
  let ctx: TestApp;

  beforeEach(async () => {
    ctx = await createTestApp();
  });

  afterEach(async () => {
    await ctx.sequelize.close();
  });

  // Given a property, when shared via email, then the recipient should receive the details.
  it('sends the property details to the recipient and returns the shareable link', async () => {
    const token = await signUpAndLogIn(ctx);

    const res = await request(ctx.app)
      .post('/properties/stub-1/share')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientEmail: 'friend@example.com', requestId: 'req-1' });

    expect(res.status).toBe(200);
    expect(res.body.shared).toBe(true);
    expect(res.body.shareUrl).toBe('http://localhost:3000/?property=stub-1');
    expect(ctx.emailSender.sentPropertyShareTo).toBe('friend@example.com');
    expect(ctx.emailSender.sentPropertyShareDetails).toMatchObject({
      propertyId: 'stub-1',
      requestId: 'req-1',
    });

    const shareEvents = await ctx.AuditLogModel.findAll({ where: { action: 'property_shared_via_email' } });
    expect(shareEvents).toHaveLength(1);
  });

  // Failure path: email does not send -- the response must say so honestly, since
  // (unlike a tour request) there is no already-real action behind this one to fall back on.
  it('returns a failure response and records no audit event when the email fails to send', async () => {
    const token = await signUpAndLogIn(ctx);
    ctx.emailSender.shouldFailPropertyShare = true;

    const res = await request(ctx.app)
      .post('/properties/stub-1/share')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientEmail: 'friend@example.com', requestId: 'req-1' });

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'EmailDeliveryFailed' });

    const shareEvents = await ctx.AuditLogModel.findAll({ where: { action: 'property_shared_via_email' } });
    expect(shareEvents).toHaveLength(0);
  });

  it('rejects an invalid recipient email before attempting to send', async () => {
    const token = await signUpAndLogIn(ctx);

    const res = await request(ctx.app)
      .post('/properties/stub-1/share')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientEmail: 'not-an-email', requestId: 'req-1' });

    expect(res.status).toBe(400);
    expect(ctx.emailSender.sentPropertyShareTo).toBeUndefined();
  });

  it('returns 404 for an unknown property, without attempting to send', async () => {
    const token = await signUpAndLogIn(ctx);

    const res = await request(ctx.app)
      .post('/properties/does-not-exist/share')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientEmail: 'friend@example.com', requestId: 'req-1' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'PropertyNotFound' });
    expect(ctx.emailSender.sentPropertyShareTo).toBeUndefined();
  });

  it('returns 503 when the MLS API is unavailable', async () => {
    const failingMlsClient: MlsClient = {
      async getPropertyFeed() {
        throw new MlsUnavailableError();
      },
    };
    const failingCtx = await createTestApp('test-secret', failingMlsClient);
    const token = await signUpAndLogIn(failingCtx);

    const res = await request(failingCtx.app)
      .post('/properties/stub-1/share')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientEmail: 'friend@example.com', requestId: 'req-1' });

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'MlsUnavailable' });

    await failingCtx.sequelize.close();
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(ctx.app)
      .post('/properties/stub-1/share')
      .send({ recipientEmail: 'friend@example.com', requestId: 'req-1' });

    expect(res.status).toBe(401);
    expect(ctx.emailSender.sentPropertyShareTo).toBeUndefined();
  });
});

import request from 'supertest';
import { createTestApp, TestApp } from '../testUtils/createTestApp';

async function signUpAndLogIn(ctx: TestApp): Promise<string> {
  await request(ctx.app).post('/auth/signup').send({ email: 'buyer@example.com', password: 'super-secret-1' });
  const loginRes = await request(ctx.app)
    .post('/auth/login')
    .send({ email: 'buyer@example.com', password: 'super-secret-1' });
  return loginRes.body.token;
}

const allEnabled = {
  newMatch: true,
  priceReduction: true,
  openHouse: true,
  statusChange: true,
  backOnMarket: true,
  underContract: true,
  tourConfirmation: true,
};

describe('notification preferences', () => {
  let ctx: TestApp;

  beforeEach(async () => {
    ctx = await createTestApp();
  });

  afterEach(async () => {
    await ctx.sequelize.close();
  });

  // Trust: Notification settings are stored and applied correctly. A user who has
  // never visited the settings page still gets a real, persisted default back.
  it('returns default preferences (every type enabled) on first read', async () => {
    const token = await signUpAndLogIn(ctx);

    const res = await request(ctx.app).get('/notification-preferences').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.preferences).toEqual({ ...allEnabled, userId: expect.any(Number) });
    expect(await ctx.NotificationPreferenceModel.count()).toBe(1);
  });

  // Given a user, when they update preferences, then notifications should reflect
  // changes.
  it('updates preferences and reflects the change on the next read', async () => {
    const token = await signUpAndLogIn(ctx);

    const putRes = await request(ctx.app)
      .put('/notification-preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...allEnabled, tourConfirmation: false });

    expect(putRes.status).toBe(200);
    expect(putRes.body.preferences.tourConfirmation).toBe(false);

    const getRes = await request(ctx.app).get('/notification-preferences').set('Authorization', `Bearer ${token}`);
    expect(getRes.body.preferences.tourConfirmation).toBe(false);
    expect(await ctx.NotificationPreferenceModel.count()).toBe(1);
  });

  it('rejects incomplete preferences with a 400 error and does not create a row', async () => {
    const token = await signUpAndLogIn(ctx);
    const { tourConfirmation: _tourConfirmation, ...incomplete } = allEnabled;

    const res = await request(ctx.app)
      .put('/notification-preferences')
      .set('Authorization', `Bearer ${token}`)
      .send(incomplete);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ValidationError');
    expect(await ctx.NotificationPreferenceModel.count()).toBe(0);
  });

  it('rejects reading preferences without being logged in', async () => {
    const res = await request(ctx.app).get('/notification-preferences');
    expect(res.status).toBe(401);
  });

  it('rejects updating preferences without being logged in', async () => {
    const res = await request(ctx.app).put('/notification-preferences').send(allEnabled);
    expect(res.status).toBe(401);
    expect(await ctx.NotificationPreferenceModel.count()).toBe(0);
  });

  it('saving preferences twice updates the one row instead of creating a duplicate', async () => {
    const token = await signUpAndLogIn(ctx);

    await request(ctx.app).put('/notification-preferences').set('Authorization', `Bearer ${token}`).send(allEnabled);
    const secondRes = await request(ctx.app)
      .put('/notification-preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...allEnabled, priceReduction: false });

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.preferences.priceReduction).toBe(false);
    expect(await ctx.NotificationPreferenceModel.count()).toBe(1);
  });

  it("keeps each user's preferences independent", async () => {
    const tokenOne = await signUpAndLogIn(ctx);
    await request(ctx.app).post('/auth/signup').send({ email: 'other@example.com', password: 'super-secret-1' });
    const loginTwo = await request(ctx.app)
      .post('/auth/login')
      .send({ email: 'other@example.com', password: 'super-secret-1' });
    const tokenTwo = loginTwo.body.token;

    await request(ctx.app)
      .put('/notification-preferences')
      .set('Authorization', `Bearer ${tokenOne}`)
      .send({ ...allEnabled, tourConfirmation: false });

    const resTwo = await request(ctx.app)
      .get('/notification-preferences')
      .set('Authorization', `Bearer ${tokenTwo}`);

    expect(resTwo.body.preferences.tourConfirmation).toBe(true);
  });
});

import request from 'supertest';
import { createTestApp, TestApp } from './testUtils/createTestApp';

// STORY-015 Trust criterion: every user action is recorded in the audit trail with a
// timestamp. Drives one user through each state-changing action end to end and checks
// the trail, rather than trusting each route's own test in isolation.
describe('audit trail coverage', () => {
  let ctx: TestApp;

  beforeEach(async () => {
    ctx = await createTestApp();
  });

  afterEach(async () => {
    await ctx.sequelize.close();
  });

  async function signupAndLogin(): Promise<{ userId: number; token: string }> {
    const signup = await request(ctx.app)
      .post('/auth/signup')
      .send({ email: 'buyer@example.com', password: 'original-password' });
    const login = await request(ctx.app)
      .post('/auth/login')
      .send({ email: 'buyer@example.com', password: 'original-password' });
    return { userId: signup.body.id, token: login.body.token };
  }

  it('records every user action, in order, each with a timestamp', async () => {
    const { userId, token } = await signupAndLogin();
    const auth = { Authorization: `Bearer ${token}` };

    await request(ctx.app).post('/favorites/stub-1').set(auth).send({}).expect(200);
    await request(ctx.app).delete('/favorites/stub-1').set(auth).send({ category: 'favorites' }).expect(200);
    await request(ctx.app)
      .put('/notification-preferences')
      .set(auth)
      .send({
        newMatch: true,
        priceReduction: false,
        openHouse: true,
        statusChange: true,
        backOnMarket: true,
        underContract: true,
        tourConfirmation: true,
      })
      .expect(200);
    await request(ctx.app).post('/auth/logout').set(auth).expect(200);
    await request(ctx.app).post('/auth/password-reset/request').send({ email: 'buyer@example.com' }).expect(200);
    await request(ctx.app)
      .post('/auth/password-reset/confirm')
      .send({ token: ctx.emailSender.sentToken, newPassword: 'brand-new-password' })
      .expect(200);

    const entries = await ctx.AuditLogModel.findAll({ where: { userId }, order: [['id', 'ASC']] });
    expect(entries.map((e) => e.action)).toEqual([
      'user_registered',
      'user_logged_in',
      'favorite_saved',
      'favorite_removed',
      'notification_preferences_updated',
      'user_logged_out',
      'password_reset_requested',
      'password_reset_completed',
    ]);
    entries.forEach((entry) => expect(entry.createdAt).toBeInstanceOf(Date));
  });

  it('does not record a login for wrong credentials, since no action was taken', async () => {
    const { userId } = await signupAndLogin();

    await request(ctx.app)
      .post('/auth/login')
      .send({ email: 'buyer@example.com', password: 'wrong-password' })
      .expect(401);

    const logins = await ctx.AuditLogModel.count({ where: { userId, action: 'user_logged_in' } });
    expect(logins).toBe(1);
  });

  it('does not record a password reset completion for an invalid token', async () => {
    const { userId } = await signupAndLogin();

    await request(ctx.app)
      .post('/auth/password-reset/confirm')
      .send({ token: 'not-a-real-token', newPassword: 'brand-new-password' })
      .expect(400);

    const completions = await ctx.AuditLogModel.count({ where: { userId, action: 'password_reset_completed' } });
    expect(completions).toBe(0);
  });
});

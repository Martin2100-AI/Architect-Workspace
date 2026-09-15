import request from 'supertest';
import { createTestApp, TestApp } from '../testUtils/createTestApp';

async function signUpAndLogIn(ctx: TestApp): Promise<string> {
  await request(ctx.app).post('/auth/signup').send({ email: 'buyer@example.com', password: 'super-secret-1' });
  const loginRes = await request(ctx.app)
    .post('/auth/login')
    .send({ email: 'buyer@example.com', password: 'super-secret-1' });
  return loginRes.body.token;
}

const validProfile = {
  preferredLocations: ['Austin', 'Round Rock'],
  minPrice: 300000,
  maxPrice: 500000,
  bedrooms: 3,
  bathrooms: 2,
  propertyType: 'single-family',
  downPayment: 60000,
};

describe('buyer profile', () => {
  let ctx: TestApp;

  beforeEach(async () => {
    ctx = await createTestApp();
  });

  afterEach(async () => {
    await ctx.sequelize.close();
  });

  // Given a buyer accesses the profile creation page, When they submit valid
  // information, Then a profile is created successfully.
  it('creates a profile from valid information', async () => {
    const token = await signUpAndLogIn(ctx);

    const res = await request(ctx.app).post('/profile').set('Authorization', `Bearer ${token}`).send(validProfile);

    expect(res.status).toBe(200);
    expect(res.body.profile).toEqual({ ...validProfile, userId: expect.any(Number), desiredFeatures: [] });
    expect(await ctx.BuyerProfileModel.count()).toBe(1);
  });

  // Given a buyer submits incomplete information, When they attempt to create a
  // profile, Then an error message is displayed.
  it('rejects incomplete information with a 400 error message and creates no profile', async () => {
    const token = await signUpAndLogIn(ctx);
    const { minPrice: _minPrice, ...incompleteProfile } = validProfile;

    const res = await request(ctx.app)
      .post('/profile')
      .set('Authorization', `Bearer ${token}`)
      .send(incompleteProfile);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ValidationError');
    expect(await ctx.BuyerProfileModel.count()).toBe(0);
  });

  it('rejects a maxPrice below minPrice with a 400 error and creates no profile', async () => {
    const token = await signUpAndLogIn(ctx);

    const res = await request(ctx.app)
      .post('/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validProfile, minPrice: 500000, maxPrice: 300000 });

    expect(res.status).toBe(400);
    expect(await ctx.BuyerProfileModel.count()).toBe(0);
  });

  // Trust: Profile creation actions are logged with a timestamp.
  it('logs profile creation with a timestamp in the audit trail', async () => {
    const token = await signUpAndLogIn(ctx);

    await request(ctx.app).post('/profile').set('Authorization', `Bearer ${token}`).send(validProfile);

    const auditEntries = await ctx.AuditLogModel.findAll({ where: { action: 'buyer_profile_created' } });
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0].createdAt).toBeInstanceOf(Date);
  });

  it('rejects an attempt to create a profile without being logged in', async () => {
    const res = await request(ctx.app).post('/profile').send(validProfile);

    expect(res.status).toBe(401);
    expect(await ctx.BuyerProfileModel.count()).toBe(0);
  });

  it('submitting the profile form twice updates the one profile instead of creating a duplicate', async () => {
    const token = await signUpAndLogIn(ctx);

    await request(ctx.app).post('/profile').set('Authorization', `Bearer ${token}`).send(validProfile);
    const secondRes = await request(ctx.app)
      .post('/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validProfile, bedrooms: 4 });

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.profile.bedrooms).toBe(4);
    expect(await ctx.BuyerProfileModel.count()).toBe(1);
  });
});

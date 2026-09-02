import request from 'supertest';
import { MlsClient, MlsUnavailableError } from '../services/mlsClient';
import { createTestApp } from '../testUtils/createTestApp';

describe('GET /properties', () => {
  it('returns the property feed with the REQ-002 fields', async () => {
    const { sequelize, app } = await createTestApp();

    const res = await request(app).get('/properties');

    expect(res.status).toBe(200);
    expect(res.body.properties.length).toBeGreaterThan(0);
    expect(res.body.properties[0]).toMatchObject({
      id: expect.any(String),
      imageUrl: expect.any(String),
      listingPrice: expect.any(Number),
      address: expect.any(String),
      bedrooms: expect.any(Number),
      bathrooms: expect.any(Number),
      squareFootage: expect.any(Number),
      propertyType: expect.any(String),
      estimatedMonthlyPayment: expect.any(Number),
    });

    await sequelize.close();
  });

  it('returns 503 when the MLS API is unavailable', async () => {
    const failingMlsClient: MlsClient = {
      async getPropertyFeed() {
        throw new MlsUnavailableError();
      },
    };
    const { sequelize, app } = await createTestApp('test-secret', failingMlsClient);

    const res = await request(app).get('/properties');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'MlsUnavailable' });

    await sequelize.close();
  });
});

describe('GET /properties/:id', () => {
  it('returns the full details for a known property', async () => {
    const { sequelize, app } = await createTestApp();

    const res = await request(app).get('/properties/stub-1');

    expect(res.status).toBe(200);
    expect(res.body.property).toMatchObject({
      id: 'stub-1',
      imageUrl: expect.any(String),
      listingPrice: expect.any(Number),
      address: expect.any(String),
      bedrooms: expect.any(Number),
      bathrooms: expect.any(Number),
      squareFootage: expect.any(Number),
      propertyType: expect.any(String),
      estimatedMonthlyPayment: expect.any(Number),
    });

    await sequelize.close();
  });

  it('returns 404 for an unknown property id', async () => {
    const { sequelize, app } = await createTestApp();

    const res = await request(app).get('/properties/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'PropertyNotFound' });

    await sequelize.close();
  });

  it('returns 503 when the MLS API is unavailable', async () => {
    const failingMlsClient: MlsClient = {
      async getPropertyFeed() {
        throw new MlsUnavailableError();
      },
    };
    const { sequelize, app } = await createTestApp('test-secret', failingMlsClient);

    const res = await request(app).get('/properties/stub-1');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'MlsUnavailable' });

    await sequelize.close();
  });
});

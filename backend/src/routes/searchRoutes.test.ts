import request from 'supertest';
import { AiClient, AnthropicNotConfiguredError, AnthropicUpstreamError } from '../services/anthropicClient';
import { createTestApp } from '../testUtils/createTestApp';

function emptyFiltersJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    city: null,
    zipCode: null,
    priceMin: null,
    priceMax: null,
    bedrooms: null,
    bathrooms: null,
    propertyType: null,
    features: [],
    assumptions: [],
    clarificationNeeded: null,
    ...overrides,
  });
}

describe('POST /search', () => {
  it('returns 400 when userQuery is missing', async () => {
    const { sequelize, app } = await createTestApp();
    const res = await request(app).post('/search').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ValidationError');
    await sequelize.close();
  });

  it('returns filters and matched results for a valid query', async () => {
    const filterResponse = emptyFiltersJson({ city: 'Springfield', bedrooms: 3 });
    const matchResponse = JSON.stringify({ matchedCriteria: ['city', 'bedrooms'], unmatchedCriteria: [], overallFit: 'full-match' });
    let callCount = 0;
    const aiClient: AiClient = {
      complete: async () => {
        callCount += 1;
        return callCount === 1 ? filterResponse : matchResponse;
      },
    };

    const { sequelize, app } = await createTestApp('test-secret', undefined, aiClient);
    const res = await request(app).post('/search').send({ userQuery: '3 bedroom homes in Springfield' });

    expect(res.status).toBe(200);
    expect(res.body.filters.city).toBe('Springfield');
    expect(res.body.results.length).toBeGreaterThan(0);
    expect(res.body.results[0]).toHaveProperty('overallFit');
    await sequelize.close();
  });

  it('returns 503 with AiSearchNotConfigured when no API key is configured', async () => {
    const aiClient: AiClient = {
      complete: async () => {
        throw new AnthropicNotConfiguredError();
      },
    };
    const { sequelize, app } = await createTestApp('test-secret', undefined, aiClient);
    const res = await request(app).post('/search').send({ userQuery: 'homes in Springfield' });
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'AiSearchNotConfigured' });
    await sequelize.close();
  });

  it('returns 503 with AiSearchUnavailable when the upstream call fails', async () => {
    const aiClient: AiClient = {
      complete: async () => {
        throw new AnthropicUpstreamError();
      },
    };
    const { sequelize, app } = await createTestApp('test-secret', undefined, aiClient);
    const res = await request(app).post('/search').send({ userQuery: 'homes in Springfield' });
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'AiSearchUnavailable' });
    await sequelize.close();
  });
});

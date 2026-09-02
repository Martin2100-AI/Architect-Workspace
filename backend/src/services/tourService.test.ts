import { Sequelize } from 'sequelize';
import { MlsClient } from './mlsClient';
import { PropertyNotFoundError } from './propertyLookupService';
import { InvalidTourDatetimeError, scheduleTour } from './tourService';
import { initTourRequestModel, TourRequest } from '../models/TourRequest';
import { Property } from '../types/property';

const sampleProperty: Property = {
  id: 'stub-1',
  imageUrl: 'https://example.com/1.jpg',
  listingPrice: 425000,
  address: '123 Maple St, Springfield, IL',
  bedrooms: 3,
  bathrooms: 2,
  squareFootage: 1850,
  propertyType: 'single-family',
  estimatedMonthlyPayment: 2650,
};

function fakeMlsClient(properties: Property[]): MlsClient {
  return { getPropertyFeed: async () => properties };
}

function futureDate(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

describe('scheduleTour', () => {
  let sequelize: Sequelize;

  beforeEach(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    initTourRequestModel(sequelize);
    await sequelize.sync();
  });

  afterEach(async () => {
    await sequelize.close();
  });

  it('creates a tour request for a known property and a future date', async () => {
    const result = await scheduleTour(TourRequest, fakeMlsClient([sampleProperty]), {
      propertyId: 'stub-1',
      requestedAt: futureDate(),
      buyerEmail: 'buyer@example.com',
    });

    expect(result.alreadyScheduled).toBe(false);
    expect(result.tourRequest.propertyId).toBe('stub-1');
    expect(result.tourRequest.buyerEmail).toBe('buyer@example.com');
  });

  it('throws PropertyNotFoundError for an unknown property', async () => {
    await expect(
      scheduleTour(TourRequest, fakeMlsClient([sampleProperty]), {
        propertyId: 'stub-999',
        requestedAt: futureDate(),
        buyerEmail: 'buyer@example.com',
      }),
    ).rejects.toThrow(PropertyNotFoundError);
  });

  it('throws InvalidTourDatetimeError for a date in the past', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    await expect(
      scheduleTour(TourRequest, fakeMlsClient([sampleProperty]), {
        propertyId: 'stub-1',
        requestedAt: pastDate,
        buyerEmail: 'buyer@example.com',
      }),
    ).rejects.toThrow(InvalidTourDatetimeError);
  });

  it('is idempotent for the same property, buyer, and datetime', async () => {
    const requestedAt = futureDate();

    const first = await scheduleTour(TourRequest, fakeMlsClient([sampleProperty]), {
      propertyId: 'stub-1',
      requestedAt,
      buyerEmail: 'buyer@example.com',
      notes: 'First call.',
    });
    const second = await scheduleTour(TourRequest, fakeMlsClient([sampleProperty]), {
      propertyId: 'stub-1',
      requestedAt,
      buyerEmail: 'buyer@example.com',
      notes: 'Second call, should not create a duplicate.',
    });

    expect(second.tourRequest.id).toBe(first.tourRequest.id);
    expect(second.alreadyScheduled).toBe(true);
    await expect(TourRequest.count()).resolves.toBe(1);
  });

  it('creates a separate tour request for a different requested datetime', async () => {
    await scheduleTour(TourRequest, fakeMlsClient([sampleProperty]), {
      propertyId: 'stub-1',
      requestedAt: futureDate(),
      buyerEmail: 'buyer@example.com',
    });
    await scheduleTour(TourRequest, fakeMlsClient([sampleProperty]), {
      propertyId: 'stub-1',
      requestedAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      buyerEmail: 'buyer@example.com',
    });

    await expect(TourRequest.count()).resolves.toBe(2);
  });

  it('reports progress for each real stage when a callback is provided', async () => {
    const updates: Array<{ step: number; total: number; message: string }> = [];

    await scheduleTour(
      TourRequest,
      fakeMlsClient([sampleProperty]),
      { propertyId: 'stub-1', requestedAt: futureDate(), buyerEmail: 'buyer@example.com' },
      (progress) => {
        updates.push(progress);
      },
    );

    expect(updates).toEqual([
      { step: 1, total: 3, message: 'Looking up property stub-1' },
      { step: 2, total: 3, message: 'Validating requested tour time' },
      { step: 3, total: 3, message: 'Recording tour request for buyer@example.com' },
    ]);
  });
});

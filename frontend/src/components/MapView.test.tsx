import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MapView } from './MapView';
import { Property } from '../types/property';

type Handler = () => void;

const mockMarkerInstances: Array<{ setLngLat: jest.Mock; setPopup: jest.Mock; addTo: jest.Mock; remove: jest.Mock }> = [];
let mockBounds = { getNorth: () => 90, getSouth: () => -90, getEast: () => 180, getWest: () => -180 };
let mockHandlers: Record<string, Handler[]> = {};

jest.mock('maplibre-gl', () => {
  class FakeMap {
    on(event: string, handler: Handler): void {
      mockHandlers[event] = mockHandlers[event] || [];
      mockHandlers[event].push(handler);
    }
    getBounds() {
      return mockBounds;
    }
    remove(): void {}
  }

  class FakeMarker {
    setLngLat = jest.fn().mockReturnThis();
    setPopup = jest.fn().mockReturnThis();
    addTo = jest.fn().mockReturnThis();
    remove = jest.fn();
    constructor() {
      mockMarkerInstances.push(this);
    }
  }

  class FakePopup {
    setHTML = jest.fn().mockReturnThis();
  }

  return {
    __esModule: true,
    default: { Map: FakeMap, Marker: FakeMarker, Popup: FakePopup },
    Map: FakeMap,
    Marker: FakeMarker,
    Popup: FakePopup,
  };
});

function fire(event: string): void {
  act(() => {
    (mockHandlers[event] || []).forEach((handler) => handler());
  });
}

function makeProperty(overrides: Partial<Property>): Property {
  return {
    id: 'p1',
    imageUrl: 'https://example.com/photo.jpg',
    listingPrice: 400000,
    address: '1 Test St',
    bedrooms: 3,
    bathrooms: 2,
    squareFootage: 1500,
    propertyType: 'single-family',
    estimatedMonthlyPayment: 2500,
    latitude: 29.75,
    longitude: -95.4,
    ...overrides,
  };
}

describe('MapView', () => {
  const originalKey = process.env.REACT_APP_MAPTILER_API_KEY;

  beforeEach(() => {
    process.env.REACT_APP_MAPTILER_API_KEY = 'test-key';
    mockMarkerInstances.length = 0;
    mockHandlers = {};
    mockBounds = { getNorth: () => 90, getSouth: () => -90, getEast: () => 180, getWest: () => -180 };
  });

  afterEach(() => {
    process.env.REACT_APP_MAPTILER_API_KEY = originalKey;
  });

  it('shows an error message instead of crashing when no MapTiler key is configured', () => {
    delete process.env.REACT_APP_MAPTILER_API_KEY;

    render(<MapView properties={[makeProperty({})]} />);

    expect(screen.getByRole('alert')).toHaveTextContent(/couldn't load the map/i);
  });

  it('shows an error message when the map emits a load error', async () => {
    render(<MapView properties={[makeProperty({})]} />);

    fire('error');

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load the map/i);
  });

  it('places a marker for each property with coordinates once the map loads', async () => {
    const properties = [makeProperty({ id: 'a' }), makeProperty({ id: 'b', latitude: null })];

    render(<MapView properties={properties} />);
    fire('load');

    await waitFor(() => expect(mockMarkerInstances).toHaveLength(1));
  });

  it('updates markers to the newly visible properties when the map is panned or zoomed', async () => {
    const inBounds = makeProperty({ id: 'in', latitude: 10, longitude: 10 });
    const outOfBounds = makeProperty({ id: 'out', latitude: 60, longitude: 60 });

    render(<MapView properties={[inBounds, outOfBounds]} />);
    mockBounds = { getNorth: () => 20, getSouth: () => 0, getEast: () => 20, getWest: () => 0 };
    fire('load');

    await waitFor(() => expect(mockMarkerInstances).toHaveLength(1));

    mockBounds = { getNorth: () => 70, getSouth: () => 50, getEast: () => 70, getWest: () => 50 };
    fire('moveend');

    await waitFor(() => expect(mockMarkerInstances).toHaveLength(2));
  });
});

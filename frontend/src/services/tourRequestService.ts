import { getAuthToken } from './authTokenStore';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';
const REQUEST_TIMEOUT_MS = 8000;

export interface TourRequestInput {
  propertyId: string;
  preferredDate: string;
  preferredTime: string;
  buyerName: string;
  phoneNumber: string;
  email: string;
  message?: string;
}

export interface TourRequestRecord {
  id: number;
  propertyId: string;
  requestedAt: string;
  buyerEmail: string;
  buyerName: string | null;
  phoneNumber: string | null;
  notes: string | null;
  alreadyScheduled: boolean;
}

export interface TourRequestResult {
  tourRequest: TourRequestRecord;
  confirmationSent: boolean;
  confirmationSkippedByPreference: boolean;
}

export class NotAuthenticatedError extends Error {
  constructor() {
    super('You need to be logged in to request a tour.');
    this.name = 'NotAuthenticatedError';
  }
}

export class TourRequestValidationError extends Error {
  constructor() {
    super('Please check the highlighted fields and try again.');
    this.name = 'TourRequestValidationError';
  }
}

export async function requestTour(input: TourRequestInput): Promise<TourRequestResult> {
  const token = getAuthToken();
  if (!token) {
    throw new NotAuthenticatedError();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}/tours`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (res.status === 401) {
      throw new NotAuthenticatedError();
    }
    if (res.status === 400) {
      throw new TourRequestValidationError();
    }
    if (!res.ok) {
      throw new Error(`Failed to request a tour (status ${res.status})`);
    }

    return (await res.json()) as TourRequestResult;
  } finally {
    clearTimeout(timeout);
  }
}

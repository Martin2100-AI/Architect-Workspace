import { Property } from '../types/property';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';
const REQUEST_TIMEOUT_MS = 8000;

export class MlsUnavailableError extends Error {
  constructor() {
    super('The MLS API is unavailable right now.');
    this.name = 'MlsUnavailableError';
  }
}

export async function fetchPropertyFeed(): Promise<Property[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}/properties`, { signal: controller.signal });

    if (res.status === 503) {
      throw new MlsUnavailableError();
    }
    if (!res.ok) {
      throw new Error(`Failed to load property feed (status ${res.status})`);
    }

    const body = await res.json();
    return body.properties as Property[];
  } finally {
    clearTimeout(timeout);
  }
}

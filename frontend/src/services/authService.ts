import { getAuthToken } from './authTokenStore';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';
const REQUEST_TIMEOUT_MS = 8000;

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Incorrect email or password.');
    this.name = 'InvalidCredentialsError';
  }
}

export class EmailAlreadyExistsError extends Error {
  constructor() {
    super('An account with that email already exists.');
    this.name = 'EmailAlreadyExistsError';
  }
}

export class InvalidOrExpiredResetTokenError extends Error {
  constructor() {
    super('This reset link is invalid or has expired.');
    this.name = 'InvalidOrExpiredResetTokenError';
  }
}

export async function login(email: string, password: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (res.status === 401) {
      throw new InvalidCredentialsError();
    }
    if (!res.ok) {
      throw new Error(`Login failed (status ${res.status})`);
    }

    const body = await res.json();
    return body.token as string;
  } finally {
    clearTimeout(timeout);
  }
}

export async function signup(email: string, password: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (res.status === 409) {
      throw new EmailAlreadyExistsError();
    }
    if (!res.ok) {
      throw new Error(`Signup failed (status ${res.status})`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function logout(): Promise<void> {
  const token = getAuthToken();
  if (!token) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Logout failed (status ${res.status})`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}/auth/password-reset/request`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      throw new Error(`Password reset request failed (status ${res.status})`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}/auth/password-reset/confirm`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });

    if (res.status === 400) {
      throw new InvalidOrExpiredResetTokenError();
    }
    if (!res.ok) {
      throw new Error(`Password reset confirm failed (status ${res.status})`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

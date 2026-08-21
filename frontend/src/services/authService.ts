const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';
const REQUEST_TIMEOUT_MS = 8000;

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Incorrect email or password.');
    this.name = 'InvalidCredentialsError';
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

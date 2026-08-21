/**
 * In-memory session token — cleared on page refresh by design (avoids persisting a
 * bearer token in localStorage/sessionStorage, which is readable by any injected
 * script). `LoginPage` calls `setAuthToken` after a real login. The build-time env
 * var below is a dev/test convenience for seeding a token without going through the
 * login form (e.g. manual smoke checks); it plays no role for a real user.
 */
let token: string | null = process.env.REACT_APP_DEV_AUTH_TOKEN || null;

export function getAuthToken(): string | null {
  return token;
}

export function setAuthToken(newToken: string | null): void {
  token = newToken;
}

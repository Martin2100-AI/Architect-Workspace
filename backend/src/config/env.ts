export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  corsOrigin: process.env.CORS_ORIGIN,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
  // SimplyRETS's demo API + credentials are publicly documented by SimplyRETS for
  // anyone to use without signing up (https://docs.simplyrets.com) — not a secret.
  // Override these three to point at a real paid SimplyRETS account later.
  simplyRetsBaseUrl: process.env.SIMPLYRETS_BASE_URL || 'https://api.simplyrets.com',
  simplyRetsUsername: process.env.SIMPLYRETS_USERNAME || 'simplyrets',
  simplyRetsPassword: process.env.SIMPLYRETS_PASSWORD || 'simplyrets',
  resendApiKey: process.env.RESEND_API_KEY,
  // Resend's own testing sender — works with no domain verification. Replace once a
  // real sending domain is verified in the Resend dashboard.
  resendFromEmail: process.env.RESEND_FROM_EMAIL || 'Keysy <onboarding@resend.dev>',
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'keysy',
    user: process.env.DB_USER || 'keysy',
    password: process.env.DB_PASSWORD || '',
  },
};

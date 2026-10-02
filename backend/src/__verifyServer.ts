// Throwaway local demo server — in-memory sqlite (no real Postgres needed), real
// SimplyRETS MLS client, CORS opened for the CRA dev server so the frontend can be
// clicked through in a real browser. Deleted after the demo session.
import './config/loadEnv';
import { Sequelize } from 'sequelize';
import { createApp } from './app';
import { env } from './config/env';
import { initAuditLogModel } from './models/AuditLog';
import { initBuyerProfileModel } from './models/BuyerProfile';
import { initFavoriteModel } from './models/Favorite';
import { initNotificationPreferenceModel } from './models/NotificationPreference';
import { initPasswordResetTokenModel } from './models/PasswordResetToken';
import { initTokenBlocklistModel } from './models/TokenBlocklist';
import { initTourRequestModel } from './models/TourRequest';
import { initUserModel } from './models/User';
import { AnthropicAiClient, StubAiClient } from './services/anthropicClient';
import { SimplyRetsMlsClient } from './services/mlsClient';
import { EmailSender } from './services/notificationService';
import { ResendEmailSender } from './services/resendEmailSender';

async function main() {
  if (!env.resendApiKey) {
    throw new Error('RESEND_API_KEY is not set — cannot send a real email');
  }
  const emailSender: EmailSender = new ResendEmailSender(env.resendApiKey, env.resendFromEmail, 'http://localhost:3000');

  const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
  const userModel = initUserModel(sequelize);
  const resetTokenModel = initPasswordResetTokenModel(sequelize);
  const blocklistModel = initTokenBlocklistModel(sequelize);
  const favoriteModel = initFavoriteModel(sequelize);
  const auditLogModel = initAuditLogModel(sequelize);
  const buyerProfileModel = initBuyerProfileModel(sequelize);
  const tourRequestModel = initTourRequestModel(sequelize);
  const notificationPreferenceModel = initNotificationPreferenceModel(sequelize);
  await sequelize.sync();

  const app = createApp({
    userModel,
    resetTokenModel,
    blocklistModel,
    favoriteModel,
    auditLogModel,
    buyerProfileModel,
    tourRequestModel,
    notificationPreferenceModel,
    emailSender,
    mlsClient: new SimplyRetsMlsClient('https://api.simplyrets.com', 'simplyrets', 'simplyrets'),
    // Same rule as server.ts: real AI search when a key is configured, otherwise the
    // stub (POST /search returns 503 AiSearchNotConfigured).
    aiClient: env.anthropicApiKey
      ? new AnthropicAiClient(env.anthropicApiKey, env.anthropicModel)
      : new StubAiClient(),
    jwtSecret: 'demo-secret',
    nodeEnv: 'development',
    corsOrigin: 'http://localhost:3000',
    appBaseUrl: 'http://localhost:3000',
  });

  app.listen(4000, () => console.log('Keysy demo backend listening on http://localhost:4000'));
}

main();

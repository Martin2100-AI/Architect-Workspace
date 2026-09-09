import './config/loadEnv';
import { createApp } from './app';
import { env } from './config/env';
import { createSequelize } from './config/database';
import { AuditLog, initAuditLogModel } from './models/AuditLog';
import { Favorite, initFavoriteModel } from './models/Favorite';
import { initPasswordResetTokenModel } from './models/PasswordResetToken';
import { initTokenBlocklistModel } from './models/TokenBlocklist';
import { initUserModel } from './models/User';
import { AiClient, AnthropicAiClient, StubAiClient } from './services/anthropicClient';
import { MlsClient, SimplyRetsMlsClient } from './services/mlsClient';
import { ConsoleEmailSender, EmailSender } from './services/notificationService';
import { ResendEmailSender } from './services/resendEmailSender';

if (!env.jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}

const sequelize = createSequelize();
const UserModel = initUserModel(sequelize);
const ResetTokenModel = initPasswordResetTokenModel(sequelize);
const BlocklistModel = initTokenBlocklistModel(sequelize);
const FavoriteModel: typeof Favorite = initFavoriteModel(sequelize);
const AuditLogModel: typeof AuditLog = initAuditLogModel(sequelize);

// ConsoleEmailSender only when no Resend key is configured — otherwise the rest of
// the app (login, the plain property feed) still boots and works either way, same
// pattern as mlsClient/aiClient below.
const emailSender: EmailSender = env.resendApiKey
  ? new ResendEmailSender(env.resendApiKey, env.resendFromEmail, env.appBaseUrl)
  : new ConsoleEmailSender();

// Real MLS integration against SimplyRETS's public demo API — see mlsClient.ts for
// why this is real-shaped MLS data flow even though the listings are a fixed demo
// set, and how to point this at a real paid provider later via env vars.
const mlsClient: MlsClient = new SimplyRetsMlsClient(
  env.simplyRetsBaseUrl,
  env.simplyRetsUsername,
  env.simplyRetsPassword,
);

// AnthropicAiClient only when a key is actually configured — otherwise StubAiClient,
// which always throws AnthropicNotConfiguredError. This follows the same pattern as
// mlsClient/emailSender above: the rest of the app (login, the plain property feed)
// still boots and works with no key configured; only POST /search returns a 503
// until ANTHROPIC_API_KEY is set.
const aiClient: AiClient = env.anthropicApiKey
  ? new AnthropicAiClient(env.anthropicApiKey, env.anthropicModel)
  : new StubAiClient();

const app = createApp({
  userModel: UserModel,
  resetTokenModel: ResetTokenModel,
  blocklistModel: BlocklistModel,
  favoriteModel: FavoriteModel,
  auditLogModel: AuditLogModel,
  emailSender,
  mlsClient,
  aiClient,
  jwtSecret: env.jwtSecret,
  nodeEnv: env.nodeEnv,
  corsOrigin: env.corsOrigin,
});

app.listen(env.port, () => {
  console.log(`Keysy backend listening on port ${env.port}`);
});

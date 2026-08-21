import { createApp } from './app';
import { env } from './config/env';
import { createSequelize } from './config/database';
import { Favorite, initFavoriteModel } from './models/Favorite';
import { initPasswordResetTokenModel } from './models/PasswordResetToken';
import { initTokenBlocklistModel } from './models/TokenBlocklist';
import { initUserModel } from './models/User';
import { StubMlsClient } from './services/mlsClient';
import { ConsoleEmailSender } from './services/notificationService';

if (!env.jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}

const sequelize = createSequelize();
const UserModel = initUserModel(sequelize);
const ResetTokenModel = initPasswordResetTokenModel(sequelize);
const BlocklistModel = initTokenBlocklistModel(sequelize);
const FavoriteModel: typeof Favorite = initFavoriteModel(sequelize);

// ConsoleEmailSender is a placeholder — replace with a Mandrill-backed EmailSender
// before password-reset emails need to actually reach a real user.
const emailSender = new ConsoleEmailSender();

// StubMlsClient is a placeholder — replace with a real MLS-backed MlsClient before
// the property feed reaches a real user (no MLS provider credentials exist yet).
const mlsClient = new StubMlsClient();

const app = createApp({
  userModel: UserModel,
  resetTokenModel: ResetTokenModel,
  blocklistModel: BlocklistModel,
  favoriteModel: FavoriteModel,
  emailSender,
  mlsClient,
  jwtSecret: env.jwtSecret,
  nodeEnv: env.nodeEnv,
});

app.listen(env.port, () => {
  console.log(`Keysy backend listening on port ${env.port}`);
});

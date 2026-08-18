import { createApp } from './app';
import { env } from './config/env';
import { createSequelize } from './config/database';
import { initPasswordResetTokenModel } from './models/PasswordResetToken';
import { initTokenBlocklistModel } from './models/TokenBlocklist';
import { initUserModel } from './models/User';
import { ConsoleEmailSender } from './services/notificationService';

if (!env.jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}

const sequelize = createSequelize();
const UserModel = initUserModel(sequelize);
const ResetTokenModel = initPasswordResetTokenModel(sequelize);
const BlocklistModel = initTokenBlocklistModel(sequelize);

// ConsoleEmailSender is a placeholder — replace with a Mandrill-backed EmailSender
// before password-reset emails need to actually reach a real user.
const emailSender = new ConsoleEmailSender();

const app = createApp({
  userModel: UserModel,
  resetTokenModel: ResetTokenModel,
  blocklistModel: BlocklistModel,
  emailSender,
  jwtSecret: env.jwtSecret,
  nodeEnv: env.nodeEnv,
});

app.listen(env.port, () => {
  console.log(`Keysy backend listening on port ${env.port}`);
});

import { Express } from 'express';
import { Sequelize } from 'sequelize';
import { createApp } from '../app';
import { initPasswordResetTokenModel, PasswordResetToken } from '../models/PasswordResetToken';
import { initTokenBlocklistModel, TokenBlocklist } from '../models/TokenBlocklist';
import { initUserModel, User } from '../models/User';
import { CapturingEmailSender } from './capturingEmailSender';

export interface TestApp {
  sequelize: Sequelize;
  UserModel: typeof User;
  ResetTokenModel: typeof PasswordResetToken;
  BlocklistModel: typeof TokenBlocklist;
  emailSender: CapturingEmailSender;
  app: Express;
}

export async function createTestApp(jwtSecret = 'test-secret'): Promise<TestApp> {
  const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
  const UserModel = initUserModel(sequelize);
  const ResetTokenModel = initPasswordResetTokenModel(sequelize);
  const BlocklistModel = initTokenBlocklistModel(sequelize);
  await sequelize.sync();

  const emailSender = new CapturingEmailSender();

  const app = createApp({
    userModel: UserModel,
    resetTokenModel: ResetTokenModel,
    blocklistModel: BlocklistModel,
    emailSender,
    jwtSecret,
    nodeEnv: 'test',
  });

  return { sequelize, UserModel, ResetTokenModel, BlocklistModel, emailSender, app };
}

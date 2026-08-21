import { Express } from 'express';
import { Sequelize } from 'sequelize';
import { createApp } from '../app';
import { Favorite, initFavoriteModel } from '../models/Favorite';
import { initPasswordResetTokenModel, PasswordResetToken } from '../models/PasswordResetToken';
import { initTokenBlocklistModel, TokenBlocklist } from '../models/TokenBlocklist';
import { initUserModel, User } from '../models/User';
import { MlsClient, StubMlsClient } from '../services/mlsClient';
import { CapturingEmailSender } from './capturingEmailSender';

export interface TestApp {
  sequelize: Sequelize;
  UserModel: typeof User;
  ResetTokenModel: typeof PasswordResetToken;
  BlocklistModel: typeof TokenBlocklist;
  FavoriteModel: typeof Favorite;
  emailSender: CapturingEmailSender;
  app: Express;
}

export async function createTestApp(jwtSecret = 'test-secret', mlsClient: MlsClient = new StubMlsClient()): Promise<TestApp> {
  const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
  const UserModel = initUserModel(sequelize);
  const ResetTokenModel = initPasswordResetTokenModel(sequelize);
  const BlocklistModel = initTokenBlocklistModel(sequelize);
  const FavoriteModel = initFavoriteModel(sequelize);
  await sequelize.sync();

  const emailSender = new CapturingEmailSender();

  const app = createApp({
    userModel: UserModel,
    resetTokenModel: ResetTokenModel,
    blocklistModel: BlocklistModel,
    favoriteModel: FavoriteModel,
    emailSender,
    mlsClient,
    jwtSecret,
    nodeEnv: 'test',
  });

  return { sequelize, UserModel, ResetTokenModel, BlocklistModel, FavoriteModel, emailSender, app };
}

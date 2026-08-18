import { Sequelize } from 'sequelize';
import { env } from './env';

export function createSequelize(): Sequelize {
  return new Sequelize({
    dialect: 'postgres',
    host: env.db.host,
    port: env.db.port,
    database: env.db.name,
    username: env.db.user,
    password: env.db.password,
    logging: false,
  });
}

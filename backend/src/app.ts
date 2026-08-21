import express, { Express, NextFunction, Request, Response } from 'express';
import { createCorsMiddleware } from './middleware/cors';
import { requireHttps } from './middleware/requireHttps';
import { Favorite } from './models/Favorite';
import { PasswordResetToken } from './models/PasswordResetToken';
import { TokenBlocklist } from './models/TokenBlocklist';
import { User } from './models/User';
import { createAuthRouter } from './routes/authRoutes';
import { createFavoritesRouter } from './routes/favoritesRoutes';
import { createPropertyRouter } from './routes/propertyRoutes';
import { MlsClient } from './services/mlsClient';
import { EmailSender } from './services/notificationService';

export interface AppDependencies {
  userModel: typeof User;
  resetTokenModel: typeof PasswordResetToken;
  blocklistModel: typeof TokenBlocklist;
  favoriteModel: typeof Favorite;
  emailSender: EmailSender;
  mlsClient: MlsClient;
  jwtSecret: string;
  nodeEnv: string;
  corsOrigin?: string;
}

export function createApp(deps: AppDependencies): Express {
  const app = express();

  if (deps.nodeEnv === 'production') {
    // Behind a reverse proxy, req.secure only reflects the proxy's own connection, so
    // trust its X-Forwarded-Proto header instead — that's what requireHttps checks.
    app.set('trust proxy', 1);
    app.use(requireHttps);
  }

  app.use(createCorsMiddleware(deps.corsOrigin));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/auth', createAuthRouter(deps));
  app.use('/properties', createPropertyRouter({ mlsClient: deps.mlsClient }));
  app.use(
    '/favorites',
    createFavoritesRouter({
      favoriteModel: deps.favoriteModel,
      blocklistModel: deps.blocklistModel,
      jwtSecret: deps.jwtSecret,
    }),
  );

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const errorClass = err instanceof Error ? err.constructor.name : 'UnknownError';
    console.error(JSON.stringify({ level: 'error', event: 'unhandled_route_error', error_class: errorClass }));
    res.status(500).json({ error: 'InternalServerError' });
  });

  return app;
}

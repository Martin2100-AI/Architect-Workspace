import path from 'path';
import dotenv from 'dotenv';

/**
 * Loads the repo-root .env file (not a backend-local one — there isn't one) into
 * process.env before config/env.ts reads it. This file lives at
 * backend/src/config (dev, via ts-node-dev) or backend/dist/config (build), so
 * three levels up reaches the repo root in both cases. Import this file FIRST,
 * before anything that reads env.ts, so process.env is populated before those
 * reads happen.
 */
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

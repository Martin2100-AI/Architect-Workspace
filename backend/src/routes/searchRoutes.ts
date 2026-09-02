import { Router } from 'express';
import { z } from 'zod';
import { AiClient, AnthropicNotConfiguredError, AnthropicUpstreamError } from '../services/anthropicClient';
import { AiResponseParseError, searchProperties } from '../services/aiSearchService';
import { MlsClient, MlsUnavailableError } from '../services/mlsClient';

const searchRequestSchema = z.object({
  userQuery: z.string().min(1),
  activeFilters: z.record(z.unknown()).optional(),
});

export interface SearchRouterDependencies {
  aiClient: AiClient;
  mlsClient: MlsClient;
}

export function createSearchRouter(deps: SearchRouterDependencies): Router {
  const { aiClient, mlsClient } = deps;
  const router = Router();

  router.post('/', async (req, res, next) => {
    const parseResult = searchRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'ValidationError', details: parseResult.error.flatten() });
      return;
    }

    try {
      const allProperties = await mlsClient.getPropertyFeed();
      const outcome = await searchProperties(
        aiClient,
        allProperties,
        parseResult.data.userQuery,
        parseResult.data.activeFilters ?? {},
      );
      res.status(200).json(outcome);
    } catch (err) {
      if (err instanceof AnthropicNotConfiguredError) {
        res.status(503).json({ error: 'AiSearchNotConfigured' });
        return;
      }
      if (err instanceof AnthropicUpstreamError) {
        res.status(503).json({ error: 'AiSearchUnavailable' });
        return;
      }
      if (err instanceof MlsUnavailableError) {
        res.status(503).json({ error: 'MlsUnavailable' });
        return;
      }
      if (err instanceof AiResponseParseError) {
        res.status(502).json({ error: 'AiSearchBadResponse' });
        return;
      }
      next(err);
    }
  });

  return router;
}

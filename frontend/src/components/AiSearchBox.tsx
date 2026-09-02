import React, { useState } from 'react';
import { PropertyCard } from './PropertyCard';
import {
  AiSearchNotConfiguredError,
  AiSearchUnavailableError,
  searchProperties,
  SearchResultItem,
} from '../services/searchService';

type SearchState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'clarification-needed'; message: string }
  | { status: 'results'; results: SearchResultItem[] }
  | { status: 'not-configured' }
  | { status: 'error' };

interface AiSearchBoxProps {
  favoritedIds: Set<string>;
}

export function AiSearchBox({ favoritedIds }: AiSearchBoxProps): JSX.Element {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ status: 'idle' });

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!query.trim()) return;

    setState({ status: 'searching' });
    try {
      const response = await searchProperties(query);
      if (response.filters.clarificationNeeded) {
        setState({ status: 'clarification-needed', message: response.filters.clarificationNeeded });
        return;
      }
      setState({ status: 'results', results: response.results });
    } catch (err) {
      if (err instanceof AiSearchNotConfiguredError) {
        setState({ status: 'not-configured' });
        return;
      }
      if (err instanceof AiSearchUnavailableError) {
        setState({ status: 'error' });
        return;
      }
      setState({ status: 'error' });
    }
  }

  return (
    <section className="ai-search" aria-label="Search homes by description">
      <form className="ai-search__form" onSubmit={handleSubmit}>
        <label htmlFor="ai-search-input" className="ai-search__label">
          Describe the home you&apos;re looking for
        </label>
        <div className="ai-search__row">
          <input
            id="ai-search-input"
            type="text"
            className="ai-search__input"
            placeholder="e.g. 3-bedroom homes in Springfield with a pool"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="ai-search__submit" disabled={state.status === 'searching' || !query.trim()}>
            {state.status === 'searching' ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {state.status === 'clarification-needed' && (
        <p role="alert" className="ai-search__clarification">
          {state.message}
        </p>
      )}

      {state.status === 'not-configured' && (
        <p role="alert" className="ai-search__error">
          AI search isn&apos;t set up on this server yet. You can still browse all homes below.
        </p>
      )}

      {state.status === 'error' && (
        <p role="alert" className="ai-search__error">
          Something went wrong running that search. Please try again.
        </p>
      )}

      {state.status === 'results' && state.results.length === 0 && (
        <p role="status" className="ai-search__empty">
          No homes matched that search.
        </p>
      )}

      {state.status === 'results' && state.results.length > 0 && (
        <>
          <h2 className="ai-search__results-heading">Search results</h2>
          <div className="ai-search__grid" data-testid="ai-search-results">
            {state.results.map((result) => (
              <PropertyCard
                key={result.property.id}
                property={result.property}
                initiallyFavorited={favoritedIds.has(result.property.id)}
                matchInfo={{
                  matchedCriteria: result.matchedCriteria,
                  unmatchedCriteria: result.unmatchedCriteria,
                  overallFit: result.overallFit,
                }}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

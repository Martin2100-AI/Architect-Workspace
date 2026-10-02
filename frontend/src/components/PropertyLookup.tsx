import React, { useState } from 'react';
import './PropertyLookup.css';
import { LOOKUP_FIELDS, LookupField } from '../utils/propertyLookup';

interface PropertyLookupProps {
  onSearch: (field: LookupField, value: string) => void;
  onClear: () => void;
  /** Validation message for the last search (e.g. a malformed zip), if any. */
  error: string | null;
}

/** One search box + a "Search by" picker. Filtering itself lives in utils/propertyLookup. */
export function PropertyLookup({ onSearch, onClear, error }: PropertyLookupProps): JSX.Element {
  const [field, setField] = useState<LookupField>('zip');
  const [value, setValue] = useState('');
  const placeholder = LOOKUP_FIELDS.find((f) => f.value === field)?.placeholder;

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();
    onSearch(field, value);
  }

  function handleClear(): void {
    setValue('');
    onClear();
  }

  return (
    <form className="property-lookup" role="search" aria-label="Search homes" onSubmit={handleSubmit}>
      <label htmlFor="property-lookup-field" className="property-lookup__label">
        Search by
      </label>
      <label htmlFor="property-lookup-value" className="property-lookup__label">
        Value
      </label>
      <select
        id="property-lookup-field"
        className="property-lookup__field"
        value={field}
        onChange={(e) => setField(e.target.value as LookupField)}
      >
        {LOOKUP_FIELDS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      <input
        id="property-lookup-value"
        type="text"
        className="property-lookup__value"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'property-lookup-error' : undefined}
      />
      <div className="property-lookup__actions">
        <button type="submit" className="property-lookup__submit">
          Search
        </button>
        <button type="button" className="property-lookup__clear" onClick={handleClear}>
          Clear
        </button>
      </div>
      {error && (
        <p id="property-lookup-error" role="alert" className="property-lookup__error">
          {error}
        </p>
      )}
    </form>
  );
}

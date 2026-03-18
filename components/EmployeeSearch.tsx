import React, { useState, useRef, useCallback } from 'react';
import { Employee } from '../lib/types';
import { isInternalUser } from '../lib/utils';
import styles from '../styles/form.module.css';

type UserFilter = 'all' | 'internal' | 'external';

interface EmployeeSearchProps {
  onEmployeeSelected: (employee: Employee) => void;
}

export default function EmployeeSearch({ onEmployeeSelected }: EmployeeSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<UserFilter>('all');

  // Refs for debounce and request cancellation
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectEmployee = (employee: Employee) => {
    onEmployeeSelected(employee);
    setQuery('');
    setResults([]);
    setError(null);
  };

  const applyFilter = useCallback(
    (users: Employee[]): Employee[] => {
      if (filter === 'internal') return users.filter((u) => isInternalUser(u));
      if (filter === 'external') return users.filter((u) => !isInternalUser(u));
      return users;
    },
    [filter]
  );

  const doSearch = useCallback(
    async (searchQuery: string) => {
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (searchQuery.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/graph/search-users?query=${encodeURIComponent(searchQuery)}`,
          { signal: controller.signal }
        );
        const data = await response.json();

        // Only process if this request wasn't aborted
        if (!controller.signal.aborted) {
          if (!response.ok) {
            setError((data as any).details || 'Suche fehlgeschlagen');
            setResults([]);
          } else {
            setResults(data.users || []);
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError('Verbindung zum Suchdienst fehlgeschlagen.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    []
  );

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);

    // Clear results immediately when query is cleared
    if (searchQuery.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      return;
    }

    // Debounce: 300ms
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      doSearch(searchQuery);
    }, 300);
  };

  const filteredResults = applyFilter(results);

  return (
    <div className={styles.searchContainer}>
      <h2 className={styles.searchLabel}>Mitarbeiter finden</h2>

      <div className={styles.searchInputWrapper}>
        <i className={styles.searchIcon}>🔍</i>
        <input
          type="text"
          placeholder="Suchen nach Name oder E-Mail..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className={styles.searchInput}
          autoComplete="off"
        />
      </div>

      {/* Filter dropdown */}
      <div className={styles.filterRow}>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as UserFilter)}
          className={styles.filterSelect}
        >
          <option value="all">Alle Benutzer</option>
          <option value="internal">Interne (@beratungscontor.de)</option>
          <option value="external">Externe Benutzer</option>
        </select>
      </div>

      {query.length > 0 && query.length < 2 && (
        <p className={styles.searchHint}>Geben Sie mindestens 2 Zeichen ein</p>
      )}

      {loading && <div className={styles.loading}>Suchen...</div>}
      {error && <div className={styles.error}>{error}</div>}

      {filteredResults.length > 0 && (
        <div className={styles.searchResults}>
          {filteredResults.map((employee) => (
            <div
              key={employee.id}
              className={styles.resultItem}
              onClick={() => selectEmployee(employee)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && selectEmployee(employee)}
            >
              <div className={styles.resultAvatar}>
                {employee.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={employee.photoUrl} alt="Avatar" className={styles.avatarImage} />
                ) : (
                  employee.displayName?.charAt(0).toUpperCase() || '?'
                )}
              </div>
              <div className={styles.resultInfo}>
                <div className={styles.resultName}>
                  {employee.displayName}
                  {!isInternalUser(employee) && (
                    <span className={styles.externalBadge}>extern</span>
                  )}
                </div>
                <div className={styles.resultEmail}>{employee.userPrincipalName}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && query.length >= 2 && filteredResults.length === 0 && (
        <p className={styles.searchHint}>Keine Mitarbeiter gefunden für &quot;{query}&quot;</p>
      )}
    </div>
  );
}
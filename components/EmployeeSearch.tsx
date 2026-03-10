import { useState } from 'react';
import { Employee } from '../lib/types';
import styles from '../styles/form.module.css';

interface EmployeeSearchProps {
  onEmployeeSelected: (employee: Employee) => void;
}

export default function EmployeeSearch({ onEmployeeSelected }: EmployeeSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectEmployee = (employee: Employee) => {
    onEmployeeSelected(employee);
    // Clear search UI to avoid stale selection confusion
    setQuery('');
    setResults([]);
    setError(null);
  };

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/graph/search-users?query=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (!response.ok) {
        setError((data as any).details || 'Failed to search employees');
        setResults([]);
      } else {
        setResults(data.users || []);
      }
    } catch {
      setError('Failed to connect to the search service.');
    } finally {
      setLoading(false);
    }
  };

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

      {query.length > 0 && query.length < 2 && (
        <p className={styles.searchHint}>Geben Sie mindestens 2 Zeichen ein</p>
      )}

      {loading && <div className={styles.loading}>Suchen...</div>}
      {error && <div className={styles.error}>{error}</div>}

      {results.length > 0 && (
        <div className={styles.searchResults}>
          {results.map((employee) => (
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
                <div className={styles.resultName}>{employee.displayName}</div>
                <div className={styles.resultEmail}>{employee.userPrincipalName}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && query.length >= 2 && results.length === 0 && (
        <p className={styles.searchHint}>Keine Mitarbeiter gefunden für "{query}"</p>
      )}
    </div>
  );
}
'use client';

import React, { useMemo, useState, useRef, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { Employee } from '../lib/types';
import { isInternalUser } from '../lib/utils';
import styles from '../styles/form.module.css';

type BulkAttr =
  | 'businessPhones'
  | 'officeLocation'
  | 'department'
  | 'companyName'
  | 'streetAddress'
  | 'city'
  | 'state'
  | 'postalCode'
  | 'country';

const BULK_ATTRS: { value: BulkAttr; label: string; placeholder: string }[] = [
  { value: 'businessPhones', label: 'Büro-Telefon', placeholder: 'z. B. +49 30 123456' },
  { value: 'officeLocation', label: 'Büro-Standort', placeholder: 'z. B. Berlin, Gebäude A' },
  { value: 'department', label: 'Abteilung', placeholder: 'z. B. IT' },
  { value: 'companyName', label: 'Firma', placeholder: 'z. B. Muster GmbH' },
  { value: 'streetAddress', label: 'Straße', placeholder: 'z. B. Musterstraße 1' },
  { value: 'city', label: 'Ort', placeholder: 'z. B. Berlin' },
  { value: 'state', label: 'Bundesland', placeholder: 'z. B. Berlin' },
  { value: 'postalCode', label: 'PLZ', placeholder: 'z. B. 10115' },
  { value: 'country', label: 'Land', placeholder: 'z. B. Deutschland' },
];

/**
 * Get the current value for a given attribute from an employee.
 */
function getCurrentValue(employee: Employee, attr: BulkAttr): string {
  if (attr === 'businessPhones') {
    return employee.businessPhones?.[0] || '';
  }
  return (employee as any)[attr] || '';
}

export default function BulkUpdateSelected() {
  const { accounts } = useMsal();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Employee[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingApply, setLoadingApply] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [attribute, setAttribute] = useState<BulkAttr>('officeLocation');
  const [value, setValue] = useState('');
  const [showReview, setShowReview] = useState(false);

  // Debounce & cancellation
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const attrMeta = useMemo(() => BULK_ATTRS.find((a) => a.value === attribute), [attribute]);

  const isSelected = (id: string) => selected.some((u) => u.id === id);

  const addSelected = (emp: Employee) => {
    if (isSelected(emp.id)) return;

    // Block external users
    if (!isInternalUser(emp)) {
      setError('Externe Benutzer können nicht in Massenänderungen aufgenommen werden.');
      return;
    }

    setError(null);
    setSelected((prev) => [...prev, emp]);
  };

  const removeSelected = (id: string) => {
    setSelected((prev) => prev.filter((u) => u.id !== id));
  };

  const clearSelection = () => setSelected([]);

  const doSearch = useCallback(async (searchQuery: string) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();

    if (searchQuery.trim().length < 2) {
      setResults([]);
      setLoadingSearch(false);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoadingSearch(true);
    try {
      const response = await fetch(
        `/api/graph/search-users?query=${encodeURIComponent(searchQuery)}`,
        { signal: controller.signal }
      );
      const data = await response.json();
      if (!controller.signal.aborted) {
        if (!response.ok) {
          setError(data.details || data.error || 'Suche fehlgeschlagen.');
          setResults([]);
        } else {
          setResults(data.users || []);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('Netzwerkfehler bei der Suche.');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoadingSearch(false);
      }
    }
  }, []);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    setSuccess(null);
    setError(null);

    if (searchQuery.trim().length < 2) {
      setResults([]);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      doSearch(searchQuery);
    }, 300);
  };

  const applyBulk = async () => {
    const trimmed = value.trim();
    if (selected.length === 0) {
      setError('Bitte mindestens einen Mitarbeiter auswählen.');
      return;
    }
    if (!trimmed) {
      setError('Bitte einen Wert eingeben.');
      return;
    }

    setLoadingApply(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/graph/bulk-update-selected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selected.map((u) => u.id),
          updates: {
            [attribute]: attribute === 'businessPhones' ? [trimmed] : trimmed,
          },
          changedBy: accounts[0]?.username || 'unknown',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.details || data.error || 'Massenänderung fehlgeschlagen.');
        return;
      }
      setSuccess(`✓ ${data.updated} von ${data.total} aktualisiert.${data.failed ? ` ${data.failed} fehlgeschlagen.` : ''}`);
      setShowReview(false);
    } catch {
      setError('Netzwerkfehler. Bitte erneut versuchen.');
    } finally {
      setLoadingApply(false);
    }
  };

  return (
    <div className={`${styles.searchContainer}`} style={{ marginTop: 'var(--space-xl)', paddingTop: 'var(--space-xl)', borderTop: '1px solid var(--clr-border)' }}>
      <h2 className={styles.searchLabel}>Massenänderung (Auswahl)</h2>
      <p className={styles.searchHint} style={{ marginTop: '-6px' }}>
        Wählen Sie interne Mitarbeiter aus und setzen Sie ein gemeinsames Feld.
      </p>

      <div className={styles.searchInputWrapper}>
        <i className={styles.searchIcon}>🔎</i>
        <input
          type="text"
          placeholder="Mitarbeiter suchen…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className={styles.searchInput}
          autoComplete="off"
        />
      </div>

      {loadingSearch && <div className={styles.loading}>Suchen…</div>}

      {results.length > 0 && (
        <div className={styles.searchResults}>
          {results.map((employee) => {
            const isExternal = !isInternalUser(employee);
            return (
              <div
                key={employee.id}
                className={styles.resultItem}
                role="button"
                tabIndex={0}
                onClick={() => addSelected(employee)}
                onKeyDown={(e) => e.key === 'Enter' && addSelected(employee)}
                style={{
                  opacity: isSelected(employee.id) ? 0.55 : isExternal ? 0.5 : 1,
                  cursor: isExternal ? 'not-allowed' : 'pointer',
                }}
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
                    {isExternal && <span className={styles.externalBadge}>extern</span>}
                  </div>
                  <div className={styles.resultEmail}>{employee.userPrincipalName}</div>
                </div>
                <div style={{ marginLeft: 'auto', fontWeight: 700, opacity: 0.8 }}>
                  {isSelected(employee.id) ? '✓' : isExternal ? '🚫' : '+'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div className={styles.searchHint}><strong>Ausgewählt:</strong> {selected.length} (max. 100)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {selected.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => removeSelected(u.id)}
                className={styles.tab}
                style={{ padding: '6px 10px', borderRadius: '999px' }}
                title="Entfernen"
              >
                {u.displayName} ×
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className={styles.cancelButton} onClick={clearSelection}>
              Auswahl leeren
            </button>
          </div>
        </div>
      )}

      <div className={styles.formGroup} style={{ marginTop: '6px' }}>
        <label>Attribut</label>
        <select
          value={attribute}
          onChange={(e) => setAttribute(e.target.value as BulkAttr)}
          className={styles.searchInput}
          style={{ paddingLeft: 'var(--space-md)' }}
          disabled={loadingApply}
        >
          {BULK_ATTRS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.formGroup}>
        <label>Neuer Wert</label>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={attrMeta?.placeholder}
          className={styles.searchInput}
          disabled={loadingApply}
        />
      </div>

      <button
        type="button"
        className={styles.submitButton}
        onClick={() => setShowReview(true)}
        disabled={loadingApply || selected.length === 0}
        style={{ width: '100%' }}
      >
        Überprüfen & Anwenden
      </button>

      {error && <div className={styles.errorMessage} style={{ marginTop: '8px' }}>✕ {error}</div>}
      {success && <div className={styles.successMessage} style={{ marginTop: '8px' }}>{success}</div>}

      {/* Review modal with per-user current/new values */}
      {showReview && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Überprüfen</h2>
            <p style={{ marginTop: 0 }}>
              Sie ändern <strong>{attrMeta?.label}</strong> für <strong>{selected.length}</strong> Mitarbeiter auf:
            </p>
            <div className={styles.changeDetail} style={{ justifyContent: 'flex-start' }}>
              <span className={styles.new}>{value.trim()}</span>
            </div>

            {/* Per-user diff table */}
            <div style={{ marginTop: '12px', maxHeight: '300px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--clr-border)' }}>
                    <th style={{ textAlign: 'left', padding: '6px 4px' }}>Mitarbeiter</th>
                    <th style={{ textAlign: 'left', padding: '6px 4px' }}>Aktueller Wert</th>
                    <th style={{ textAlign: 'left', padding: '6px 4px' }}>Neuer Wert</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.map((u) => {
                    const current = getCurrentValue(u, attribute);
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--clr-border)' }}>
                        <td style={{ padding: '6px 4px' }}>
                          <div style={{ fontWeight: 600 }}>{u.displayName}</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{u.userPrincipalName}</div>
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <span className={styles.old}>{current || '—'}</span>
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <span className={styles.new}>{value.trim()}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => setShowReview(false)}
                className={styles.cancelButton}
                disabled={loadingApply}
              >
                Abbrechen
              </button>
              <button
                onClick={applyBulk}
                className={styles.confirmButton}
                disabled={loadingApply}
              >
                {loadingApply ? 'Wird angewendet…' : 'Anwenden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

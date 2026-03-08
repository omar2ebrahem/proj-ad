'use client';

import React, { useState } from 'react';
import styles from '../styles/form.module.css';

const BULK_ATTRIBUTES: { value: string; label: string; placeholder: string }[] = [
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

export default function BulkUpdate() {
  const [attribute, setAttribute] = useState(BULK_ATTRIBUTES[0].value);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ updated: number; failed: number; total: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentMeta = BULK_ATTRIBUTES.find((a) => a.value === attribute);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Bitte einen Wert eingeben.');
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch('/api/graph/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attribute,
          value: attribute === 'businessPhones' ? [trimmed] : trimmed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.details || data.error || 'Massenänderung fehlgeschlagen.');
        return;
      }
      setResult({
        updated: data.updated,
        failed: data.failed,
        total: data.total,
        errors: data.errors || [],
      });
      setValue('');
    } catch {
      setError('Netzwerkfehler. Bitte erneut versuchen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.searchContainer} ${styles.bulkSection}`}>
      <h2 className={styles.searchLabel}>Massenänderung</h2>
      <p className={styles.bulkHint}>
        Setzt ein Feld für alle Benutzer im Verzeichnis. Nur für Büro-, Adress- und Organisationsdaten.
      </p>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label>Attribut</label>
          <select
            value={attribute}
            onChange={(e) => setAttribute(e.target.value)}
            className={styles.searchInput}
          >
            {BULK_ATTRIBUTES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label>Neuer Wert (für alle)</label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={currentMeta?.placeholder}
            className={styles.searchInput}
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={loading}
          style={{ width: '100%', marginTop: '8px' }}
        >
          {loading ? 'Wird angewendet…' : 'Für alle anwenden'}
        </button>
      </form>
      {error && <div className={styles.errorMessage} style={{ marginTop: '8px' }}>✕ {error}</div>}
      {result && (
        <div className={styles.successMessage} style={{ marginTop: '8px' }}>
          ✓ {result.updated} von {result.total} aktualisiert.
          {result.failed > 0 && ` ${result.failed} fehlgeschlagen.`}
          {result.errors.length > 0 && (
            <details style={{ marginTop: '6px', fontSize: '0.85rem', opacity: 0.9 }}>
              <summary>Fehlerdetails</summary>
              <ul style={{ margin: '4px 0 0', paddingLeft: '1.2rem' }}>
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

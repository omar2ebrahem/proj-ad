import { useEffect, useState } from 'react';
import { AuditLog as AuditLogType } from '../lib/types';
import styles from '../styles/form.module.css';

interface AuditLogProps {
  employeeId: string;
  refreshKey?: string | null; // triggers re-fetch when a save completes
}

const FIELD_LABELS: Record<string, string> = {
  givenName: 'First Name',
  surname: 'Last Name',
  displayName: 'Display Name',
  mail: 'Email',
  mobilePhone: 'Mobile Phone',
  businessPhones: 'Office Phone',
  officeLocation: 'Office Location',
  jobTitle: 'Job Title',
  department: 'Department',
  companyName: 'Company',
  manager: 'Manager',
  streetAddress: 'Street Address',
  city: 'City',
  state: 'State',
  postalCode: 'Postal Code',
  country: 'Country',
};

export default function AuditLog({ employeeId, refreshKey }: AuditLogProps) {
  const [logs, setLogs] = useState<AuditLogType[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit/log?employeeId=${encodeURIComponent(employeeId)}`);
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, refreshKey]);

  if (!expanded && logs.length === 0 && !loading) return null;

  return (
    <div className={styles.auditLogSection}>
      <button
        className={styles.auditToggle}
        onClick={() => setExpanded((prev) => !prev)}
      >
        📋 Change History ({logs.length}) {expanded ? '▲' : '▼'}
      </button>

      {expanded && (
        <div className={styles.auditLog}>
          {loading && <p className={styles.loading}>Loading history...</p>}
          {!loading && logs.length === 0 && (
            <p className={styles.auditEmpty}>No changes recorded yet.</p>
          )}
          {logs.map((log) => (
            <div
              key={log.id}
              className={`${styles.logEntry} ${styles[log.status]}`}
            >
              <div className={styles.logHeader}>
                <span className={styles.logDate}>
                  {new Date(log.timestamp).toLocaleString()}
                </span>
                <span className={`${styles.logStatus} ${styles[log.status]}`}>
                  {log.status === 'success' ? '✓ Success' : '✕ Failed'}
                </span>
              </div>
              <div className={styles.logMeta}>Changed by: <strong>{log.changedBy}</strong></div>
              {log.errorMessage && (
                <div className={styles.logError}>Error: {log.errorMessage}</div>
              )}
              {log.changes && Object.keys(log.changes).length > 0 && (
                <div className={styles.logChanges}>
                  {Object.entries(log.changes).map(([field, change]) => (
                    <div key={field} className={styles.logChange}>
                      <span className={styles.logField}>{FIELD_LABELS[field] || field}:</span>
                      <span className={styles.logOld}>{change.old || '—'}</span>
                      <span className={styles.logArrow}>→</span>
                      <span className={styles.logNew}>{change.new || '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
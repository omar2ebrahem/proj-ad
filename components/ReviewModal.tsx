import { Employee } from '../lib/types';
import styles from '../styles/form.module.css';

interface ReviewModalProps {
  original: Employee;
  updated: Partial<Employee> & { managerUpn?: string };
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
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
  managerUpn: 'Manager',
  streetAddress: 'Street Address',
  city: 'City',
  state: 'State',
  postalCode: 'Postal Code',
  country: 'Country',
};

const REVIEW_FIELDS = [
  'givenName', 'surname', 'displayName', 'mail', 'mobilePhone',
  'officeLocation', 'jobTitle', 'department', 'companyName', 'managerUpn',
  'streetAddress', 'city', 'state', 'postalCode', 'country',
];

export default function ReviewModal({
  original,
  updated,
  onConfirm,
  onCancel,
  loading,
}: ReviewModalProps) {
  const changes: Record<string, { old: string; new: string }> = {};

  REVIEW_FIELDS.forEach((field) => {
    let oldVal: string;
    let newVal: string;

    if (field === 'managerUpn') {
      oldVal = original.manager?.userPrincipalName || '';
      newVal = updated.managerUpn || '';
    } else {
      const key = field as keyof Employee;
      const o = original[key];
      const n = (updated as any)[key];
      oldVal = Array.isArray(o) ? o[0] || '' : String(o || '');
      newVal = Array.isArray(n) ? n[0] || '' : String(n || '');
    }

    if (oldVal !== newVal) {
      changes[field] = { old: oldVal || '—', new: newVal || '—' };
    }
  });

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>Review Changes</h2>
        <p className={styles.modalSubtitle}>
          {Object.keys(changes).length} field{Object.keys(changes).length !== 1 ? 's' : ''} will be updated
        </p>

        <div className={styles.changesList}>
          {Object.keys(changes).length === 0 ? (
            <div className={styles.noChanges}>No changes detected</div>
          ) : (
            Object.entries(changes).map(([field, change]) => (
              <div key={field} className={styles.changeItem}>
                <div className={styles.fieldName}>{FIELD_LABELS[field] || field}</div>
                <div className={styles.changeDetail}>
                  <span className={styles.old}>{change.old}</span>
                  <span className={styles.arrow}>→</span>
                  <span className={styles.new}>{change.new}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.modalActions}>
          <button onClick={onCancel} className={styles.cancelButton} disabled={loading}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={styles.confirmButton}
            disabled={loading || Object.keys(changes).length === 0}
          >
            {loading ? '⏳ Saving...' : '✔ Confirm & Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
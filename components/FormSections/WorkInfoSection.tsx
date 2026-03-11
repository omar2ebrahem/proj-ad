import { Employee } from '../../lib/types';
import styles from '../../styles/form.module.css';

interface WorkInfoSectionProps {
  formData: Partial<Employee>;
  onChange: (field: string, value: string) => void;
}
export default function WorkInfoSection({ formData, onChange }: WorkInfoSectionProps) {
  return (
    <div className={styles.section}>
      <div className={styles.formGroup}>
        <label>Position</label>
        <input
          type="text"
          value={formData.jobTitle || ''}
          onChange={(e) => onChange('jobTitle', e.target.value)}
          placeholder="z.B. Software Engineer"
        />
      </div>

      <div className={styles.formGroup}>
        <label>Abteilung</label>
        <input
          type="text"
          value={formData.department || ''}
          onChange={(e) => onChange('department', e.target.value)}
          placeholder="z.B. IT-Abteilung"
        />
      </div>

      <div className={styles.formGroup}>
        <label>Firmenname</label>
        <input
          type="text"
          value={formData.companyName || ''}
          onChange={(e) => onChange('companyName', e.target.value)}
          placeholder="Firmenname"
        />
      </div>

      <div className={styles.formGroup}>
        <label>Manager-UPN</label>
        {/* We store manager UPN in a dedicated field 'managerUpn' so we
            don't accidentally overwrite the manager object from Graph API */}
        <input
          type="email"
          value={(formData as any).managerUpn ?? formData.manager?.userPrincipalName ?? ''}
          onChange={(e) => onChange('managerUpn', e.target.value)}
          placeholder="manager@firma.de"
        />
        {formData.manager?.displayName && (
          <span className={styles.helperText}>
            Aktuell: {formData.manager.displayName}
          </span>
        )}
      </div>
    </div>
  );
}

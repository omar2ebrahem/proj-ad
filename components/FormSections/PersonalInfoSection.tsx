import { Employee } from '../../lib/types';
import styles from '../../styles/form.module.css';

interface PersonalInfoSectionProps {
  formData: Partial<Employee>;
  onChange: (field: string, value: string) => void;
}

export default function PersonalInfoSection({ formData, onChange }: PersonalInfoSectionProps) {
  return (
    <div className={styles.section}>
      <div className={styles.formGroup}>
        <label>First Name <span className={styles.required}>*</span></label>
        <input
          type="text"
          value={formData.givenName || ''}
          onChange={(e) => onChange('givenName', e.target.value)}
          placeholder="First name"
        />
      </div>

      <div className={styles.formGroup}>
        <label>Last Name <span className={styles.required}>*</span></label>
        <input
          type="text"
          value={formData.surname || ''}
          onChange={(e) => onChange('surname', e.target.value)}
          placeholder="Last name"
        />
      </div>

      <div className={styles.formGroup}>
        <label>Display Name</label>
        <input
          type="text"
          value={formData.displayName || ''}
          onChange={(e) => onChange('displayName', e.target.value)}
          placeholder="Display name"
        />
      </div>

      <div className={styles.formGroup}>
        <label>Email Address</label>
        <input
          type="email"
          value={formData.mail || ''}
          onChange={(e) => onChange('mail', e.target.value)}
          placeholder="email@company.com"
        />
      </div>

      <div className={styles.formGroup}>
        <label>Mobile Phone</label>
        <input
          type="tel"
          value={formData.mobilePhone || ''}
          onChange={(e) => onChange('mobilePhone', e.target.value)}
          placeholder="+1 (555) 123-4567"
        />
      </div>

      <div className={styles.formGroup}>
        <label>Office Phone</label>
        <input
          type="tel"
          value={formData.businessPhones?.[0] || ''}
          onChange={(e) => onChange('businessPhones', e.target.value)}
          placeholder="+1 (555) 987-6543"
        />
      </div>

      <div className={styles.formGroup}>
        <label>Office Location</label>
        <input
          type="text"
          value={formData.officeLocation || ''}
          onChange={(e) => onChange('officeLocation', e.target.value)}
          placeholder="e.g. Building A, Floor 3"
        />
      </div>
    </div>
  );
}
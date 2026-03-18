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
        <label>Vorname <span className={styles.required}>*</span></label>
        <input
          type="text"
          value={formData.givenName || ''}
          onChange={(e) => onChange('givenName', e.target.value)}
          placeholder="Vorname"
        />
      </div>

      <div className={styles.formGroup}>
        <label>Nachname <span className={styles.required}>*</span></label>
        <input
          type="text"
          value={formData.surname || ''}
          onChange={(e) => onChange('surname', e.target.value)}
          placeholder="Nachname"
        />
      </div>

      <div className={styles.formGroup}>
        <label>Anzeigename</label>
        <input
          type="text"
          value={formData.displayName || ''}
          onChange={(e) => onChange('displayName', e.target.value)}
          placeholder="Anzeigename (z.B. Max Mustermann)"
        />
      </div>

      <div className={styles.formGroup}>
        <label>E-Mail-Adresse <span className={styles.readOnlyBadge}>(nur Anzeige)</span></label>
        <input
          type="email"
          value={formData.mail || ''}
          readOnly
          disabled
          className={styles.readOnlyInput}
          placeholder="email@firma.de"
        />
      </div>

      <div className={styles.formGroup}>
        <label>Mobiltelefon</label>
        <input
          type="tel"
          value={formData.mobilePhone || ''}
          onChange={(e) => onChange('mobilePhone', e.target.value)}
          placeholder="+49 151 1234567"
        />
      </div>

      <div className={styles.formGroup}>
        <label>Bürotelefon</label>
        <input
          type="tel"
          value={formData.businessPhones?.[0] || ''}
          onChange={(e) => onChange('businessPhones', e.target.value)}
          placeholder="+49 30 123456"
        />
      </div>

      <div className={styles.formGroup}>
        <label>Bürostandort</label>
        <input
          type="text"
          value={formData.officeLocation || ''}
          onChange={(e) => onChange('officeLocation', e.target.value)}
          placeholder="z.B. Gebäude A, 3. Stock"
        />
      </div>
    </div>
  );
}

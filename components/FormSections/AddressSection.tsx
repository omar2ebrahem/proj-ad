import { Employee } from '../../lib/types';
import styles from '../../styles/form.module.css';

interface AddressSectionProps {
  formData: Partial<Employee>;
  onChange: (field: string, value: string) => void;
}
export default function AddressSection({ formData, onChange }: AddressSectionProps) {
  return (
    <div className={styles.section}>
      <div className={styles.formGroup}>
        <label>Straße und Hausnummer</label>
        <input type="text" value={formData.streetAddress || ''} onChange={(e) => onChange('streetAddress', e.target.value)} placeholder="Musterstraße 1" />
      </div>
      <div className={styles.formGroup}>
        <label>Stadt</label>
        <input type="text" value={formData.city || ''} onChange={(e) => onChange('city', e.target.value)} placeholder="Stadt" />
      </div>
      <div className={styles.formGroup}>
        <label>Bundesland/Kanton</label>
        <input type="text" value={formData.state || ''} onChange={(e) => onChange('state', e.target.value)} placeholder="Z.B. Bayern" />
      </div>
      <div className={styles.formGroup}>
        <label>Postleitzahl</label>
        <input type="text" value={formData.postalCode || ''} onChange={(e) => onChange('postalCode', e.target.value)} placeholder="Postleitzahl" />
      </div>
      <div className={styles.formGroup}>
        <label>Land</label>
        <input type="text" value={formData.country || ''} onChange={(e) => onChange('country', e.target.value)} placeholder="Deutschland" />
      </div>
    </div>
  );
}

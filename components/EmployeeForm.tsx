import { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { Employee } from '../lib/types';
import PersonalInfoSection from './FormSections/PersonalInfoSection';
import WorkInfoSection from './FormSections/WorkInfoSection';
import AddressSection from './FormSections/AddressSection';
import ReviewModal from './ReviewModal';
import AuditLog from './AuditLog';
import { calculateChanges } from '../lib/utils';
import styles from '../styles/form.module.css';

interface EmployeeFormProps {
  employee: Employee;
}

// Fields Graph API accepts on PATCH /users/{id}
const PATCHABLE_FIELDS = [
  'givenName', 'surname', 'displayName', 'mail',
  'mobilePhone', 'officeLocation', 'jobTitle',
  'department', 'companyName', 'streetAddress',
  'city', 'state', 'postalCode', 'country',
] as const;

export default function EmployeeForm({ employee }: EmployeeFormProps) {
  const { accounts } = useMsal();
  const [formData, setFormData] = useState<Employee & { managerUpn?: string }>(employee);
  const [showReview, setShowReview] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'work' | 'address'>('personal');

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => {
      // businessPhones is stored as an array in Graph API
      if (field === 'businessPhones') {
        return { ...prev, businessPhones: value ? [value] : [] };
      }
      return { ...prev, [field]: value };
    });
    // Clear messages on edit
    setSuccess(null);
    setError(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    // Build a clean patch payload with only allowed fields
    const updates: Record<string, unknown> = {};
    for (const field of PATCHABLE_FIELDS) {
      const val = formData[field];
      if (val !== undefined) {
        updates[field] = val;
      }
    }
    // businessPhones requires array form
    if (formData.businessPhones !== undefined) {
      updates.businessPhones = formData.businessPhones;
    }

    const managerId = formData.managerUpn?.trim() || '';

    try {
      const response = await fetch('/api/graph/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: employee.id, updates, managerId }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Employee profile updated successfully!');
        setShowReview(false);

        // Log the successful change to audit endpoint
        const changes = calculateChanges(employee, formData);
        if (managerId && managerId !== (employee.manager?.userPrincipalName ?? '')) {
          changes['manager'] = {
            old: employee.manager?.userPrincipalName || '',
            new: managerId,
          };
        }
        await fetch('/api/audit/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            changedBy: accounts[0]?.username || 'unknown',
            employeeId: employee.id,
            employeeName: employee.displayName,
            changes,
            status: 'success',
          }),
        }).catch(() => { }); // non-blocking
      } else {
        const errMsg = (data as any).details || (data as any).error || 'Failed to update employee';
        setError(errMsg);

        // Log the failure too
        await fetch('/api/audit/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            changedBy: accounts[0]?.username || 'unknown',
            employeeId: employee.id,
            employeeName: employee.displayName,
            changes: {},
            status: 'failed',
            errorMessage: errMsg,
          }),
        }).catch(() => { });
      }
    } catch (err) {
      setError('An unexpected error occurred while updating the employee profile.');
    } finally {
      setLoading(false);
    }
  };

  const tabs: Array<{ key: 'personal' | 'work' | 'address'; label: string }> = [
    { key: 'personal', label: '👤 Personal Info' },
    { key: 'work', label: '💼 Work Info' },
    { key: 'address', label: '📍 Address' },
  ];

  return (
    <div className={styles.formContainer}>
      <div className={styles.employeeHeader}>
        <div className={styles.employeeAvatar}>
          {employee.displayName?.charAt(0).toUpperCase() || '?'}
        </div>
        <div>
          <h2 className={styles.employeeName}>{employee.displayName}</h2>
          <p className={styles.employeeUpn}>{employee.userPrincipalName}</p>
        </div>
      </div>

      <div className={styles.tabs}>
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            className={`${styles.tab} ${activeTab === key ? styles.active : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {success && <div className={styles.successMessage}>✓ {success}</div>}
      {error && <div className={styles.errorMessage}>✕ {error}</div>}

      <div className={styles.tabContent}>
        {activeTab === 'personal' && (
          <PersonalInfoSection formData={formData} onChange={handleFieldChange} />
        )}
        {activeTab === 'work' && (
          <WorkInfoSection formData={formData} onChange={handleFieldChange} />
        )}
        {activeTab === 'address' && (
          <AddressSection formData={formData} onChange={handleFieldChange} />
        )}
      </div>

      <div className={styles.actions}>
        <button
          className={styles.submitButton}
          onClick={() => setShowReview(true)}
          disabled={loading}
        >
          {loading ? '⏳ Saving...' : '✔ Review & Save'}
        </button>
      </div>

      {showReview && (
        <ReviewModal
          original={employee}
          updated={formData}
          onConfirm={handleSubmit}
          onCancel={() => setShowReview(false)}
          loading={loading}
        />
      )}

      <AuditLog employeeId={employee.id} refreshKey={success} />
    </div>
  );
}
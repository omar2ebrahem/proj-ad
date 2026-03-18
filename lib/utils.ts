import { Employee } from './types';

/**
 * Normalize a value to a plain string for comparison.
 * - null / undefined → ''
 * - arrays (businessPhones) → first element or ''
 * - trim whitespace
 */
function normalize(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (Array.isArray(val)) return (val[0] ?? '').toString().trim();
  return String(val).trim();
}

/**
 * Calculate changes between the original employee and updated data.
 * Returns only the fields that actually differ after normalization.
 * Excludes 'mail' (read-only).
 */
export function calculateChanges(
  original: Employee,
  updated: Partial<Employee>
): Record<string, { old: string; new: string }> {
  const changes: Record<string, { old: string; new: string }> = {};

  const fields = [
    'givenName', 'surname', 'displayName', 'mobilePhone',
    'businessPhones', 'officeLocation', 'jobTitle', 'department',
    'companyName', 'streetAddress', 'city', 'state', 'postalCode', 'country',
  ];

  fields.forEach((field) => {
    const key = field as keyof Employee;
    const oldVal = normalize(original[key]);
    const newVal = normalize((updated as any)[key]);

    if (oldVal !== newVal) {
      changes[field] = { old: oldVal || '', new: newVal || '' };
    }
  });

  return changes;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if a user is internal (mail ends with @beratungscontor.de).
 */
export function isInternalUser(employee: { mail?: string }): boolean {
  return (employee.mail || '').toLowerCase().endsWith('@beratungscontor.de');
}
/**
 * Audit store — delegates to Azure Table Storage.
 * This file preserves backward-compatible function signatures.
 */
import { AuditLog } from './types';
import { addAuditEntry, getAuditEntries } from './audit-table-storage';

export async function addAuditLog(
  entry: Omit<AuditLog, 'id' | 'timestamp'>
): Promise<AuditLog> {
  return addAuditEntry(entry);
}

export async function getAuditLogs(employeeId?: string): Promise<AuditLog[]> {
  return getAuditEntries(employeeId);
}

import { TableClient, AzureNamedKeyCredential, TableEntity } from '@azure/data-tables';
import { AuditLog } from './types';

const TABLE_NAME = 'AuditLog';

let tableClient: TableClient | null = null;

function getTableClient(): TableClient | null {
  if (tableClient) return tableClient;

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) return null;

  tableClient = TableClient.fromConnectionString(connectionString, TABLE_NAME);
  return tableClient;
}

/**
 * Ensure the Azure Table exists. Called lazily on first write.
 */
let tableCreated = false;
async function ensureTable(): Promise<void> {
  if (tableCreated) return;
  const client = getTableClient();
  if (!client) return;
  try {
    await client.createTable();
  } catch (err: any) {
    // 409 = table already exists — that's fine
    if (err?.statusCode !== 409) {
      console.warn('Failed to create audit table:', err?.message);
    }
  }
  tableCreated = true;
}

/**
 * Build a reverse-timestamp row key so that newest entries come first
 * when querying by partition key.
 */
function reverseTimestampRowKey(): string {
  const maxTs = 9999999999999; // max 13-digit timestamp
  const reverseTs = maxTs - Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${String(reverseTs).padStart(13, '0')}-${random}`;
}

// ── In-memory fallback (for local dev without Azure Storage) ──

const inMemoryLogs: AuditLog[] = [];

// ── Public API ──

export async function addAuditEntry(
  entry: Omit<AuditLog, 'id' | 'timestamp'>
): Promise<AuditLog> {
  const logEntry: AuditLog = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date(),
    ...entry,
  };

  const client = getTableClient();
  if (!client) {
    // Fallback to in-memory
    inMemoryLogs.unshift(logEntry);
    if (inMemoryLogs.length > 1000) inMemoryLogs.pop();
    return logEntry;
  }

  await ensureTable();

  const tableEntity: TableEntity = {
    partitionKey: entry.employeeId,
    rowKey: reverseTimestampRowKey(),
    changedBy: entry.changedBy,
    employeeName: entry.employeeName,
    changes: JSON.stringify(entry.changes),
    status: entry.status,
    errorMessage: entry.errorMessage || '',
    editType: entry.editType || 'single',
    logTimestamp: logEntry.timestamp.toISOString(),
  };

  try {
    await client.createEntity(tableEntity);
  } catch (err: any) {
    console.error('Failed to write audit log to Azure Table Storage:', err?.message);
    // Still push to in-memory as backup
    inMemoryLogs.unshift(logEntry);
  }

  return logEntry;
}

export async function getAuditEntries(employeeId?: string): Promise<AuditLog[]> {
  const client = getTableClient();
  if (!client) {
    // Fallback to in-memory
    const filtered = employeeId
      ? inMemoryLogs.filter((l) => l.employeeId === employeeId)
      : inMemoryLogs;
    return filtered.slice(0, 100);
  }

  await ensureTable();

  const logs: AuditLog[] = [];
  const maxResults = 100;

  try {
    let filter: string | undefined;
    if (employeeId) {
      filter = `PartitionKey eq '${employeeId}'`;
    }

    const entities = client.listEntities<TableEntity>({
      queryOptions: { filter },
    });

    for await (const entity of entities) {
      logs.push({
        id: `${entity.partitionKey}-${entity.rowKey}`,
        timestamp: new Date(entity.logTimestamp as string),
        changedBy: entity.changedBy as string,
        employeeId: entity.partitionKey as string,
        employeeName: entity.employeeName as string,
        changes: JSON.parse((entity.changes as string) || '{}'),
        status: entity.status as 'success' | 'failed',
        errorMessage: (entity.errorMessage as string) || undefined,
        editType: (entity.editType as 'single' | 'bulk') || 'single',
      });

      if (logs.length >= maxResults) break;
    }
  } catch (err: any) {
    console.error('Failed to read audit logs from Azure Table Storage:', err?.message);
    // Return whatever we have from in-memory
    const filtered = employeeId
      ? inMemoryLogs.filter((l) => l.employeeId === employeeId)
      : inMemoryLogs;
    return filtered.slice(0, maxResults);
  }

  return logs;
}

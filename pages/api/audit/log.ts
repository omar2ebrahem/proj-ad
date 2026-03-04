import type { NextApiRequest, NextApiResponse } from 'next';
import { AuditLog } from '../../../lib/types';

interface LogResponse {
  success: boolean;
  logId?: string;
  logs?: AuditLog[];
}

interface ErrorResponse {
  error: string;
}

// In-memory store (suitable for MVP/demo; replace with DB for production)
const auditLogs: AuditLog[] = [];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LogResponse | ErrorResponse>
) {
  if (req.method === 'POST') {
    const { changedBy, employeeId, employeeName, changes, status, errorMessage } = req.body;

    if (!changedBy || !employeeId || !status) {
      return res.status(400).json({ error: 'changedBy, employeeId and status are required' });
    }

    const logEntry: AuditLog = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date(),
      changedBy,
      employeeId,
      employeeName,
      changes,
      status,
      errorMessage,
    };

    auditLogs.unshift(logEntry); // newest first
    // Keep at most 500 entries in memory
    if (auditLogs.length > 500) auditLogs.pop();

    return res.status(200).json({ success: true, logId: logEntry.id });
  }

  if (req.method === 'GET') {
    const { employeeId } = req.query;
    const filtered = employeeId
      ? auditLogs.filter((l) => l.employeeId === employeeId)
      : auditLogs;
    return res.status(200).json({ success: true, logs: filtered.slice(0, 50) });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
import type { NextApiRequest, NextApiResponse } from 'next';
import { AuditLog } from '../../../lib/types';
import { addAuditLog, getAuditLogs } from '../../../lib/audit-store';

interface LogResponse {
  success: boolean;
  logId?: string;
  logs?: AuditLog[];
}

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LogResponse | ErrorResponse>
) {
  if (req.method === 'POST') {
    const { changedBy, employeeId, employeeName, changes, status, errorMessage, editType } = req.body;

    if (!changedBy || !employeeId || !status) {
      return res.status(400).json({ error: 'changedBy, employeeId and status are required' });
    }

    const logEntry = await addAuditLog({
      changedBy,
      employeeId,
      employeeName,
      changes,
      status,
      errorMessage,
      editType: editType || 'single',
    });

    return res.status(200).json({ success: true, logId: logEntry.id });
  }

  if (req.method === 'GET') {
    const { employeeId } = req.query;
    const logs = await getAuditLogs(typeof employeeId === 'string' ? employeeId : undefined);
    return res.status(200).json({
      success: true,
      logs,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getGraphAccessToken } from '../../../lib/graph-token';

/** Only attributes that are safe/sensible for bulk update (no personal identifiers). */
const BULK_ALLOWED_ATTRIBUTES = new Set([
  'businessPhones',
  'officeLocation',
  'department',
  'companyName',
  'streetAddress',
  'city',
  'state',
  'postalCode',
  'country',
]);

interface BulkUpdateBody {
  attribute: string;
  value: string | string[];
}

interface BulkUpdateResponse {
  updated: number;
  failed: number;
  total: number;
  errors: string[];
}

interface ErrorResponse {
  error: string;
  details?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BulkUpdateResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { attribute, value } = req.body as BulkUpdateBody;

  if (!attribute || !BULK_ALLOWED_ATTRIBUTES.has(attribute)) {
    return res.status(400).json({
      error: 'Invalid or disallowed attribute for bulk update',
      details: `Allowed: ${[...BULK_ALLOWED_ATTRIBUTES].join(', ')}`,
    });
  }

  const payloadValue =
    attribute === 'businessPhones'
      ? Array.isArray(value)
        ? value
        : [value].filter(Boolean)
      : typeof value === 'string'
        ? value
        : Array.isArray(value) && value.length
          ? value[0]
          : '';

  if (payloadValue === '' || (Array.isArray(payloadValue) && payloadValue.length === 0)) {
    return res.status(400).json({ error: 'Value is required' });
  }

  try {
    const accessToken = await getGraphAccessToken();
    const graphUrl = 'https://graph.microsoft.com/v1.0';
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const userIds: string[] = [];
    let nextLink: string | null = `${graphUrl}/users?$select=id&$top=999`;

    while (nextLink) {
      const listRes = await axios.get(nextLink, { headers });
      const users = listRes.data.value || [];
      userIds.push(...users.map((u: { id: string }) => u.id));
      nextLink = listRes.data['@odata.nextLink'] || null;
    }

    let updated = 0;
    const errors: string[] = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (userId) => {
          try {
            await axios.patch(
              `${graphUrl}/users/${userId}`,
              { [attribute]: payloadValue },
              { headers }
            );
            updated++;
          } catch (err: any) {
            const msg = err?.response?.data?.error?.message || err?.message || 'Unknown error';
            errors.push(`${userId}: ${msg}`);
          }
        })
      );
    }

    return res.status(200).json({
      updated,
      failed: errors.length,
      total: userIds.length,
      errors: errors.slice(0, 20),
    });
  } catch (error: any) {
    console.error('Bulk update error:', error);
    const details =
      error?.response?.data?.error?.message || (error instanceof Error ? error.message : 'Unknown error');
    return res.status(500).json({
      error: 'Bulk update failed',
      details,
    });
  }
}

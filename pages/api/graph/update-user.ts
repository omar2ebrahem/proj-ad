import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getGraphAccessToken } from '../../../lib/graph-token';

interface UpdateResponse {
  success: boolean;
  message: string;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

// Fields that can be PATCHed directly on the /users/{id} endpoint
const ALLOWED_GRAPH_FIELDS = new Set([
  'givenName',
  'surname',
  'displayName',
  'mobilePhone',
  'businessPhones',
  'officeLocation',
  'jobTitle',
  'department',
  'companyName',
  'streetAddress',
  'city',
  'state',
  'postalCode',
  'country',
]);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, updates, managerId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  try {
    const accessToken = await getGraphAccessToken();
    const graphUrl = 'https://graph.microsoft.com/v1.0';
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // Strip any fields that Graph API doesn't accept in a PATCH (e.g. id, manager object, userPrincipalName)
    if (updates && typeof updates === 'object') {
      const cleanPayload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (ALLOWED_GRAPH_FIELDS.has(key) && value !== undefined && value !== null) {
          cleanPayload[key] = value;
        }
      }

      if (Object.keys(cleanPayload).length > 0) {
        await axios.patch(`${graphUrl}/users/${userId}`, cleanPayload, { headers });
      }
    }

    // Manager is a separate PUT to /manager/$ref — must be done after the profile patch
    if (managerId && typeof managerId === 'string' && managerId.trim()) {
      // First resolve the managerId: if it looks like a UPN (contains @), look up the user's object ID
      let resolvedManagerId = managerId.trim();
      if (resolvedManagerId.includes('@')) {
        const managerLookup = await axios.get(
          `${graphUrl}/users/${encodeURIComponent(resolvedManagerId)}`,
          { headers, params: { $select: 'id' } }
        );
        resolvedManagerId = managerLookup.data.id;
      }

      const managerRef = { '@odata.id': `${graphUrl}/users/${resolvedManagerId}` };
      await axios.put(`${graphUrl}/users/${userId}/manager/$ref`, managerRef, { headers });
    }

    return res.status(200).json({ success: true, message: 'User updated successfully' });
  } catch (error: any) {
    console.error('Update error:', error);
    const details =
      error?.response?.data?.error?.message || (error instanceof Error ? error.message : 'Unknown error');
    return res.status(500).json({
      error: 'Failed to update user',
      details,
    });
  }
}
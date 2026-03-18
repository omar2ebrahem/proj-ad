import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { Buffer } from 'buffer';
import { getGraphAccessToken } from '../../../lib/graph-token';
import { Employee } from '../../../lib/types';

interface UserResponse {
  user: Employee;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'User ID required' });
  }

  try {
    const accessToken = await getGraphAccessToken();
    const headers = { Authorization: `Bearer ${accessToken}` };

    const userResponse = await axios.get(`https://graph.microsoft.com/v1.0/users/${id}`, {
      headers,
      params: {
        $select:
          'id,userPrincipalName,displayName,givenName,surname,mail,mobilePhone,officeLocation,businessPhones,jobTitle,department,companyName,streetAddress,city,state,postalCode,country',
        $expand: 'manager($select=id,displayName,userPrincipalName)',
      },
    });

    const user = userResponse.data;

    // Fetch photo
    let photoUrl: string | undefined;
    try {
      const photoResponse = await axios.get(
        `https://graph.microsoft.com/v1.0/users/${id}/photo/$value`,
        {
          headers,
          responseType: 'arraybuffer',
        }
      );

      if (photoResponse.data) {
        const base64 = Buffer.from(photoResponse.data, 'binary').toString('base64');
        const contentType = photoResponse.headers['content-type'] || 'image/jpeg';
        photoUrl = `data:${contentType};base64,${base64}`;
      }
    } catch {
      // No photo — that's fine
    }

    return res.status(200).json({
      user: {
        ...user,
        photoUrl,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      error: 'Failed to get user',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

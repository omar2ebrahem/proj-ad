import type { NextApiRequest, NextApiResponse } from 'next';
import { getGraphAccessToken } from '../../../lib/graph-token';

interface TokenResponse {
  accessToken: string;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TokenResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const accessToken = await getGraphAccessToken();
    return res.status(200).json({ accessToken });
  } catch (error) {
    console.error('Token generation error:', error);
    return res.status(500).json({
      error: 'Failed to generate access token',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
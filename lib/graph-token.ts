/**
 * Shared helper to obtain a Microsoft Graph access token
 * using client_credentials flow (service principal).
 * Used by all API route handlers.
 */

import axios from 'axios';

export async function getGraphAccessToken(): Promise<string> {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;
  const clientId = process.env.SERVICE_PRINCIPAL_CLIENT_ID;
  const clientSecret = process.env.SERVICE_PRINCIPAL_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Missing service principal credentials in environment variables');
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  // IMPORTANT: Microsoft token endpoint requires application/x-www-form-urlencoded,
  // NOT application/json. Using URLSearchParams sends the correct Content-Type.
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
  });

  const response = await axios.post(tokenUrl, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return response.data.access_token as string;
}

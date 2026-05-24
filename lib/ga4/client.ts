/**
 * Google service account JWT auth for GA4 Data API on Cloudflare Workers.
 */
import { createSign } from 'node:crypto';
import { env, isGa4Configured } from '@/lib/env';

interface ServiceAccountJson {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

/**
 * Returns true when GA4 credentials are configured.
 * @returns Whether GA4 enrichment can run.
 */
export function canUseGa4Api(): boolean {
  return isGa4Configured();
}

/**
 * Parses the service account JSON secret.
 * @returns Parsed service account object.
 */
function parseServiceAccount(): ServiceAccountJson {
  const raw = env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not configured');
  }
  return JSON.parse(raw) as ServiceAccountJson;
}

/**
 * Creates a signed JWT for Google OAuth token exchange.
 * @param sa - Service account credentials.
 * @returns Signed JWT string.
 */
function createServiceAccountJwt(sa: ServiceAccountJson): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      aud: sa.token_uri ?? 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url');

  const unsigned = `${header}.${payload}`;
  const sign = createSign('RSA-SHA256');
  sign.update(unsigned);
  sign.end();
  const signature = sign.sign(sa.private_key).toString('base64url');
  return `${unsigned}.${signature}`;
}

/**
 * Fetches a Google OAuth access token using service account JWT.
 * @returns Bearer access token.
 */
export async function getGoogleAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const sa = parseServiceAccount();
  const jwt = createServiceAccountJwt(sa);
  const tokenUri = sa.token_uri ?? 'https://oauth2.googleapis.com/token';

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

/** GA4 session data returned from Data API lookup. */
export interface Ga4SessionLookupResult {
  ga4_session_id: string;
  session_start: string | null;
  session_duration: number | null;
}

/**
 * Queries GA4 Data API for a ref_generated event matching ref_code.
 * @param refCode - REF code from collected_data.
 * @returns Session fields when found, otherwise null.
 */
export async function queryGa4SessionByRefCode(
  refCode: string,
): Promise<Ga4SessionLookupResult | null> {
  if (!isGa4Configured()) return null;

  const propertyId = env.GA4_PROPERTY_ID;
  const accessToken = await getGoogleAccessToken();

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dimensions: [{ name: 'sessionId' }, { name: 'dateHourMinute' }],
        metrics: [{ name: 'sessions' }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              {
                filter: {
                  fieldName: 'eventName',
                  stringFilter: { matchType: 'EXACT', value: 'ref_generated' },
                },
              },
              {
                filter: {
                  fieldName: 'customEvent:ref_code',
                  stringFilter: { matchType: 'EXACT', value: refCode },
                },
              },
            ],
          },
        },
        limit: 1,
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error('[ga4] runReport failed:', res.status, body);
    return null;
  }

  const json = (await res.json()) as {
    rows?: Array<{
      dimensionValues?: Array<{ value?: string }>;
    }>;
  };

  const row = json.rows?.[0];
  const sessionId = row?.dimensionValues?.[0]?.value;
  if (!sessionId) return null;

  return {
    ga4_session_id: sessionId,
    session_start: null,
    session_duration: null,
  };
}

import { encrypt, decrypt } from '@/lib/encryption';
import dbConnect from '@/lib/db';
import { UserConnection } from '@/lib/models';
import type { ConnectorConfig } from '@/lib/types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Generate OAuth authorization URL for a connector
 */
export function getOAuthAuthUrl(connector: ConnectorConfig, userId: string, state?: string): string {
  if (connector.authType !== 'oauth' || !connector.authConfig) {
    throw new Error(`Connector ${connector.slug} does not support OAuth`);
  }

  const { authUrl, clientId, scopes, responseType } = connector.authConfig;
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${APP_URL}/api/auth/callback/${connector.slug}`,
    response_type: responseType || 'code',
    scope: scopes.join(' '),
    state: state || JSON.stringify({ userId, connectorSlug: connector.slug }),
  });

  return `${authUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  connector: ConnectorConfig,
  code: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  scope?: string;
}> {
  if (connector.authType !== 'oauth' || !connector.authConfig) {
    throw new Error(`Connector ${connector.slug} does not support OAuth`);
  }

  const { tokenUrl, clientId, clientSecret, grantType } = connector.authConfig;

  const body = new URLSearchParams({
    grant_type: grantType || 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: `${APP_URL}/api/auth/callback/${connector.slug}`,
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    scope: data.scope,
  };
}

/**
 * Refresh an expired OAuth token
 */
export async function refreshOAuthToken(
  connector: ConnectorConfig,
  refreshToken: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  if (connector.authType !== 'oauth' || !connector.authConfig) {
    throw new Error(`Connector ${connector.slug} does not support OAuth`);
  }

  const { tokenUrl, clientId, clientSecret } = connector.authConfig;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Store user connection with encrypted tokens
 */
export async function storeConnection(
  userId: string,
  connectorSlug: string,
  authType: 'oauth' | 'api_key' | 'none',
  tokens: {
    accessToken?: string;
    refreshToken?: string;
    apiKey?: string;
    expiresIn?: number;
    scopes?: string[];
  }
): Promise<void> {
  await dbConnect();

  const connectionData: Record<string, unknown> = {
    userId,
    connectorSlug,
    authType,
    status: 'active',
    connectedAt: new Date(),
  };

  if (tokens.accessToken) {
    connectionData.accessToken = encrypt(tokens.accessToken);
  }
  if (tokens.refreshToken) {
    connectionData.refreshToken = encrypt(tokens.refreshToken);
  }
  if (tokens.apiKey) {
    connectionData.apiKey = encrypt(tokens.apiKey);
  }
  if (tokens.expiresIn) {
    connectionData.tokenExpiry = new Date(Date.now() + tokens.expiresIn * 1000);
  }
  if (tokens.scopes) {
    connectionData.scopes = tokens.scopes;
  }

  await UserConnection.findOneAndUpdate(
    { userId, connectorSlug },
    { $set: connectionData },
    { upsert: true, new: true }
  );
}

/**
 * Get decrypted user connection
 */
export async function getConnection(
  userId: string,
  connectorSlug: string
): Promise<{
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  tokenExpiry?: Date;
  status: string;
} | null> {
  await dbConnect();

  const connection = await UserConnection.findOne({
    userId,
    connectorSlug,
    status: 'active',
  }).lean();

  if (!connection) return null;

  return {
    accessToken: connection.accessToken ? decrypt(connection.accessToken) : undefined,
    refreshToken: connection.refreshToken ? decrypt(connection.refreshToken) : undefined,
    apiKey: connection.apiKey ? decrypt(connection.apiKey) : undefined,
    tokenExpiry: connection.tokenExpiry,
    status: connection.status,
  };
}

/**
 * Remove user connection
 */
export async function removeConnection(
  userId: string,
  connectorSlug: string
): Promise<boolean> {
  await dbConnect();

  const result = await UserConnection.findOneAndUpdate(
    { userId, connectorSlug },
    { $set: { status: 'revoked' } }
  );

  return !!result;
}

/**
 * Check if user's token is expired and needs refresh
 */
export async function ensureValidToken(
  userId: string,
  connector: ConnectorConfig
): Promise<string | null> {
  const connection = await getConnection(userId, connector.slug);
  if (!connection) return null;

  // API key connections don't expire
  if (connection.apiKey) {
    return connection.apiKey;
  }

  if (!connection.accessToken) return null;

  // Check if token is expired (with 5min buffer)
  if (connection.tokenExpiry) {
    const bufferMs = 5 * 60 * 1000;
    if (new Date(connection.tokenExpiry).getTime() - bufferMs < Date.now()) {
      // Token is expired or about to expire, try to refresh
      if (connection.refreshToken) {
        try {
          const refreshed = await refreshOAuthToken(connector, connection.refreshToken);
          await storeConnection(userId, connector.slug, 'oauth', {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken || connection.refreshToken,
            expiresIn: refreshed.expiresIn,
          });
          return refreshed.accessToken;
        } catch {
          // Refresh failed, mark connection as expired
          await dbConnect();
          await UserConnection.findOneAndUpdate(
            { userId, connectorSlug: connector.slug },
            { $set: { status: 'expired' } }
          );
          return null;
        }
      }
      return null; // No refresh token, token is expired
    }
  }

  return connection.accessToken;
}

/**
 * Get all connections for a user
 */
export async function getUserConnections(userId: string): Promise<
  Array<{
    connectorSlug: string;
    authType: string;
    status: string;
    connectedAt: Date;
    lastUsed?: Date;
  }>
> {
  await dbConnect();

  const connections = await UserConnection.find(
    { userId, status: { $in: ['active', 'expired'] } },
    { connectorSlug: 1, authType: 1, status: 1, connectedAt: 1, lastUsed: 1 }
  ).lean();

  return connections.map(c => ({
    connectorSlug: c.connectorSlug,
    authType: c.authType,
    status: c.status,
    connectedAt: c.connectedAt,
    lastUsed: c.lastUsed,
  }));
}

import { getConnector } from '@/connectors-runtime/loader';
import { ensureValidToken, getConnection } from '@/connectors-runtime/auth-handler';
import { ConnectorLog } from '@/lib/models';
import dbConnect from '@/lib/db';
import type { ConnectorConfig, ExecutionParams, ExecutionResult } from '@/lib/types';

/**
 * Universal Connector Execution Engine
 * 
 * This is the single entry point for executing any connector action.
 * It handles:
 * 1. Fetching connector configuration
 * 2. Fetching user authentication tokens
 * 3. Building the request with proper auth
 * 4. Making the API call
 * 5. Logging the execution
 * 6. Returning the response
 */
export async function runConnectorAction(params: ExecutionParams): Promise<ExecutionResult> {
  const startTime = Date.now();
  const { userId, connectorSlug, actionName, payload } = params;

  try {
    // 1. Get connector config
    const connector = await getConnector(connectorSlug);
    if (!connector) {
      return {
        success: false,
        statusCode: 404,
        duration: Date.now() - startTime,
        error: `Connector "${connectorSlug}" not found`,
      };
    }

    // 2. Find the action
    const action = connector.actions.find(a => a.name === actionName);
    if (!action) {
      return {
        success: false,
        statusCode: 404,
        duration: Date.now() - startTime,
        error: `Action "${actionName}" not found in connector "${connectorSlug}"`,
      };
    }

    // 3. Get user token
    let token: string | null = null;
    if (connector.authType !== 'none') {
      token = await ensureValidToken(userId, connector);
      if (!token) {
        return {
          success: false,
          statusCode: 401,
          duration: Date.now() - startTime,
          error: `Not authenticated with ${connector.name}. Please connect first.`,
        };
      }
    }

    // 4. Build the request
    const { url, headers, body } = buildRequest(connector, action, token, payload);

    // 5. Execute the request
    const fetchOptions: RequestInit = {
      method: action.method,
      headers,
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(action.method)) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const duration = Date.now() - startTime;

    let responseData: unknown;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    // 6. Log the execution
    await logExecution({
      userId,
      connectorSlug,
      actionName,
      method: action.method,
      endpoint: url,
      statusCode: response.status,
      duration,
      success: response.ok,
      error: !response.ok ? JSON.stringify(responseData) : undefined,
      requestBody: payload,
      responseBody: typeof responseData === 'object' ? responseData as Record<string, unknown> : undefined,
    });

    // Update last used timestamp
    await updateLastUsed(userId, connectorSlug);

    return {
      success: response.ok,
      data: responseData,
      statusCode: response.status,
      duration,
      error: !response.ok ? `API returned ${response.status}` : undefined,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await logExecution({
      userId,
      connectorSlug,
      actionName,
      method: 'UNKNOWN',
      endpoint: 'UNKNOWN',
      statusCode: 500,
      duration,
      success: false,
      error: errorMessage,
    });

    return {
      success: false,
      statusCode: 500,
      duration,
      error: errorMessage,
    };
  }
}

/**
 * Build the HTTP request from connector config, action, and payload
 */
function buildRequest(
  connector: ConnectorConfig,
  action: ConnectorConfig['actions'][0],
  token: string | null,
  payload?: Record<string, unknown>
): {
  url: string;
  headers: Record<string, string>;
  body?: Record<string, unknown>;
} {
  // Build URL with path parameter substitution
  let endpoint = action.endpoint;
  const bodyPayload = { ...payload };

  // Replace path parameters like {messageId}, {owner}, {repo}
  const pathParams = endpoint.match(/\{(\w+)\}/g);
  if (pathParams && payload) {
    for (const param of pathParams) {
      const key = param.slice(1, -1);
      if (payload[key]) {
        endpoint = endpoint.replace(param, String(payload[key]));
        delete bodyPayload[key]; // Remove from body since it's in the URL
      }
    }
  }

  const url = `${connector.baseUrl}${endpoint}`;

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  // Add action-specific headers
  if (action.headers) {
    Object.assign(headers, action.headers);
  }

  // Add authentication
  if (token && connector.authType === 'oauth') {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (token && connector.authType === 'api_key' && connector.apiKeyConfig) {
    const { headerName, prefix, location } = connector.apiKeyConfig;
    if (location === 'header') {
      headers[headerName] = `${prefix || ''}${token}`;
    } else if (location === 'query') {
      // Query param will be added later in query params section
    } else if (location === 'body') {
      bodyPayload[headerName] = `${prefix || ''}${token}`;
    }
  }

  // Build query params for GET requests OR for API key in query
  if ((action.method === 'GET' || (connector.authType === 'api_key' && connector.apiKeyConfig?.location === 'query')) && 
      (payload || (connector.authType === 'api_key' && connector.apiKeyConfig?.location === 'query'))) {
    const queryParams = new URLSearchParams();
    
    // Add original payload to query params for GET
    if (action.method === 'GET' && payload) {
      for (const [key, value] of Object.entries(bodyPayload)) {
        if (value !== undefined && value !== null) {
          queryParams.set(key, String(value));
        }
      }
    }
    
    // Add API key to query params
    if (token && connector.authType === 'api_key' && connector.apiKeyConfig?.location === 'query') {
      const { headerName, prefix } = connector.apiKeyConfig;
      queryParams.set(headerName, `${prefix || ''}${token}`);
    }

    const queryString = queryParams.toString();
    if (queryString) {
      const separator = url.includes('?') ? '&' : '?';
      return { url: `${url}${separator}${queryString}`, headers, body: action.method !== 'GET' && Object.keys(bodyPayload).length > 0 ? bodyPayload : undefined };
    }
  }

  return { url, headers, body: Object.keys(bodyPayload).length > 0 ? bodyPayload : undefined };
}

/**
 * Log connector execution to MongoDB
 */
async function logExecution(log: {
  userId: string;
  connectorSlug: string;
  actionName: string;
  method: string;
  endpoint: string;
  statusCode: number;
  duration: number;
  success: boolean;
  error?: string;
  requestBody?: Record<string, unknown>;
  responseBody?: Record<string, unknown>;
}): Promise<void> {
  try {
    await dbConnect();
    await ConnectorLog.create({
      ...log,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('Failed to log connector execution:', err);
  }
}

/**
 * Update the lastUsed timestamp for a user connection
 */
async function updateLastUsed(userId: string, connectorSlug: string): Promise<void> {
  try {
    await dbConnect();
    const { UserConnection } = await import('@/lib/models');
    await UserConnection.findOneAndUpdate(
      { userId, connectorSlug },
      { $set: { lastUsed: new Date() } }
    );
  } catch {
    // Non-critical, ignore
  }
}

/**
 * Test a connector connection
 */
export async function testConnection(
  userId: string,
  connectorSlug: string
): Promise<{ connected: boolean; error?: string }> {
  const connector = await getConnector(connectorSlug);
  if (!connector) {
    return { connected: false, error: 'Connector not found' };
  }

  if (connector.authType === 'none') {
    return { connected: true };
  }

  const connection = await getConnection(userId, connectorSlug);
  if (!connection) {
    return { connected: false, error: 'No connection found' };
  }

  if (connection.status !== 'active') {
    return { connected: false, error: `Connection status: ${connection.status}` };
  }

  return { connected: true };
}

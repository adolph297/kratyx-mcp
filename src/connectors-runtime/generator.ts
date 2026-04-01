import fs from 'fs';
import path from 'path';
import type { ConnectorConfig, ConnectorCategory } from '@/lib/types';

/**
 * Auto-generate a connector config file
 */
export function generateConnector(options: {
  name: string;
  slug?: string;
  description?: string;
  category?: ConnectorCategory;
  authType?: 'oauth' | 'api_key' | 'none';
  baseUrl?: string;
  color?: string;
  website?: string;
}): ConnectorConfig {
  const slug = options.slug || options.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  
  const config: ConnectorConfig = {
    name: options.name,
    slug,
    description: options.description || `Connect with ${options.name} to automate workflows`,
    category: options.category || 'productivity',
    icon: slug,
    color: options.color || '#6366f1',
    website: options.website || '',
    authType: options.authType || 'api_key',
    baseUrl: options.baseUrl || `https://api.${slug}.com/v1`,
    actions: [
      {
        name: 'list_items',
        displayName: 'List Items',
        description: `List items from ${options.name}`,
        method: 'GET',
        endpoint: '/items',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 10 },
            offset: { type: 'number', default: 0 },
          },
        },
      },
      {
        name: 'get_item',
        displayName: 'Get Item',
        description: `Get a specific item from ${options.name}`,
        method: 'GET',
        endpoint: '/items/{itemId}',
        inputSchema: {
          type: 'object',
          properties: {
            itemId: { type: 'string', required: true },
          },
        },
      },
      {
        name: 'create_item',
        displayName: 'Create Item',
        description: `Create a new item in ${options.name}`,
        method: 'POST',
        endpoint: '/items',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', required: true },
            data: { type: 'object' },
          },
        },
      },
    ],
    webhookSupport: false,
    rateLimits: { requestsPerMinute: 60 },
    documentation: options.website ? `${options.website}/docs` : undefined,
    version: '1.0.0',
    status: 'beta',
  };

  // Add auth config based on type
  if (options.authType === 'oauth') {
    config.authConfig = {
      clientId: '',
      clientSecret: '',
      authUrl: `${options.baseUrl || `https://${slug}.com`}/oauth/authorize`,
      tokenUrl: `${options.baseUrl || `https://${slug}.com`}/oauth/token`,
      scopes: ['read', 'write'],
      responseType: 'code',
      grantType: 'authorization_code',
    };
  } else if (options.authType === 'api_key') {
    config.apiKeyConfig = {
      headerName: 'Authorization',
      prefix: 'Bearer ',
      location: 'header',
    };
  }

  return config;
}

/**
 * Save connector config to file
 */
export function saveConnectorToFile(config: ConnectorConfig): string {
  const connectorsDir = path.join(process.cwd(), 'connectors');
  
  if (!fs.existsSync(connectorsDir)) {
    fs.mkdirSync(connectorsDir, { recursive: true });
  }

  const filePath = path.join(connectorsDir, `${config.slug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  
  return filePath;
}

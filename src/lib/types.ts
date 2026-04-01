// Connector Types
export interface ConnectorAction {
  name: string;
  displayName: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface ConnectorAuthConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  responseType?: string;
  grantType?: string;
}

export interface ConnectorConfig {
  name: string;
  slug: string;
  description: string;
  category: ConnectorCategory;
  icon: string;
  color: string;
  website: string;
  authType: 'oauth' | 'api_key' | 'none';
  baseUrl: string;
  authConfig?: ConnectorAuthConfig;
  apiKeyConfig?: {
    headerName: string;
    prefix?: string;
    location: 'header' | 'query' | 'body';
  };
  actions: ConnectorAction[];
  webhookSupport: boolean;
  rateLimits?: {
    requestsPerMinute: number;
    requestsPerDay?: number;
  };
  documentation?: string;
  version: string;
  status: 'active' | 'beta' | 'deprecated';
}

export type ConnectorCategory =
  | 'communication'
  | 'productivity'
  | 'finance'
  | 'devtools'
  | 'data'
  | 'marketing'
  | 'crm'
  | 'cloud'
  | 'ai'
  | 'social'
  | 'ecommerce'
  | 'analytics'
  | 'storage'
  | 'security'
  | 'hr';

export interface UserConnection {
  userId: string;
  connectorSlug: string;
  authType: 'oauth' | 'api_key' | 'none';
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  tokenExpiry?: Date;
  scopes?: string[];
  metadata?: Record<string, unknown>;
  status: 'active' | 'expired' | 'revoked';
  connectedAt: Date;
  lastUsed?: Date;
}

export interface ConnectorLog {
  userId: string;
  connectorSlug: string;
  actionName: string;
  method: string;
  endpoint: string;
  statusCode: number;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: Date;
}

export interface ExecutionParams {
  userId: string;
  connectorSlug: string;
  actionName: string;
  payload?: Record<string, unknown>;
}

export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  statusCode: number;
  duration: number;
  error?: string;
}

export const CATEGORY_LABELS: Record<ConnectorCategory, string> = {
  communication: 'Communication',
  productivity: 'Productivity',
  finance: 'Finance',
  devtools: 'Developer Tools',
  data: 'Data & Analytics',
  marketing: 'Marketing',
  crm: 'CRM',
  cloud: 'Cloud',
  ai: 'AI & ML',
  social: 'Social Media',
  ecommerce: 'E-Commerce',
  analytics: 'Analytics',
  storage: 'Storage',
  security: 'Security',
  hr: 'HR & Recruiting',
};

export const CATEGORY_ICONS: Record<ConnectorCategory, string> = {
  communication: '💬',
  productivity: '📋',
  finance: '💰',
  devtools: '🛠️',
  data: '📊',
  marketing: '📣',
  crm: '🤝',
  cloud: '☁️',
  ai: '🤖',
  social: '📱',
  ecommerce: '🛒',
  analytics: '📈',
  storage: '💾',
  security: '🔒',
  hr: '👥',
};

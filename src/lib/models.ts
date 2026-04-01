import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// CONNECTOR MODEL
// ============================================
export interface IConnector extends Document {
  name: string;
  slug: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  website: string;
  authType: 'oauth' | 'api_key' | 'none';
  baseUrl: string;
  authConfig?: {
    clientId: string;
    clientSecret: string;
    authUrl: string;
    tokenUrl: string;
    scopes: string[];
    responseType?: string;
    grantType?: string;
  };
  apiKeyConfig?: {
    headerName: string;
    prefix?: string;
    location: 'header' | 'query' | 'body';
  };
  actions: Array<{
    name: string;
    displayName: string;
    description: string;
    method: string;
    endpoint: string;
    inputSchema: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
    headers?: Record<string, string>;
  }>;
  webhookSupport: boolean;
  rateLimits?: {
    requestsPerMinute: number;
    requestsPerDay?: number;
  };
  documentation?: string;
  version: string;
  status: 'active' | 'beta' | 'deprecated';
  createdAt: Date;
  updatedAt: Date;
}

const ConnectorSchema = new Schema<IConnector>(
  {
    name: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true },
    category: { type: String, required: true, index: true },
    icon: { type: String, default: '' },
    color: { type: String, default: '#6366f1' },
    website: { type: String, default: '' },
    authType: {
      type: String,
      enum: ['oauth', 'api_key', 'none'],
      required: true,
    },
    baseUrl: { type: String, required: true },
    authConfig: {
      clientId: String,
      clientSecret: String,
      authUrl: String,
      tokenUrl: String,
      scopes: [String],
      responseType: String,
      grantType: String,
    },
    apiKeyConfig: {
      headerName: String,
      prefix: String,
      location: { type: String, enum: ['header', 'query', 'body'] },
    },
    actions: [
      {
        name: { type: String, required: true },
        displayName: { type: String, required: true },
        description: String,
        method: {
          type: String,
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
          required: true,
        },
        endpoint: { type: String, required: true },
        inputSchema: { type: Schema.Types.Mixed, default: {} },
        outputSchema: { type: Schema.Types.Mixed },
        headers: { type: Schema.Types.Mixed },
      },
    ],
    webhookSupport: { type: Boolean, default: false },
    rateLimits: {
      requestsPerMinute: Number,
      requestsPerDay: Number,
    },
    documentation: String,
    version: { type: String, default: '1.0.0' },
    status: {
      type: String,
      enum: ['active', 'beta', 'deprecated'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// ============================================
// USER MODEL
// ============================================
export interface IUser extends Document {
  email: string;
  name: string;
  avatar?: string;
  apiKey?: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    avatar: String,
    apiKey: String,
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true }
);

// ============================================
// USER CONNECTION MODEL
// ============================================
export interface IUserConnection extends Document {
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

const UserConnectionSchema = new Schema<IUserConnection>(
  {
    userId: { type: String, required: true, index: true },
    connectorSlug: { type: String, required: true, index: true },
    authType: {
      type: String,
      enum: ['oauth', 'api_key', 'none'],
      required: true,
    },
    accessToken: String,
    refreshToken: String,
    apiKey: String,
    tokenExpiry: Date,
    scopes: [String],
    metadata: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['active', 'expired', 'revoked'],
      default: 'active',
    },
    connectedAt: { type: Date, default: Date.now },
    lastUsed: Date,
  },
  { timestamps: true }
);

// Compound index for unique user-connector pairs
UserConnectionSchema.index({ userId: 1, connectorSlug: 1 }, { unique: true });

// ============================================
// CONNECTOR LOG MODEL
// ============================================
export interface IConnectorLog extends Document {
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
  timestamp: Date;
}

const ConnectorLogSchema = new Schema<IConnectorLog>({
  userId: { type: String, required: true, index: true },
  connectorSlug: { type: String, required: true, index: true },
  actionName: { type: String, required: true },
  method: { type: String, required: true },
  endpoint: { type: String, required: true },
  statusCode: { type: Number, required: true },
  duration: { type: Number, required: true },
  success: { type: Boolean, required: true },
  error: String,
  requestBody: { type: Schema.Types.Mixed },
  responseBody: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now, index: true },
});

// TTL index: auto-delete logs after 90 days
ConnectorLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// ============================================
// MODEL EXPORTS
// ============================================
export const Connector: Model<IConnector> =
  mongoose.models.Connector || mongoose.model<IConnector>('Connector', ConnectorSchema);

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export const UserConnection: Model<IUserConnection> =
  mongoose.models.UserConnection ||
  mongoose.model<IUserConnection>('UserConnection', UserConnectionSchema);

export const ConnectorLog: Model<IConnectorLog> =
  mongoose.models.ConnectorLog ||
  mongoose.model<IConnectorLog>('ConnectorLog', ConnectorLogSchema);

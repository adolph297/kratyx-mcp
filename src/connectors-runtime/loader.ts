import fs from 'fs';
import path from 'path';
import dbConnect from '@/lib/db';
import { Connector, type IConnector } from '@/lib/models';
import type { ConnectorConfig } from '@/lib/types';

// Cache for loaded connectors
let connectorCache: Map<string, ConnectorConfig> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load connectors from JSON config files in /connectors directory
 */
export function loadConnectorsFromFiles(): ConnectorConfig[] {
  const connectorsDir = path.join(process.cwd(), 'connectors');
  
  if (!fs.existsSync(connectorsDir)) {
    console.warn('Connectors directory not found');
    return [];
  }

  const files = fs.readdirSync(connectorsDir).filter(f => f.endsWith('.json'));
  const connectors: ConnectorConfig[] = [];

  for (const file of files) {
    try {
      const filePath = path.join(connectorsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const config = JSON.parse(content) as ConnectorConfig;
      connectors.push(config);
    } catch (error) {
      console.error(`Error loading connector config from ${file}:`, error);
    }
  }

  return connectors;
}

/**
 * Load connectors from MongoDB
 */
export async function loadConnectorsFromDB(): Promise<ConnectorConfig[]> {
  await dbConnect();
  const connectors = await Connector.find({ status: { $ne: 'deprecated' } }).lean();
  return connectors.map(doc => ({
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    category: doc.category as ConnectorConfig['category'],
    icon: doc.icon,
    color: doc.color,
    website: doc.website,
    authType: doc.authType,
    baseUrl: doc.baseUrl,
    authConfig: doc.authConfig,
    apiKeyConfig: doc.apiKeyConfig,
    actions: doc.actions.map(a => ({
      name: a.name,
      displayName: a.displayName,
      description: a.description,
      method: a.method as ConnectorConfig['actions'][0]['method'],
      endpoint: a.endpoint,
      inputSchema: a.inputSchema,
      outputSchema: a.outputSchema,
      headers: a.headers,
    })),
    webhookSupport: doc.webhookSupport,
    rateLimits: doc.rateLimits,
    documentation: doc.documentation,
    version: doc.version,
    status: doc.status as ConnectorConfig['status'],
  }));
}

/**
 * Load all connectors from both files and DB, with DB taking precedence
 */
export async function loadAllConnectors(): Promise<ConnectorConfig[]> {
  const now = Date.now();
  
  // Return cached if valid
  if (connectorCache && (now - cacheTimestamp) < CACHE_TTL) {
    return Array.from(connectorCache.values());
  }

  const fileConnectors = loadConnectorsFromFiles();
  
  let dbConnectors: ConnectorConfig[] = [];
  try {
    dbConnectors = await loadConnectorsFromDB();
  } catch {
    // DB might not be available, fallback to file configs only
    console.warn('Could not load connectors from DB, using file configs only');
  }

  // Merge: DB connectors override file connectors by slug
  const merged = new Map<string, ConnectorConfig>();
  
  for (const c of fileConnectors) {
    merged.set(c.slug, c);
  }
  
  for (const c of dbConnectors) {
    merged.set(c.slug, c);
  }

  connectorCache = merged;
  cacheTimestamp = now;

  return Array.from(merged.values());
}

/**
 * Get a single connector by slug
 */
export async function getConnector(slug: string): Promise<ConnectorConfig | null> {
  const connectors = await loadAllConnectors();
  return connectors.find(c => c.slug === slug) || null;
}

/**
 * Get connectors by category
 */
export async function getConnectorsByCategory(category: string): Promise<ConnectorConfig[]> {
  const connectors = await loadAllConnectors();
  return connectors.filter(c => c.category === category);
}

/**
 * Search connectors by name or description
 */
export async function searchConnectors(query: string): Promise<ConnectorConfig[]> {
  const connectors = await loadAllConnectors();
  const lowerQuery = query.toLowerCase();
  return connectors.filter(
    c =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.description.toLowerCase().includes(lowerQuery) ||
      c.category.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Sync file connectors to MongoDB
 */
export async function syncConnectorsToDB(): Promise<{ synced: number; errors: number }> {
  await dbConnect();
  const fileConnectors = loadConnectorsFromFiles();
  let synced = 0;
  let errors = 0;

  for (const config of fileConnectors) {
    try {
      await Connector.findOneAndUpdate(
        { slug: config.slug },
        { $set: config },
        { upsert: true, new: true }
      );
      synced++;
    } catch (error) {
      console.error(`Error syncing connector ${config.slug}:`, error);
      errors++;
    }
  }

  // Invalidate cache
  connectorCache = null;

  return { synced, errors };
}

/**
 * Register a new connector dynamically
 */
export async function registerConnector(config: ConnectorConfig): Promise<IConnector> {
  await dbConnect();
  
  const connector = await Connector.findOneAndUpdate(
    { slug: config.slug },
    { $set: config },
    { upsert: true, new: true }
  );

  // Invalidate cache
  connectorCache = null;

  return connector;
}

/**
 * Invalidate the connector cache
 */
export function invalidateCache(): void {
  connectorCache = null;
  cacheTimestamp = 0;
}

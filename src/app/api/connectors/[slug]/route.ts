import { NextRequest } from 'next/server';
import { getConnector } from '@/connectors-runtime/loader';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const connector = await getConnector(slug);

    if (!connector) {
      return Response.json(
        { success: false, error: 'Connector not found' },
        { status: 404 }
      );
    }

    // Return full connector info (except sensitive auth secrets)
    const safeConnector = {
      name: connector.name,
      slug: connector.slug,
      description: connector.description,
      category: connector.category,
      icon: connector.icon,
      color: connector.color,
      website: connector.website,
      authType: connector.authType,
      baseUrl: connector.baseUrl,
      actions: connector.actions.map(a => ({
        name: a.name,
        displayName: a.displayName,
        description: a.description,
        method: a.method,
        endpoint: a.endpoint,
        inputSchema: a.inputSchema,
      })),
      webhookSupport: connector.webhookSupport,
      rateLimits: connector.rateLimits,
      documentation: connector.documentation,
      version: connector.version,
      status: connector.status,
    };

    return Response.json({ success: true, data: safeConnector });
  } catch (error) {
    console.error('Error fetching connector:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch connector' },
      { status: 500 }
    );
  }
}

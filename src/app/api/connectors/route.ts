import { NextRequest } from 'next/server';
import { loadAllConnectors, searchConnectors } from '@/connectors-runtime/loader';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const category = searchParams.get('category');

    let connectors;

    if (query) {
      connectors = await searchConnectors(query);
    } else {
      connectors = await loadAllConnectors();
    }

    if (category) {
      connectors = connectors.filter(c => c.category === category);
    }

    // Strip sensitive auth config data before sending to client
    const safeConnectors = connectors.map(c => ({
      name: c.name,
      slug: c.slug,
      description: c.description,
      category: c.category,
      icon: c.icon,
      color: c.color,
      website: c.website,
      authType: c.authType,
      actionsCount: c.actions.length,
      actions: c.actions.map(a => ({
        name: a.name,
        displayName: a.displayName,
        description: a.description,
        method: a.method,
      })),
      webhookSupport: c.webhookSupport,
      documentation: c.documentation,
      version: c.version,
      status: c.status,
    }));

    return Response.json({
      success: true,
      data: safeConnectors,
      total: safeConnectors.length,
    });
  } catch (error) {
    console.error('Error loading connectors:', error);
    return Response.json(
      { success: false, error: 'Failed to load connectors' },
      { status: 500 }
    );
  }
}

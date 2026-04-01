import { NextRequest } from 'next/server';
import { getConnector } from '@/connectors-runtime/loader';
import { storeConnection, removeConnection, getUserConnections } from '@/connectors-runtime/auth-handler';

export const dynamic = 'force-dynamic';

// Get user's connections
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user';

    const connections = await getUserConnections(userId);

    return Response.json({ success: true, data: connections });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}

// Connect with API key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, connectorSlug, apiKey } = body;

    if (!userId || !connectorSlug) {
      return Response.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const connector = await getConnector(connectorSlug);
    if (!connector) {
      return Response.json(
        { success: false, error: 'Connector not found' },
        { status: 404 }
      );
    }

    if (connector.authType === 'api_key' && !apiKey) {
      return Response.json(
        { success: false, error: 'API key is required for this connector' },
        { status: 400 }
      );
    }

    await storeConnection(userId, connectorSlug, connector.authType, {
      apiKey: connector.authType === 'api_key' ? apiKey : undefined,
    });

    return Response.json({ success: true, message: 'Connected successfully' });
  } catch (error) {
    console.error('Error creating connection:', error);
    return Response.json(
      { success: false, error: 'Failed to create connection' },
      { status: 500 }
    );
  }
}

// Disconnect
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user';
    const connectorSlug = searchParams.get('connectorSlug');

    if (!connectorSlug) {
      return Response.json(
        { success: false, error: 'Missing connectorSlug' },
        { status: 400 }
      );
    }

    await removeConnection(userId, connectorSlug);

    return Response.json({ success: true, message: 'Disconnected successfully' });
  } catch (error) {
    console.error('Error removing connection:', error);
    return Response.json(
      { success: false, error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}

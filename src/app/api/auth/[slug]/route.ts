import { NextRequest } from 'next/server';
import { getConnector } from '@/connectors-runtime/loader';
import { getOAuthAuthUrl } from '@/connectors-runtime/auth-handler';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user';

    const connector = await getConnector(slug);
    if (!connector) {
      return Response.json(
        { success: false, error: 'Connector not found' },
        { status: 404 }
      );
    }

    if (connector.authType !== 'oauth') {
      return Response.json(
        { success: false, error: 'This connector does not support OAuth' },
        { status: 400 }
      );
    }

    const authUrl = getOAuthAuthUrl(connector, userId);

    return Response.json({ success: true, authUrl });
  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    return Response.json(
      { success: false, error: 'Failed to generate OAuth URL' },
      { status: 500 }
    );
  }
}

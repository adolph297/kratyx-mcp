import { NextRequest } from 'next/server';
import { getConnector } from '@/connectors-runtime/loader';
import { exchangeCodeForToken, storeConnection } from '@/connectors-runtime/auth-handler';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return Response.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/connectors/${slug}?error=${encodeURIComponent(error)}`
      );
    }

    if (!code) {
      return Response.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/connectors/${slug}?error=no_code`
      );
    }

    const connector = await getConnector(slug);
    if (!connector) {
      return Response.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}?error=connector_not_found`
      );
    }

    // Parse state to get userId
    let userId = 'demo-user';
    if (state) {
      try {
        const stateData = JSON.parse(state);
        userId = stateData.userId || userId;
      } catch {
        // State might not be JSON
      }
    }

    // Exchange code for token
    const tokens = await exchangeCodeForToken(connector, code);

    // Store the connection with encrypted tokens
    await storeConnection(userId, slug, 'oauth', {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      scopes: tokens.scope?.split(' '),
    });

    // Redirect back to connector page
    return Response.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/connectors/${slug}?connected=true`
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    const { slug } = await params;
    return Response.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/connectors/${slug}?error=auth_failed`
    );
  }
}

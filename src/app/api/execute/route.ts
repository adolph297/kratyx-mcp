import { NextRequest } from 'next/server';
import { runConnectorAction } from '@/connectors-runtime/executor';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, connectorSlug, actionName, payload } = body;

    if (!userId || !connectorSlug || !actionName) {
      return Response.json(
        {
          success: false,
          error: 'Missing required fields: userId, connectorSlug, actionName',
        },
        { status: 400 }
      );
    }

    const result = await runConnectorAction({
      userId,
      connectorSlug,
      actionName,
      payload,
    });

    return Response.json(result, {
      status: result.success ? 200 : result.statusCode,
    });
  } catch (error) {
    console.error('Execution error:', error);
    return Response.json(
      { success: false, error: 'Internal server error', statusCode: 500, duration: 0 },
      { status: 500 }
    );
  }
}

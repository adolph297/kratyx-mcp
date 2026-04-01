import { NextRequest } from 'next/server';
import { syncConnectorsToDB } from '@/connectors-runtime/loader';
import { generateConnector, saveConnectorToFile } from '@/connectors-runtime/generator';

export const dynamic = 'force-dynamic';

// Sync file connectors to DB
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'sync') {
      const result = await syncConnectorsToDB();
      return Response.json({ success: true, ...result });
    }

    if (action === 'generate') {
      const { name, category, authType, baseUrl, color, website, description } = body;
      
      if (!name) {
        return Response.json(
          { success: false, error: 'Connector name is required' },
          { status: 400 }
        );
      }

      const config = generateConnector({
        name,
        category,
        authType,
        baseUrl,
        color,
        website,
        description,
      });

      const filePath = saveConnectorToFile(config);

      return Response.json({
        success: true,
        message: `Connector "${name}" generated successfully`,
        filePath,
        config,
      });
    }

    return Response.json(
      { success: false, error: 'Invalid action. Use "sync" or "generate".' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin action error:', error);
    return Response.json(
      { success: false, error: 'Admin action failed' },
      { status: 500 }
    );
  }
}

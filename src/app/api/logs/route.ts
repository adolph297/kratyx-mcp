import { NextRequest } from 'next/server';
import dbConnect from '@/lib/db';
import { ConnectorLog } from '@/lib/models';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user';
    const connectorSlug = searchParams.get('connectorSlug');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    const filter: Record<string, unknown> = {};
    if (userId !== 'all') filter.userId = userId;
    if (connectorSlug) filter.connectorSlug = connectorSlug;

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ConnectorLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ConnectorLog.countDocuments(filter),
    ]);

    // Compute stats
    const stats = await ConnectorLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalExecutions: { $sum: 1 },
          successCount: { $sum: { $cond: ['$success', 1, 0] } },
          failureCount: { $sum: { $cond: ['$success', 0, 1] } },
          avgDuration: { $avg: '$duration' },
        },
      },
    ]);

    return Response.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: stats[0] || {
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        avgDuration: 0,
      },
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

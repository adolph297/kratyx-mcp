'use client';

import { use } from 'react';
import ConnectorDashboard from '@/app/components/ConnectorDashboard';

export default function ConnectorDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  
  return <ConnectorDashboard initialSlug={slug} />;
}

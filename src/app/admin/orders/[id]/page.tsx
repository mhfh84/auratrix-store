export const dynamic = 'force-dynamic';

import React from 'react';
import AdminOrderDetailClient from './AdminOrderDetailClient';

interface Props {
  params: {
    id: string;
  };
}

export default function AdminOrderDetailPage({ params }: Props) {
  return <AdminOrderDetailClient orderId={params.id} />;
}

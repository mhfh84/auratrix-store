export const dynamic = 'force-dynamic';

import React, { Suspense } from 'react';
import AdminProductsClient from '@/app/admin/products/AdminProductsClient';

export default async function AdminProductsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[var(--text-muted)]">Loading...</div>}>
      <AdminProductsClient />
    </Suspense>
  );
}

import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/revalidate
 *
 * Internal endpoint called by API routes (products, categories, orders)
 * to immediately bust the ISR cache for affected pages.
 *
 * This ensures new visitors always see up-to-date data even when the
 * home/products pages have ISR revalidation enabled for performance.
 *
 * Must be called server-side — requires ADMIN or MODERATOR session.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || (role !== 'ADMIN' && role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { paths, tags } = body as {
      paths?: string[];
      tags?: string[];
    };

    const revalidated: string[] = [];

    if (Array.isArray(paths)) {
      for (const p of paths) {
        revalidatePath(p);
        revalidated.push(`path:${p}`);
      }
    }

    if (Array.isArray(tags)) {
      for (const t of tags) {
        revalidateTag(t);
        revalidated.push(`tag:${t}`);
      }
    }

    return NextResponse.json({ success: true, revalidated });
  } catch (error: any) {
    console.error('Revalidation error:', error);
    return NextResponse.json({ error: error.message || 'Revalidation failed' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/**
 * POST /api/returns
 * Customer submits a return request for a delivered order.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { orderId, reason, reasonDetails, refundMethod, refundDetails, images } = body;

    if (!orderId || !reason) {
      return NextResponse.json({ error: 'orderId and reason are required' }, { status: 400 });
    }

    // Verify the order belongs to this user and is DELIVERED
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { returnRequests: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found or does not belong to you' }, { status: 404 });
    }

    if (order.status !== 'DELIVERED') {
      return NextResponse.json({ error: 'Return requests are only allowed for delivered orders' }, { status: 400 });
    }

    // Check return window (store settings)
    const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    const returnWindowDays = (settings as any)?.returnWindowDays || 14;
    const orderDate = new Date(order.createdAt);
    const daysDiff = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > returnWindowDays) {
      return NextResponse.json({
        error: `Return window has expired. Returns are accepted within ${returnWindowDays} days of delivery.`,
      }, { status: 400 });
    }

    // Check if already has an active return request
    const existingReturn = order.returnRequests.find((r) =>
      ['REQUESTED', 'APPROVED'].includes(r.status)
    );
    if (existingReturn) {
      return NextResponse.json({ error: 'A return request for this order is already in progress' }, { status: 409 });
    }

    const returnReq = await (prisma as any).returnRequest.create({
      data: {
        orderId,
        userId,
        reason,
        reasonDetails: reasonDetails || null,
        refundMethod: refundMethod || 'ORIGINAL',
        refundDetails: refundDetails || null,
        images: images ? JSON.stringify(images) : '[]',
        status: 'REQUESTED',
      },
    });

    return NextResponse.json(returnReq, { status: 201 });
  } catch (error: any) {
    console.error('Error creating return request:', error);
    return NextResponse.json({ error: error.message || 'Failed to create return request' }, { status: 500 });
  }
}

/**
 * GET /api/returns
 * Customer sees their own return requests. Admin sees all.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const isAdmin = userRole === 'ADMIN' || hasPermission(session.user, 'manage_returns');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (!isAdmin) where.userId = userId;
    if (status && status !== 'ALL') where.status = status;

    const [returns, total] = await Promise.all([
      (prisma as any).returnRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          order: {
            include: {
              orderItems: { include: { product: { select: { id: true, title: true, images: true } } } },
            },
          },
        },
      }),
      (prisma as any).returnRequest.count({ where }),
    ]);

    return NextResponse.json({ returns, total, page, limit });
  } catch (error: any) {
    console.error('Error fetching return requests:', error);
    return NextResponse.json({ error: 'Failed to fetch return requests' }, { status: 500 });
  }
}

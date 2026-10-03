import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/returns/[id]
 * Fetch a single return request with order details.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const isAdmin = userRole === 'ADMIN' || hasPermission(session.user, 'manage_returns');

    const returnReq = await (prisma as any).returnRequest.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        order: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            orderItems: { include: { product: { select: { id: true, title: true, images: true } } } },
          },
        },
      },
    });

    if (!returnReq) {
      return NextResponse.json({ error: 'Return request not found' }, { status: 404 });
    }

    // Only admin or the request owner can view it
    if (!isAdmin && returnReq.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(returnReq);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch return request' }, { status: 500 });
  }
}

/**
 * PATCH /api/returns/[id]
 * Admin updates the return request status and/or admin notes.
 * Status transitions: REQUESTED → APPROVED → REFUNDED | REJECTED
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (!hasPermission(session.user, 'manage_returns') && userRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to returns management required' }, { status: 403 });
    }

    const body = await request.json();
    const { status, adminNotes } = body;

    const validStatuses = ['REQUESTED', 'APPROVED', 'REFUNDED', 'REJECTED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Fetch the full return request with order data
    const returnReq = await (prisma as any).returnRequest.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        order: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            orderItems: { include: { product: true } },
          },
        },
      },
    });

    if (!returnReq) {
      return NextResponse.json({ error: 'Return request not found' }, { status: 404 });
    }

    const updateData: any = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    // If refunding via wallet points, credit points to the user
    if (status === 'REFUNDED' && returnReq.refundMethod === 'WALLET_POINTS' && returnReq.userId) {
      const orderTotal = returnReq.order?.totalAmount || 0;
      const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
      const rate = (settings as any)?.pointsRedemptionRate || 20.0;
      const pointsToCredit = Math.floor(orderTotal * rate);
      if (pointsToCredit > 0) {
        await prisma.user.update({
          where: { id: returnReq.userId },
          data: { loyaltyPoints: { increment: pointsToCredit } },
        });
      }
    }

    const updated = await (prisma as any).returnRequest.update({
      where: { id: params.id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true } },
        order: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            orderItems: { include: { product: { select: { id: true, title: true, images: true } } } },
          },
        },
      },
    });

    // Send email notification asynchronously
    if (status) {
      try {
        const { sendReturnStatusEmail } = await import('@/lib/email');
        sendReturnStatusEmail(updated, updated.order, status).catch((err) => {
          console.error('Non-blocking return email error:', err);
        });
      } catch (e) {}
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating return request:', error);
    return NextResponse.json({ error: error.message || 'Failed to update return request' }, { status: 500 });
  }
}

/**
 * DELETE /api/returns/[id]
 * Admin can delete a return request.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await (prisma as any).returnRequest.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete return request' }, { status: 500 });
  }
}

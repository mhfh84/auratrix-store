import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestingUserId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const isStaff = userRole === 'ADMIN' || hasPermission(session.user, 'manage_orders');

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, state: true, city: true, address: true } },
        orderItems: { include: { product: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Non-staff users may only view their own orders
    if (!isStaff && order.userId !== requestingUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (!hasPermission(session.user, 'manage_orders') && userRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to order management required' }, { status: 403 });
    }

    const body = await request.json();
    const { status, paymentStatus, depositStatus, trackingNumber, estimatedDelivery, adminNotes } = body;

    // Build update payload dynamically — only include fields that were sent
    const data: Record<string, any> = {};

    if (status !== undefined) {
      if (!['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(status)) {
        return NextResponse.json({ error: 'Invalid order status' }, { status: 400 });
      }
      data.status = status;
    }

    if (paymentStatus !== undefined) {
      if (!['PENDING', 'PAID', 'FAILED', 'REFUNDED'].includes(paymentStatus)) {
        return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 });
      }
      data.paymentStatus = paymentStatus;
    }

    if (depositStatus !== undefined) {
      if (!['NONE', 'PENDING_PROOF', 'VERIFIED', 'WAIVED'].includes(depositStatus)) {
        return NextResponse.json({ error: 'Invalid deposit status' }, { status: 400 });
      }
      data.depositStatus = depositStatus;
    }

    if (trackingNumber !== undefined) {
      data.trackingNumber = trackingNumber || null;
    }

    if (estimatedDelivery !== undefined) {
      data.estimatedDelivery = estimatedDelivery ? new Date(estimatedDelivery) : null;
    }

    if (adminNotes !== undefined) {
      data.adminNotes = adminNotes;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, state: true, city: true, address: true } },
        orderItems: { include: { product: true } },
      },
    });

    // If status changed, send update email asynchronously
    if (status) {
      try {
        const { sendOrderStatusUpdateEmail } = await import('@/lib/email');
        sendOrderStatusUpdateEmail(updatedOrder, status).catch((err) => {
          console.error('Non-blocking status update email error:', err);
        });
      } catch (e) {}
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}


export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (!hasPermission(session.user, 'manage_orders') && userRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to order management required' }, { status: 403 });
    }

    await prisma.order.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Order deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete order' }, { status: 500 });
  }
}

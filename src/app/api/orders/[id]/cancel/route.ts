import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notifyStoreUpdate } from '@/lib/realtimeEvents';
import { revalidateStorePages } from '@/lib/revalidateStore';

export const dynamic = 'force-dynamic';

export async function POST(
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
    const isStaff = userRole === 'ADMIN' || userRole === 'MODERATOR';

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        orderItems: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify ownership or staff permissions
    if (order.userId !== userId && !isStaff) {
      return NextResponse.json({ error: 'Unauthorized to cancel this order' }, { status: 403 });
    }

    // Anti-Cancellation Protection: Orders with active/verified deposits cannot be cancelled directly by customers
    if (!isStaff && ((order as any).depositAmount > 0 || (order as any).depositStatus === 'VERIFIED')) {
      return NextResponse.json(
        {
          error:
            'لا يمكن إلغاء الطلب مباشرة لوجود عربون حجز مؤكد ومسجل. يرجى التواصل مع خدمة العملاء والدعم الفني للمساعدة.',
        },
        { status: 400 }
      );
    }

    // Only allow cancelling if order is not shipped, delivered, or already cancelled
    if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(order.status)) {
      return NextResponse.json(
        { error: 'Cannot cancel an order that is already shipped, delivered, or cancelled.' },
        { status: 400 }
      );
    }

    // Execute cancellation & stock restoration inside a transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Restore product & variant stock
      for (const item of order.orderItems) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { increment: item.quantity } },
          }).catch((err) => {
            console.error(`Failed to restore stock for product ${item.productId}:`, err);
          });
        }

        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
          }).catch((err) => {
            console.error(`Failed to restore stock for variant ${item.variantId}:`, err);
          });
        }
      }

      // 2. Refund / revert loyalty points if applicable
      if (order.userId) {
        let pointsAdjustment = 0;
        if (order.pointsUsed && order.pointsUsed > 0) {
          pointsAdjustment += order.pointsUsed; // refund spent points
        }
        if (order.pointsEarned && order.pointsEarned > 0) {
          pointsAdjustment -= order.pointsEarned; // deduct earned points
        }

        if (pointsAdjustment !== 0) {
          await tx.user.update({
            where: { id: order.userId },
            data: {
              loyaltyPoints: pointsAdjustment > 0
                ? { increment: pointsAdjustment }
                : { decrement: Math.abs(pointsAdjustment) },
            },
          }).catch((err) => {
            console.error('Failed to adjust loyalty points for cancelled order:', err);
          });
        }
      }

      // 3. Mark order as CANCELLED
      return await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
        },
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  images: true,
                },
              },
            },
          },
        },
      });
    });

    // Notify real-time subscribers (SSE → existing visitors)
    notifyStoreUpdate('all');
    // Bust ISR cache → stock restored products become visible to new visitors immediately
    revalidateStorePages('products');

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel order' },
      { status: 500 }
    );
  }
}

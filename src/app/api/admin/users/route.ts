import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (!hasPermission(session.user, 'manage_users') && userRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to users directory required' }, { status: 403 });
    }

    // 1. Fetch registered users with orders stats
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
        orders: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    const registeredUsers = users.map((u) => {
      const deliveredOrders = u.orders.filter((o) => ['DELIVERED', 'COMPLETED'].includes(o.status?.toUpperCase()));
      const totalSpent = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        permissions: u.permissions,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        ordersCount: u.orders.length,
        totalSpent: Math.round(totalSpent * 100) / 100,
        orders: u.orders,
      };
    });

    // 2. Fetch Guest Orders & aggregate by contact (phone/email)
    const guestOrders = await prisma.order.findMany({
      where: {
        userId: null,
        NOT: { guestInfo: null },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        orderItems: {
          include: { product: true },
        },
      },
    });

    const guestMap = new Map<string, any>();

    for (const order of guestOrders) {
      if (!order.guestInfo) continue;
      let parsedInfo: { name?: string; phone?: string; address?: string; email?: string } = {};
      try {
        parsedInfo = JSON.parse(order.guestInfo);
      } catch (e) {
        continue;
      }

      const rawKey = parsedInfo.phone || parsedInfo.email || parsedInfo.name || order.id;
      const key = rawKey.trim().toLowerCase();

      if (!guestMap.has(key)) {
        guestMap.set(key, {
          id: `guest_${key.replace(/[^a-z0-9]/gi, '_')}`,
          name: parsedInfo.name || 'Guest Customer',
          phone: parsedInfo.phone || 'N/A',
          email: parsedInfo.email || 'N/A',
          address: parsedInfo.address || 'N/A',
          ordersCount: 0,
          totalSpent: 0,
          lastOrderDate: order.createdAt,
          orders: [],
        });
      }

      const guestRecord = guestMap.get(key)!;
      guestRecord.ordersCount += 1;
      if (['DELIVERED', 'COMPLETED'].includes(order.status?.toUpperCase())) {
        guestRecord.totalSpent += order.totalAmount;
      }
      if (new Date(order.createdAt) > new Date(guestRecord.lastOrderDate)) {
        guestRecord.lastOrderDate = order.createdAt;
      }
      guestRecord.orders.push({
        id: order.id,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
        orderItems: order.orderItems,
      });
    }

    const guestBuyers = Array.from(guestMap.values()).map((g) => ({
      ...g,
      totalSpent: Math.round(g.totalSpent * 100) / 100,
    }));

    return NextResponse.json({
      registeredUsers,
      guestBuyers,
    });
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (!hasPermission(session.user, 'manage_users') && userRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to users directory required' }, { status: 403 });
    }

    const { id, name, role, password, permissions } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Privilege Escalation Protection: Moderators cannot edit roles, permissions, passwords, or modify staff accounts
    if (userRole !== 'ADMIN') {
      if (role !== undefined || password !== undefined || permissions !== undefined) {
        return NextResponse.json(
          { error: 'Unauthorized: Only full Administrators can modify user roles, permissions, or reset passwords' },
          { status: 403 }
        );
      }
      if (existingUser.role === 'ADMIN' || existingUser.role === 'MODERATOR') {
        return NextResponse.json(
          { error: 'Unauthorized: Moderators cannot modify staff accounts' },
          { status: 403 }
        );
      }
    }

    const dataToUpdate: any = {};

    if (name !== undefined && name.trim() !== '') {
      dataToUpdate.name = name.trim();
    }

    if (role !== undefined && userRole === 'ADMIN') {
      if (!['USER', 'MODERATOR', 'ADMIN'].includes(role)) {
        return NextResponse.json({ error: 'Invalid user role' }, { status: 400 });
      }
      dataToUpdate.role = role;
    }

    if (permissions !== undefined && userRole === 'ADMIN') {
      if (Array.isArray(permissions)) {
        dataToUpdate.permissions = JSON.stringify(permissions);
      } else if (typeof permissions === 'string') {
        dataToUpdate.permissions = permissions;
      }
    }

    if (password !== undefined && password.trim() !== '' && userRole === 'ADMIN') {
      if (password.trim().length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
      }
      dataToUpdate.password = await bcrypt.hash(password.trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const currentUserId = (session?.user as any)?.id;

    if (!session || userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Only full Admins can delete users' }, { status: 403 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (id === currentUserId) {
      return NextResponse.json({ error: 'You cannot delete your own active account' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 });
  }
}

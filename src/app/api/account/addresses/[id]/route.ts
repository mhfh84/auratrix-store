import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { validateEgyptPhone } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 30 address mutations per IP per hour
    const clientIp = getClientIp(req);
    const rl = checkRateLimit(`address-mutate:${clientIp}`, { limit: 30, windowMs: 60 * 60_000 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const userId = (session.user as any).id;
    const addressId = params.id;
    const body = await req.json();
    const { title, addressType, recipientName, phone, state, city, streetAddress, isDefault } = body;

    // Phone validation when phone is provided
    if (phone !== undefined && phone && !validateEgyptPhone(phone)) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    // Verify ownership
    const existing = await (prisma as any).address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    if (isDefault) {
      await (prisma as any).address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const updated = await (prisma as any).address.update({
      where: { id: addressId },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        addressType: addressType !== undefined ? addressType : undefined,
        recipientName: recipientName !== undefined ? recipientName.trim() : undefined,
        phone: phone !== undefined ? phone.trim() : undefined,
        state: state !== undefined ? (state.trim() || null) : undefined,
        city: city !== undefined ? city.trim() : undefined,
        streetAddress: streetAddress !== undefined ? streetAddress.trim() : undefined,
        isDefault: isDefault !== undefined ? isDefault : undefined,
      },
    });

    return NextResponse.json({ address: updated });
  } catch (error: any) {
    console.error('Update address error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: shared bucket with PUT
    const clientIp = getClientIp(req);
    const rl = checkRateLimit(`address-mutate:${clientIp}`, { limit: 30, windowMs: 60 * 60_000 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const userId = (session.user as any).id;
    const addressId = params.id;

    const existing = await (prisma as any).address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    await (prisma as any).address.delete({
      where: { id: addressId },
    });

    // If deleted address was default, set another one as default if exists
    if (existing.isDefault) {
      const another = await (prisma as any).address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (another) {
        await (prisma as any).address.update({
          where: { id: another.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete address error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: shared bucket with PUT/DELETE
    const clientIp = getClientIp(req);
    const rl = checkRateLimit(`address-mutate:${clientIp}`, { limit: 30, windowMs: 60 * 60_000 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const userId = (session.user as any).id;
    const addressId = params.id;

    const existing = await (prisma as any).address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    // Unset all user's other defaults
    await (prisma as any).address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    // Set this address as default
    const updated = await (prisma as any).address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });

    return NextResponse.json({ address: updated });
  } catch (error: any) {
    console.error('Set default address error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

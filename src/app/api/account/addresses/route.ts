import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { validateEgyptPhone } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const addresses = await (prisma as any).address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    if (addresses.length > 0) {
      const defaultAddresses = addresses.filter((a: any) => a.isDefault);
      if (defaultAddresses.length > 1) {
        const primaryDefaultId = defaultAddresses[0].id;
        const otherDefaultIds = defaultAddresses.slice(1).map((a: any) => a.id);
        await (prisma as any).address.updateMany({
          where: { id: { in: otherDefaultIds } },
          data: { isDefault: false },
        });
        addresses.forEach((a: any) => {
          if (a.id !== primaryDefaultId && a.isDefault) {
            a.isDefault = false;
          }
        });
      } else if (defaultAddresses.length === 0) {
        const firstId = addresses[0].id;
        await (prisma as any).address.update({
          where: { id: firstId },
          data: { isDefault: true },
        });
        addresses[0].isDefault = true;
      }
    }

    return NextResponse.json({ addresses });
  } catch (error: any) {
    console.error('Fetch addresses error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 30 address creates per IP per hour
    const clientIp = getClientIp(req);
    const rl = checkRateLimit(`address-create:${clientIp}`, { limit: 30, windowMs: 60 * 60_000 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const userId = (session.user as any).id;
    const body = await req.json();
    const { title, addressType, recipientName, phone, state, city, streetAddress, isDefault } = body;

    if (!phone || !city || !streetAddress) {
      return NextResponse.json({ error: 'Phone, city, and street address are required' }, { status: 400 });
    }

    // Phone validation
    if (!validateEgyptPhone(phone)) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    // Check existing address count
    const existingCount = await (prisma as any).address.count({
      where: { userId },
    });

    // Cap addresses at 10 per user
    if (existingCount >= 10) {
      return NextResponse.json({ error: 'Maximum of 10 addresses allowed' }, { status: 400 });
    }

    const makeDefault = isDefault === true || existingCount === 0;

    if (makeDefault) {
      await (prisma as any).address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const newAddress = await (prisma as any).address.create({
      data: {
        userId,
        title: title?.trim() || 'المنزل',
        addressType: addressType || 'HOME',
        recipientName: recipientName?.trim() || (session.user as any).name || null,
        phone: phone.trim(),
        state: state?.trim() || null,
        city: city.trim(),
        streetAddress: streetAddress.trim(),
        isDefault: makeDefault,
      },
    });

    return NextResponse.json({ address: newAddress }, { status: 201 });
  } catch (error: any) {
    console.error('Create address error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

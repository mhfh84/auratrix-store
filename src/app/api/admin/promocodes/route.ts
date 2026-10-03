import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ensureDefaultPromoCode } from '@/lib/promoHelper';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (!hasPermission(session.user, 'manage_promocodes') && userRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to promo codes required' }, { status: 403 });
    }

    // Auto-ensure default welcome code and VIP code if none exist
    const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    await ensureDefaultPromoCode(prisma, settings?.popupDiscountCode || 'WELCOME10');
    await ensureDefaultPromoCode(prisma, 'VIP10');

    const promocodes = await prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(promocodes);
  } catch (error: any) {
    console.error('Error fetching promocodes:', error);
    return NextResponse.json({ error: 'Failed to fetch promo codes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (!hasPermission(session.user, 'manage_promocodes') && userRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to promo codes required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      code,
      discountType,
      discountValue,
      description,
      minOrderAmount,
      maxUses,
      maxUsesPerUser,
      expiresAt,
      isActive,
    } = body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ error: 'Promo code is required' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    if (!['PERCENTAGE', 'FIXED'].includes(discountType)) {
      return NextResponse.json({ error: 'Discount type must be PERCENTAGE or FIXED' }, { status: 400 });
    }

    const numValue = Number(discountValue);
    if (isNaN(numValue) || numValue <= 0) {
      return NextResponse.json({ error: 'Discount value must be a positive number' }, { status: 400 });
    }

    if (discountType === 'PERCENTAGE' && numValue > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100%' }, { status: 400 });
    }

    const existing = await prisma.promoCode.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json({ error: `Promo code "${cleanCode}" already exists` }, { status: 409 });
    }

    const promocode = await prisma.promoCode.create({
      data: {
        code: cleanCode,
        discountType,
        discountValue: numValue,
        description: description ? String(description).trim() : '',
        minOrderAmount: minOrderAmount ? Math.max(0, Number(minOrderAmount)) : 0,
        maxUses: maxUses !== null && maxUses !== undefined && maxUses !== '' ? Math.max(1, parseInt(String(maxUses))) : null,
        maxUsesPerUser: maxUsesPerUser !== null && maxUsesPerUser !== undefined && maxUsesPerUser !== '' ? Math.max(1, parseInt(String(maxUsesPerUser))) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json(promocode, { status: 201 });
  } catch (error: any) {
    console.error('Error creating promo code:', error);
    return NextResponse.json({ error: error.message || 'Failed to create promo code' }, { status: 500 });
  }
}

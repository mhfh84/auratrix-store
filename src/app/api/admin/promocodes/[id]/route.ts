import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (!hasPermission(session.user, 'manage_promocodes') && userRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to promo codes required' }, { status: 403 });
    }

    const { id } = params;
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

    const existing = await prisma.promoCode.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Promo code not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (code !== undefined && code.trim()) {
      const cleanCode = code.trim().toUpperCase();
      if (cleanCode !== existing.code) {
        const codeTaken = await prisma.promoCode.findUnique({ where: { code: cleanCode } });
        if (codeTaken) {
          return NextResponse.json({ error: `Promo code "${cleanCode}" already exists` }, { status: 409 });
        }
        updateData.code = cleanCode;
      }
    }

    if (discountType !== undefined) {
      if (!['PERCENTAGE', 'FIXED'].includes(discountType)) {
        return NextResponse.json({ error: 'Discount type must be PERCENTAGE or FIXED' }, { status: 400 });
      }
      updateData.discountType = discountType;
    }

    if (discountValue !== undefined) {
      const numValue = Number(discountValue);
      if (isNaN(numValue) || numValue <= 0) {
        return NextResponse.json({ error: 'Discount value must be a positive number' }, { status: 400 });
      }
      const typeToCheck = discountType || existing.discountType;
      if (typeToCheck === 'PERCENTAGE' && numValue > 100) {
        return NextResponse.json({ error: 'Percentage discount cannot exceed 100%' }, { status: 400 });
      }
      updateData.discountValue = numValue;
    }

    if (description !== undefined) {
      updateData.description = String(description).trim();
    }

    if (minOrderAmount !== undefined) {
      updateData.minOrderAmount = Math.max(0, Number(minOrderAmount) || 0);
    }

    if (maxUses !== undefined) {
      updateData.maxUses = maxUses !== null && maxUses !== '' ? Math.max(1, parseInt(String(maxUses))) : null;
    }

    if (maxUsesPerUser !== undefined) {
      updateData.maxUsesPerUser = maxUsesPerUser !== null && maxUsesPerUser !== '' ? Math.max(1, parseInt(String(maxUsesPerUser))) : null;
    }

    if (expiresAt !== undefined) {
      updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const updated = await prisma.promoCode.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating promo code:', error);
    return NextResponse.json({ error: error.message || 'Failed to update promo code' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (!hasPermission(session.user, 'manage_promocodes') && userRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to promo codes required' }, { status: 403 });
    }

    const { id } = params;

    await prisma.promoCode.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting promo code:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete promo code' }, { status: 500 });
  }
}

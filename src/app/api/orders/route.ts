import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Rate limit: max 10 order submissions per IP per hour
    const clientIp = getClientIp(request);
    const rl = checkRateLimit(`order:${clientIp}`, { limit: 10, windowMs: 60 * 60_000 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const body = await request.json();
    const {
      items,
      guestInfo,
      promoCode,
      paymentMethod,
      paymentProof,
      pointsToRedeem,
      fingerprintId,
      newAddressToSave,
    } = body;


    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart items are required' }, { status: 400 });
    }

    let userId: string | null = null;
    let userPoints = 0;
    if (session?.user) {
      userId = (session.user as any).id || null;
      if (userId) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { loyaltyPoints: true } });
        userPoints = user?.loyaltyPoints || 0;
      }
    }

    // Validate Guest Info if not logged in
    if (!userId) {
      if (!guestInfo || !guestInfo.name || !guestInfo.phone || !guestInfo.address) {
        return NextResponse.json({ error: 'Guest name, phone, and address are required' }, { status: 400 });
      }
    }

    // Auto-save address & update user profile contact details if logged in
    if (userId && guestInfo) {
      try {
        const phone = (guestInfo.phone || '').trim();
        const state = (guestInfo.state || '').trim() || null;
        const city = (guestInfo.city || '').trim() || 'القاهرة';
        const street = (guestInfo.address || '').trim();
        const recipientName = (guestInfo.name || '').trim() || (session?.user?.name || '');

        const updateUserData: Record<string, any> = {};
        if (phone) updateUserData.phone = phone;
        if (state) updateUserData.state = state;
        if (city) updateUserData.city = city;
        if (street) updateUserData.address = street;

        if (Object.keys(updateUserData).length > 0) {
          await prisma.user.update({
            where: { id: userId },
            data: updateUserData,
          });
        }

        // Auto-save address to user's address book (Address model)
        if (street && phone) {
          const existingAddr = await (prisma as any).address.findFirst({
            where: {
              userId,
              streetAddress: street,
              city: city,
            },
          });

          if (!existingAddr) {
            const addrCount = await (prisma as any).address.count({ where: { userId } });
            const isDef = addrCount === 0 || Boolean(newAddressToSave?.isDefault);
            if (isDef && addrCount > 0) {
              await (prisma as any).address.updateMany({ where: { userId }, data: { isDefault: false } });
            }
            await (prisma as any).address.create({
              data: {
                userId,
                title: newAddressToSave?.title || (city ? `المنزل - ${city}` : 'عنوان التوصيل'),
                recipientName: recipientName,
                phone: phone,
                state: state,
                city: city,
                streetAddress: street,
                isDefault: isDef,
              },
            });
          }
        }
      } catch (uErr) {
        console.error('Non-fatal user contact & address auto-save error:', uErr);
      }
    }

    // Fetch store settings for points
    const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    const loyaltyEnabled = settings ? ((settings as any).loyaltyEnabled ?? true) : true;
    const pointsPerDollar = settings?.pointsPerDollar || 1.0;
    const pointsRedemptionRate = settings ? ((settings as any).pointsRedemptionRate || 20.0) : 20.0;

    // Process Order Creation & Stock Deduction within Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      let itemsTotal = 0;
      const orderItemsToCreate = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.id },
        });

        if (!product) {
          throw new Error(`Product with ID ${item.id} not found.`);
        }

        // If a variant (color) was selected, validate and deduct variant stock
        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
          });
          if (!variant) {
            throw new Error(`Selected color variant not found for "${product.title}".`);
          }
          if (variant.stockQuantity < item.quantity) {
            throw new Error(`Insufficient stock for "${product.title}" (${variant.colorName}). Only ${variant.stockQuantity} remaining.`);
          }
          // Deduct variant stock
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { decrement: item.quantity } },
          });
        } else {
          // No variant — validate overall product stock
          if (product.stockQuantity < item.quantity) {
            throw new Error(`Insufficient stock for "${product.title}". Only ${product.stockQuantity} remaining.`);
          }
        }

        // Always deduct overall product stock
        await tx.product.update({
          where: { id: item.id },
          data: { stockQuantity: { decrement: item.quantity } },
        });

        const hasDiscount = Boolean(product.discountPercent && product.discountPercent > 0);
        const unitPrice = hasDiscount ? product.price * (1 - product.discountPercent / 100) : product.price;
        const itemTotal = unitPrice * item.quantity;
        itemsTotal += itemTotal;

        orderItemsToCreate.push({
          productId: product.id,
          variantId: item.variantId || null,
          colorName: item.selectedColor || null,
          quantity: item.quantity,
          price: unitPrice,
        });
      }

      // Handle Promo Code if provided
      let appliedPromoCode: string | null = null;
      let discountAmount = 0;

      if (promoCode && typeof promoCode === 'string' && promoCode.trim()) {
        const cleanCode = promoCode.trim().toUpperCase();
        const cleanFp = (fingerprintId || '').trim();

        // Anti-Abuse: Verify that this IP or fingerprint hasn't already used this code
        const ipConditions: any[] = [];
        if (clientIp && clientIp !== 'unknown') {
          ipConditions.push({ code: cleanCode, ip: clientIp });
        }
        if (cleanFp) {
          ipConditions.push({ code: cleanCode, fingerprintId: cleanFp });
        }

        let alreadyUsed = false;
        if (ipConditions.length > 0) {
          const usageRecord = await tx.promoCodeIpUsage.findFirst({
            where: { OR: ipConditions },
          });
          if (usageRecord) {
            alreadyUsed = true;
          }
        }

        // Also check if logged in user already used it in a previous order
        if (!alreadyUsed && userId) {
          const userOrderCount = await tx.order.count({
            where: { userId, promoCode: cleanCode },
          });
          if (userOrderCount > 0) {
            alreadyUsed = true;
          }
        }

        const promo = await tx.promoCode.findUnique({ where: { code: cleanCode } });

        if (promo && promo.isActive && !alreadyUsed) {
          const isNotExpired = !promo.expiresAt || new Date(promo.expiresAt) >= new Date();
          const isNotMaxUsed = promo.maxUses === null || promo.usedCount < promo.maxUses;
          const isMinTotalMet = promo.minOrderAmount === 0 || itemsTotal >= promo.minOrderAmount;

          if (isNotExpired && isNotMaxUsed && isMinTotalMet) {
            appliedPromoCode = promo.code;
            if (promo.discountType === 'PERCENTAGE') {
              discountAmount = (itemsTotal * promo.discountValue) / 100;
            } else {
              discountAmount = promo.discountValue;
            }
            discountAmount = Math.min(itemsTotal, Math.round(discountAmount * 100) / 100);

            // Increment usedCount
            await tx.promoCode.update({
              where: { id: promo.id },
              data: { usedCount: { increment: 1 } },
            });

            // Atomically record IP + Fingerprint usage so code cannot be reused by this device/IP
            await tx.promoCodeIpUsage.create({
              data: {
                code: cleanCode,
                ip: clientIp,
                fingerprintId: cleanFp,
              },
            });
          }
        }
      }

      // If no promo code applied and user was referred, auto-apply referral discount
      if (!appliedPromoCode && userId) {
        const pendingReferral = await (tx as any).referralRecord.findFirst({
          where: { referredUserId: userId, status: 'PENDING' },
        });
        if (pendingReferral && pendingReferral.discountGiven > 0) {
          const refDiscount = (itemsTotal * pendingReferral.discountGiven) / 100;
          discountAmount = Math.min(itemsTotal, Math.round(refDiscount * 100) / 100);
          appliedPromoCode = `REFERRAL-${Math.round(pendingReferral.discountGiven)}%`;
        }
      }

      // Handle Loyalty Points Discount (e.g. 20 points = $1 discount)
      let actualPointsUsed = 0;
      let pointsDiscount = 0;
      if (loyaltyEnabled && userId && pointsToRedeem && pointsToRedeem > 0) {
        const redeemable = Math.min(userPoints, Math.floor(pointsToRedeem));
        if (redeemable > 0) {
          actualPointsUsed = redeemable;
          pointsDiscount = Math.round((redeemable / pointsRedemptionRate) * 100) / 100;
          await tx.user.update({
            where: { id: userId },
            data: { loyaltyPoints: { decrement: actualPointsUsed } },
          });
        }
      }

      // Normalize payment method
      const validMethods = ['COD', 'CARD', 'INSTAPAY', 'FAWRY', 'WALLETS'];
      const method = validMethods.includes(paymentMethod) ? paymentMethod : 'COD';
      const paymentStatus = method === 'CARD' ? 'PAID' : 'PENDING';

      const totalDiscounts = discountAmount + pointsDiscount;
      const shippingFee = (settings?.shippingFee && settings.shippingFee > 0) ? settings.shippingFee : 0;
      const codExtraFee = (method === 'COD' && (settings as any)?.paymentCodExtraFee && (settings as any).paymentCodExtraFee > 0) ? (settings as any).paymentCodExtraFee : 0;
      const finalTotalAmount = Math.max(0, Math.round((itemsTotal - totalDiscounts + shippingFee + codExtraFee) * 100) / 100);

      // Points Earned calculation
      const pointsEarned = (loyaltyEnabled && userId) ? Math.floor(finalTotalAmount * pointsPerDollar) : 0;
      if (loyaltyEnabled && userId && pointsEarned > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { loyaltyPoints: { increment: pointsEarned } },
        });
      }

      // Generate tracking number with dynamic store prefix
      const rawPrefix = (settings?.storeName || 'TRK').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
      const prefix = rawPrefix.length >= 2 ? rawPrefix : 'TRK';
      const trackingNumber = `${prefix}-${Math.floor(10000000 + Math.random() * 90000000)}`;

      // Order Deposit Calculation
      const depositEnabled = Boolean(settings ? (settings as any).depositEnabled : false);
      const depositAppliesTo = settings ? (settings as any).depositAppliesTo || 'COD' : 'COD';
      const depositType = settings ? (settings as any).depositType || 'FIXED' : 'FIXED';
      const depositValue = settings ? (settings as any).depositValue || 50 : 50;
      const depositMinOrderTotal = settings ? (settings as any).depositMinOrderTotal || 0 : 0;

      const isDepositApplicable = depositEnabled && (depositAppliesTo === 'ALL' || method === 'COD') && (!depositMinOrderTotal || finalTotalAmount >= depositMinOrderTotal);

      let calculatedDepositAmount = 0;
      if (isDepositApplicable && finalTotalAmount > 0) {
        if (depositType === 'PERCENTAGE') {
          calculatedDepositAmount = Math.min(finalTotalAmount, Math.round((finalTotalAmount * depositValue) / 100));
        } else if (depositType === 'SHIPPING_ONLY') {
          calculatedDepositAmount = Math.min(finalTotalAmount, settings?.shippingFee || 50);
        } else {
          calculatedDepositAmount = Math.min(finalTotalAmount, depositValue);
        }
      }

      const finalDepositAmount = calculatedDepositAmount > 0 ? calculatedDepositAmount : 0;
      const finalRemainingAmount = Math.max(0, Math.round((finalTotalAmount - finalDepositAmount) * 100) / 100);

      // Enforce Deposit Receipt / Payment Proof when deposit is enabled and applicable
      if (isDepositApplicable && finalDepositAmount > 0) {
        if (!paymentProof || typeof paymentProof !== 'string' || !paymentProof.trim()) {
          throw new Error('يرجى إرفاق صورة/لقطة شاشة إيصال تحويل العربون لتأكيد حجز الطلب.');
        }
      }

      const depositStatus = finalDepositAmount > 0 ? 'PENDING_PROOF' : 'NONE';

      // Create Order Record
      const newOrder = await tx.order.create({
        data: {
          userId: userId,
          guestInfo: guestInfo ? JSON.stringify(guestInfo) : null,
          totalAmount: finalTotalAmount,
          promoCode: appliedPromoCode,
          discountAmount: totalDiscounts,
          pointsUsed: actualPointsUsed,
          pointsEarned: pointsEarned,
          paymentMethod: method,
          paymentStatus: paymentStatus,
          paymentProof: (method === 'INSTAPAY' || method === 'FAWRY' || method === 'WALLETS' || finalDepositAmount > 0) ? (paymentProof || null) : null,
          depositAmount: finalDepositAmount,
          depositStatus: depositStatus,
          remainingAmount: finalRemainingAmount,
          trackingNumber: trackingNumber,
          status: 'PENDING',
          orderItems: {
            create: orderItemsToCreate,
          },
        },
        include: {
          orderItems: {
            include: { product: true },
          },
          user: {
            select: { id: true, name: true, email: true, role: true, loyaltyPoints: true, phone: true, state: true, city: true, address: true },
          },
        },
      });

      return newOrder;
    });

    // Asynchronously send order confirmation email (non-blocking)
    try {
      const { sendOrderConfirmationEmail } = await import('@/lib/email');
      sendOrderConfirmationEmail(result).catch((err) => {
        console.error('Non-blocking order email error:', err);
      });
    } catch (e) {}

    // Award referrer points for referred user's first order (non-blocking)
    if (userId) {
      try {
        const { awardReferrerOnFirstOrder } = await import('@/lib/referralHelper');
        awardReferrerOnFirstOrder(prisma as any, userId, result.id).catch((err) => {
          console.error('Non-blocking referral reward error:', err);
        });
      } catch (e) {}
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Error submitting order:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit order' }, { status: 400 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManageOrders = userRole === 'ADMIN' || hasPermission(session.user, 'manage_orders');

    let where: any = {};
    if (!canManageOrders) {
      where.userId = userId;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, state: true, city: true, address: true },
        },
        orderItems: {
          include: { product: true },
        },
      },
    });

    return NextResponse.json(orders);
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (!hasPermission(session.user, 'manage_orders') && userRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to order management required' }, { status: 403 });
    }

    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Order IDs array is required' }, { status: 400 });
    }

    await prisma.order.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error: any) {
    console.error('Error bulk deleting orders:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete orders' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (!hasPermission(session.user, 'manage_orders') && userRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to order management required' }, { status: 403 });
    }

    const { ids, status } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0 || !status) {
      return NextResponse.json({ error: 'Order IDs array and status are required' }, { status: 400 });
    }

    if (!['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid order status' }, { status: 400 });
    }

    await prisma.order.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error: any) {
    console.error('Error bulk updating order status:', error);
    return NextResponse.json({ error: error.message || 'Failed to update order status' }, { status: 500 });
  }
}

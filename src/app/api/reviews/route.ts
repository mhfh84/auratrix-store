import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { hasPermission } from '@/lib/permissions';

// ─── GET — fetch reviews for a product (storefront: approved only; admin: all) ─

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const adminAll = searchParams.get('admin') === '1';

    // Admin-only: require ADMIN or MODERATOR with manage_reviews permission to view all reviews
    if (adminAll) {
      const session = await getServerSession(authOptions);
      const role = (session?.user as any)?.role;
      if (!session?.user || (!hasPermission(session.user, 'manage_reviews') && role !== 'ADMIN')) {
        return NextResponse.json({ error: 'Unauthorized: Access to reviews management required' }, { status: 401 });
      }
    }

    if (!productId && !adminAll) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = {};
    if (productId) where.productId = productId;

    // Storefront: only show approved reviews (checks isVerified or status APPROVED)
    if (!adminAll) {
      where.OR = [
        { isVerified: true },
        { status: 'APPROVED' },
      ];
    }

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { id: true, title: true } } },
    });

    return NextResponse.json({ reviews });
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// ─── POST — submit a new review (always starts as pending / isVerified: false) ─

export async function POST(req: NextRequest) {
  try {
    // Rate limit: max 5 review submissions per IP per hour
    const ip = getClientIp(req);
    const rl = checkRateLimit(`review-submit:${ip}`, { limit: 5, windowMs: 60 * 60_000 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { productId, authorName, authorEmail, rating, comment } = body;

    if (!productId || !authorName || !comment || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const numericRating = Math.max(1, Math.min(5, Math.round(Number(rating))));

    const review = await prisma.review.create({
      data: {
        productId,
        userId: session?.user ? (session.user as any).id : null,
        authorName: authorName.trim(),
        authorEmail: authorEmail?.trim() || null,
        rating: numericRating,
        comment: comment.trim(),
        isVerified: false, // Starts pending — admin must approve
        status: 'PENDING',
      },
    });

    return NextResponse.json({ review, message: 'Review submitted and pending approval.' }, { status: 201 });
  } catch (error: any) {
    console.error('Error submitting review:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// ─── PATCH — admin: toggle isVerified / status / reply ───────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session?.user || (!hasPermission(session.user, 'manage_reviews') && role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to reviews management required' }, { status: 403 });
    }

    const body = await req.json();
    const { reviewId, isVerified, status, adminReply } = body;

    if (!reviewId) {
      return NextResponse.json({ error: 'reviewId is required' }, { status: 400 });
    }

    const updateData: Record<string, any> = {};

    if (typeof isVerified === 'boolean') {
      updateData.isVerified = isVerified;
      updateData.status = isVerified ? 'APPROVED' : 'PENDING';
    }

    if (status) {
      updateData.status = status;
      updateData.isVerified = status === 'APPROVED';
    }

    if (adminReply !== undefined) {
      updateData.adminReply = adminReply ? adminReply.trim() : null;
      updateData.adminRepliedAt = adminReply ? new Date() : null;
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: updateData,
    });

    // Recalculate product average rating from approved reviews only
    const approvedReviews = await prisma.review.findMany({
      where: {
        productId: updated.productId,
        OR: [{ isVerified: true }, { status: 'APPROVED' }],
      },
      select: { rating: true },
    });
    const ratingCount = approvedReviews.length;
    const averageRating = ratingCount > 0
      ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount
      : 0;

    await prisma.product.update({
      where: { id: updated.productId },
      data: { averageRating: Number(averageRating.toFixed(1)), ratingCount },
    });

    return NextResponse.json({ review: updated, averageRating, ratingCount });
  } catch (error: any) {
    console.error('Error patching review:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE — admin: delete a review ─────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session?.user || (!hasPermission(session.user, 'manage_reviews') && role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to reviews management required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const reviewId = searchParams.get('reviewId');
    if (!reviewId) {
      return NextResponse.json({ error: 'reviewId is required' }, { status: 400 });
    }

    const deleted = await prisma.review.delete({ where: { id: reviewId } });

    // Recalculate product average rating after deletion
    const approvedReviews = await prisma.review.findMany({
      where: {
        productId: deleted.productId,
        OR: [{ isVerified: true }, { status: 'APPROVED' }],
      },
      select: { rating: true },
    });
    const ratingCount = approvedReviews.length;
    const averageRating = ratingCount > 0
      ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount
      : 0;

    await prisma.product.update({
      where: { id: deleted.productId },
      data: { averageRating: Number(averageRating.toFixed(1)), ratingCount },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting review:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

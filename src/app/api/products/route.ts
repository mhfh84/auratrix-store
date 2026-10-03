import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllImageUrls } from '@/lib/images';
import { notifyStoreUpdate } from '@/lib/realtimeEvents';
import { revalidateStorePages } from '@/lib/revalidateStore';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const sort = searchParams.get('sort') || 'newest';
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const inStock = searchParams.get('inStock');
    const onSale = searchParams.get('onSale');
    const minRating = searchParams.get('minRating');
    const color = searchParams.get('color');

    const where: any = {};

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { variants: { some: { colorName: { contains: q } } } },
      ];
    }

    if (category && category.trim()) {
      const catSlug = category.trim();
      // Look up category and its subcategories if any
      const matchedCategory = await prisma.category.findUnique({
        where: { slug: catSlug },
        include: { children: true },
      });

      if (matchedCategory) {
        const matchingSlugs = [
          matchedCategory.slug,
          ...(matchedCategory.children || []).map((c) => c.slug),
        ];
        where.categories = {
          some: { slug: { in: matchingSlugs } },
        };
      } else {
        where.categories = {
          some: { slug: catSlug },
        };
      }
    }

    // Price Filtering
    const parsedMinPrice = minPrice !== null && minPrice !== '' ? parseFloat(minPrice) : NaN;
    const parsedMaxPrice = maxPrice !== null && maxPrice !== '' ? parseFloat(maxPrice) : NaN;
    if (!isNaN(parsedMinPrice) || !isNaN(parsedMaxPrice)) {
      where.price = {};
      if (!isNaN(parsedMinPrice) && parsedMinPrice >= 0) {
        where.price.gte = parsedMinPrice;
      }
      if (!isNaN(parsedMaxPrice) && parsedMaxPrice > 0) {
        where.price.lte = parsedMaxPrice;
      }
    }

    // In Stock Only Filter
    if (inStock === 'true' || inStock === '1') {
      where.stockQuantity = { gt: 0 };
    }

    // On Sale (Discounted) Filter
    if (onSale === 'true' || onSale === '1') {
      where.discountPercent = { gt: 0 };
    }

    // Minimum Rating Filter
    const parsedRating = minRating !== null && minRating !== '' ? parseFloat(minRating) : NaN;
    if (!isNaN(parsedRating) && parsedRating > 0) {
      where.averageRating = { gte: parsedRating };
    }

    // Color Variant Filter
    if (color && color.trim()) {
      where.variants = {
        some: { colorName: { contains: color.trim() } },
      };
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price-asc') orderBy = { price: 'asc' };
    else if (sort === 'price-desc') orderBy = { price: 'desc' };
    else if (sort === 'discount-desc') orderBy = { discountPercent: 'desc' };
    else if (sort === 'rating-desc') orderBy = { averageRating: 'desc' };
    else if (sort === 'title-asc' || sort === 'title') orderBy = { title: 'asc' };
    else if (sort === 'title-desc') orderBy = { title: 'desc' };
    else orderBy = { createdAt: 'desc' };

    const products = await prisma.product.findMany({
      where,
      orderBy,
      include: {
        categories: {
          include: {
            parent: true,
          },
        },
        variants: {
          orderBy: { createdAt: 'asc' },
        },
        reviews: {
          where: { status: 'APPROVED' },
          select: { rating: true },
        },
      },
    });

    return NextResponse.json(products);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || (!hasPermission(session.user, 'manage_products') && userRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to product management required.' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, price, discountPercent, saleEndsAt, stockQuantity, images, categoryIds, variants } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Product title is required' }, { status: 400 });
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json({ error: 'Valid product price is required' }, { status: 400 });
    }

    const parsedDiscount = Math.min(99, Math.max(0, parseFloat(discountPercent) || 0));
    const parsedSaleEndsAt = saleEndsAt ? new Date(saleEndsAt) : null;
    const validCategoryIds: string[] = Array.isArray(categoryIds) ? categoryIds.filter(Boolean) : [];

    // If variants provided, calculate total stock from them
    const validVariants: { colorName: string; colorHex: string; stockQuantity: number; image?: string }[] =
      Array.isArray(variants)
        ? variants.filter((v: any) => v.colorName && v.colorName.trim())
        : [];

    const computedStock =
      validVariants.length > 0
        ? validVariants.reduce((sum, v) => sum + (parseInt(String(v.stockQuantity), 10) || 0), 0)
        : parseInt(stockQuantity, 10) || 0;

    const parsedImages = getAllImageUrls(images);
    const imagesToStore = parsedImages.length > 0
      ? parsedImages
      : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'];

    const finalDescription = (description && description.trim()) ? description.trim() : title.trim();

    const newProduct = await prisma.product.create({
      data: {
        title: title.trim(),
        description: finalDescription,
        price: parsedPrice,
        discountPercent: parsedDiscount,
        saleEndsAt: parsedSaleEndsAt,
        stockQuantity: computedStock,
        images: JSON.stringify(imagesToStore),
        categories: validCategoryIds.length > 0
          ? { connect: validCategoryIds.map((id) => ({ id })) }
          : undefined,
        variants: validVariants.length > 0
          ? {
              create: validVariants.map((v) => ({
                colorName: v.colorName.trim(),
                colorHex: v.colorHex || '#6366f1',
                stockQuantity: parseInt(String(v.stockQuantity), 10) || 0,
                image: v.image || null,
              })),
            }
          : undefined,
      },
      include: {
        categories: {
          include: { parent: true },
        },
        variants: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Notify realtime listeners (SSE → existing visitors)
    notifyStoreUpdate('products', { action: 'create', product: newProduct });
    // Bust ISR cache → new visitors also see the new product immediately
    revalidateStorePages('products');

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: error.message || 'Failed to create product' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No product IDs provided' }, { status: 400 });
    }

    await prisma.product.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    // Notify realtime listeners (SSE → existing visitors)
    notifyStoreUpdate('products', { action: 'delete_many', ids });
    // Bust ISR cache → new visitors also see the removed products gone immediately
    revalidateStorePages('products');

    return NextResponse.json({ message: 'Products deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting products:', error);
    return NextResponse.json({ error: 'Failed to delete products' }, { status: 500 });
  }
}

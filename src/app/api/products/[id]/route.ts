import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllImageUrls } from '@/lib/images';
import { notifyStoreUpdate } from '@/lib/realtimeEvents';
import { revalidateStorePages } from '@/lib/revalidateStore';
import { hasPermission } from '@/lib/permissions';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        categories: {
          include: { parent: true },
        },
        variants: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching product' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || (!hasPermission(session.user, 'manage_products') && userRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to product management required' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, price, discountPercent, saleEndsAt, stockQuantity, images, categoryIds, variants } = body;

    const parsedDiscount = discountPercent !== undefined
      ? Math.min(99, Math.max(0, parseFloat(discountPercent) || 0))
      : undefined;

    const parsedSaleEndsAt = saleEndsAt !== undefined
      ? (saleEndsAt ? new Date(saleEndsAt) : null)
      : undefined;

    const validCategoryIds: string[] = Array.isArray(categoryIds) ? categoryIds.filter(Boolean) : [];

    // If variants provided, calculate total stock from them
    const validVariants: { colorName: string; colorHex: string; stockQuantity: number; image?: string }[] =
      Array.isArray(variants)
        ? variants.filter((v: any) => v.colorName && v.colorName.trim())
        : [];

    const computedStock =
      validVariants.length > 0
        ? validVariants.reduce((sum, v) => sum + (parseInt(String(v.stockQuantity), 10) || 0), 0)
        : stockQuantity !== undefined
        ? parseInt(stockQuantity, 10)
        : undefined;

    // Delete existing variants and recreate if variants key was sent
    if (variants !== undefined) {
      await prisma.productVariant.deleteMany({ where: { productId: params.id } });
    }

    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: {
        title,
        description,
        price: price !== undefined ? parseFloat(price) : undefined,
        discountPercent: parsedDiscount,
        saleEndsAt: parsedSaleEndsAt,
        stockQuantity: computedStock,
        images: images !== undefined ? JSON.stringify(getAllImageUrls(images)) : undefined,
        // Replace all categories with the new set
        categories: categoryIds !== undefined
          ? { set: validCategoryIds.map((id) => ({ id })) }
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
    notifyStoreUpdate('products', { action: 'update', product: updatedProduct });
    // Bust ISR cache → new visitors see stock/price changes immediately
    revalidateStorePages('products');

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || (!hasPermission(session.user, 'manage_products') && userRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to product management required' }, { status: 403 });
    }

    await prisma.product.delete({
      where: { id: params.id },
    });

    // Notify realtime listeners (SSE → existing visitors)
    notifyStoreUpdate('products', { action: 'delete', id: params.id });
    // Bust ISR cache → new visitors also see removed product gone
    revalidateStorePages('products');

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}

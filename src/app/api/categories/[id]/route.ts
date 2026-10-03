import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notifyStoreUpdate } from '@/lib/realtimeEvents';
import { revalidateStorePages } from '@/lib/revalidateStore';
import { hasPermission } from '@/lib/permissions';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || (!hasPermission(session.user, 'manage_categories') && userRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to category management required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, parentId, image } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    let validParentId: string | null = null;
    if (parentId && typeof parentId === 'string' && parentId.trim()) {
      if (parentId === params.id) {
        return NextResponse.json({ error: 'A category cannot be its own parent' }, { status: 400 });
      }

      const parentCategory = await prisma.category.findUnique({
        where: { id: parentId },
      });
      if (!parentCategory) {
        return NextResponse.json({ error: 'Parent category not found' }, { status: 400 });
      }

      // Prevent circular dependency: check if target parent is a child/descendant of current category
      let currentCheck: string | null = parentCategory.parentId;
      while (currentCheck) {
        if (currentCheck === params.id) {
          return NextResponse.json(
            { error: 'Cannot set a child or descendant category as parent' },
            { status: 400 }
          );
        }
        const nextParent = await prisma.category.findUnique({
          where: { id: currentCheck },
          select: { parentId: true },
        });
        currentCheck = nextParent?.parentId ?? null;
      }

      validParentId = parentCategory.id;
    }

    const trimmedName = name.trim();
    const slug = trimmedName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\u0600-\u06ff-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Check slug uniqueness excluding this record
    const existing = await prisma.category.findFirst({
      where: { slug, NOT: { id: params.id } },
    });
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

    const category = await prisma.category.update({
      where: { id: params.id },
      data: {
        name: trimmedName,
        slug: finalSlug,
        parentId: validParentId,
        image: image !== undefined ? (typeof image === 'string' && image.trim() ? image.trim() : null) : undefined,
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true, children: true } },
      },
    });

    notifyStoreUpdate('categories', { action: 'update', category });
    revalidateStorePages('categories');

    return NextResponse.json(category);
  } catch (error: any) {
    console.error('Error updating category:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || (!hasPermission(session.user, 'manage_categories') && userRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to category management required' }, { status: 403 });
    }

    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: { _count: { select: { products: true, children: true } } },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    if (category._count.children > 0) {
      return NextResponse.json(
        { error: 'HAS_CHILDREN', count: category._count.children },
        { status: 409 }
      );
    }

    if (category._count.products > 0) {
      return NextResponse.json(
        { error: 'HAS_PRODUCTS', count: category._count.products },
        { status: 409 }
      );
    }

    await prisma.category.delete({ where: { id: params.id } });

    notifyStoreUpdate('categories', { action: 'delete', id: params.id });
    revalidateStorePages('categories');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}

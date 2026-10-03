import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notifyStoreUpdate } from '@/lib/realtimeEvents';
import { revalidateStorePages } from '@/lib/revalidateStore';
import { hasPermission } from '@/lib/permissions';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
            _count: { select: { products: true } },
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: { products: true, children: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
      const parentCategory = await prisma.category.findUnique({
        where: { id: parentId },
      });
      if (!parentCategory) {
        return NextResponse.json({ error: 'Parent category not found' }, { status: 400 });
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

    // Make slug unique if it already exists
    const existing = await prisma.category.findUnique({ where: { slug } });
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

    const category = await prisma.category.create({
      data: {
        name: trimmedName,
        slug: finalSlug,
        parentId: validParentId,
        image: typeof image === 'string' && image.trim() ? image.trim() : null,
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true, children: true } },
      },
    });

    notifyStoreUpdate('categories', { action: 'create', category });
    revalidateStorePages('categories');

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error('Error creating category:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

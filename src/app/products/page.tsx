import React from 'react';
import { prisma } from '@/lib/prisma';
import ProductsPageClient from './ProductsPageClient';

export const revalidate = 0;

interface ProductsPageProps {
  searchParams: {
    search?: string;
    category?: string;
    sort?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    onSale?: string;
    minRating?: string;
    color?: string;
  };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const search = searchParams.search || '';
  const categorySlug = searchParams.category || '';
  const sort = searchParams.sort || 'newest';
  const minPrice = searchParams.minPrice || '';
  const maxPrice = searchParams.maxPrice || '';
  const inStock = searchParams.inStock || '';
  const onSale = searchParams.onSale || '';
  const minRating = searchParams.minRating || '';
  const color = searchParams.color || '';

  const categories = await prisma.category.findMany({
    include: {
      children: {
        include: {
          _count: { select: { products: true } },
        },
      },
      parent: true,
      _count: { select: { products: true } },
    },
    orderBy: { name: 'asc' },
  });

  const where: any = {};

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { variants: { some: { colorName: { contains: q } } } },
    ];
  }

  if (categorySlug && categorySlug.trim()) {
    const selectedCategory = categories.find((c) => c.slug === categorySlug);
    let matchingSlugs = [categorySlug];
    if (selectedCategory && selectedCategory.children && selectedCategory.children.length > 0) {
      matchingSlugs = [selectedCategory.slug, ...selectedCategory.children.map((c: any) => c.slug)];
    }
    where.categories = { some: { slug: { in: matchingSlugs } } };
  }

  const parsedMin = minPrice ? parseFloat(minPrice) : NaN;
  const parsedMax = maxPrice ? parseFloat(maxPrice) : NaN;
  if (!isNaN(parsedMin) || !isNaN(parsedMax)) {
    where.price = {};
    if (!isNaN(parsedMin) && parsedMin >= 0) where.price.gte = parsedMin;
    if (!isNaN(parsedMax) && parsedMax > 0) where.price.lte = parsedMax;
  }

  if (inStock === 'true' || inStock === '1') {
    where.stockQuantity = { gt: 0 };
  }

  if (onSale === 'true' || onSale === '1') {
    where.discountPercent = { gt: 0 };
  }

  const parsedRating = minRating ? parseFloat(minRating) : NaN;
  if (!isNaN(parsedRating) && parsedRating > 0) {
    where.averageRating = { gte: parsedRating };
  }

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

  const products = await prisma.product.findMany({
    where,
    orderBy,
    include: {
      categories: { include: { parent: true } },
      variants: { orderBy: { createdAt: 'asc' } },
      reviews: {
        where: { status: 'APPROVED' },
        select: { rating: true },
      },
    },
  });

  return (
    <ProductsPageClient
      products={products}
      categories={categories}
      initialCategorySlug={categorySlug}
      initialSearch={search}
      initialSort={sort}
      initialMinPrice={minPrice}
      initialMaxPrice={maxPrice}
      initialInStock={inStock === 'true' || inStock === '1'}
      initialOnSale={onSale === 'true' || onSale === '1'}
      initialMinRating={minRating}
      initialColor={color}
    />
  );
}

/**
 * productExport.ts
 * Exports the products catalog to an Excel (.xlsx) workbook using the xlsx library.
 * Includes: product name, description, categories, original price, discount %, final price,
 * stock quantity, variant details, images, and created date.
 */

import * as XLSX from 'xlsx';

interface ProductVariant {
  colorName: string;
  colorHex: string;
  stockQuantity: number;
  image?: string;
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  discountPercent?: number;
  stockQuantity: number;
  images: string;
  createdAt?: string | Date;
  saleEndsAt?: string | Date | null;
  categories: { id: string; name: string; parent?: { id: string; name: string } | null }[];
  variants?: ProductVariant[];
}

function parseImages(imagesStr: string): string[] {
  try {
    const parsed = JSON.parse(imagesStr);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === 'string') return [parsed];
  } catch (_) {}
  if (typeof imagesStr === 'string' && imagesStr.trim()) return [imagesStr];
  return [];
}

function getCategoryNames(product: Product): string {
  if (!product.categories || product.categories.length === 0) return '—';
  return product.categories
    .map((c) => (c.parent ? `${c.parent.name} > ${c.name}` : c.name))
    .join(', ');
}

export function exportProductsToExcel(products: Product[], currency: string = 'USD', storeName: string = 'Store'): void {
  const currencySymbol: Record<string, string> = {
    USD: '$', EGP: 'EGP ', EUR: '€', GBP: '£', SAR: 'SAR ', AED: 'AED ',
  };
  const sym = currencySymbol[currency] || '';

  // ─── Sheet 1: Products Overview ──────────────────────────────────────────
  const overviewHeaders = [
    'ID', 'Product Name', 'Category', 'Original Price', 'Discount %',
    'Final Price', 'Total Stock (All Variants)', 'Flash Sale Ends', 'Description', 'Images', 'Created At',
  ];

  const overviewRows = products.map((p) => {
    const hasDiscount = Boolean(p.discountPercent && p.discountPercent > 0);
    const finalPrice = hasDiscount ? p.price * (1 - (p.discountPercent! / 100)) : p.price;
    const variantTotalStock = p.variants && p.variants.length > 0
      ? p.variants.reduce((s, v) => s + v.stockQuantity, 0)
      : p.stockQuantity;
    const images = parseImages(p.images).join(' | ');
    const createdAt = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US') : '—';
    const saleEnds = p.saleEndsAt ? new Date(p.saleEndsAt as any).toLocaleString('en-US') : '—';

    return [
      p.id,
      p.title,
      getCategoryNames(p),
      `${sym}${p.price.toFixed(2)}`,
      hasDiscount ? `${Math.round(p.discountPercent!)}%` : '—',
      hasDiscount ? `${sym}${finalPrice.toFixed(2)}` : `${sym}${p.price.toFixed(2)}`,
      variantTotalStock,
      saleEnds,
      p.description,
      images,
      createdAt,
    ];
  });

  const overviewData = [overviewHeaders, ...overviewRows];
  const ws1 = XLSX.utils.aoa_to_sheet(overviewData);

  // Set column widths
  ws1['!cols'] = [
    { wch: 36 }, // ID
    { wch: 32 }, // Title
    { wch: 28 }, // Category
    { wch: 14 }, // Original Price
    { wch: 12 }, // Discount %
    { wch: 14 }, // Final Price
    { wch: 22 }, // Stock
    { wch: 22 }, // Flash Sale
    { wch: 50 }, // Description
    { wch: 60 }, // Images
    { wch: 16 }, // Created At
  ];

  // ─── Sheet 2: Variant Stock Details ──────────────────────────────────────
  const variantHeaders = [
    'Product ID', 'Product Name', 'Color Name', 'Color Hex', 'Variant Stock', 'Variant Image',
  ];

  const variantRows: any[][] = [];
  for (const p of products) {
    if (p.variants && p.variants.length > 0) {
      for (const v of p.variants) {
        variantRows.push([
          p.id,
          p.title,
          v.colorName,
          v.colorHex,
          v.stockQuantity,
          v.image || '—',
        ]);
      }
    }
  }

  const variantData = [variantHeaders, ...variantRows];
  const ws2 = XLSX.utils.aoa_to_sheet(variantData);
  ws2['!cols'] = [
    { wch: 36 }, { wch: 32 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 60 },
  ];

  // ─── Summary Sheet ────────────────────────────────────────────────────────
  const totalProducts = products.length;
  const outOfStock = products.filter((p) => p.stockQuantity === 0).length;
  const withDiscount = products.filter((p) => p.discountPercent && p.discountPercent > 0).length;
  const totalStock = products.reduce((s, p) => s + p.stockQuantity, 0);
  const avgPrice = totalProducts > 0
    ? (products.reduce((s, p) => s + p.price, 0) / totalProducts).toFixed(2)
    : '0.00';

  const summaryData = [
    [`📦 Products Catalog Export — ${storeName}`],
    ['Generated At', new Date().toLocaleString('en-US')],
    [],
    ['Metric', 'Value'],
    ['Total Products', totalProducts],
    ['Out of Stock', outOfStock],
    ['In Stock', totalProducts - outOfStock],
    ['Products with Discount', withDiscount],
    ['Total Stock Units', totalStock],
    ['Average Price', `${sym}${avgPrice}`],
  ];

  const ws3 = XLSX.utils.aoa_to_sheet(summaryData);
  ws3['!cols'] = [{ wch: 30 }, { wch: 30 }];

  // ─── Build Workbook ───────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws3, '📊 Summary');
  XLSX.utils.book_append_sheet(wb, ws1, '🛍 Products');
  XLSX.utils.book_append_sheet(wb, ws2, '🎨 Variants & Stock');

  // ─── Trigger Download ─────────────────────────────────────────────────────
  const cleanStoreName = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'store';
  const fileName = `${cleanStoreName}-products-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

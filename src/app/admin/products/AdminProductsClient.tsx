'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSettings } from '@/store/useSettingsStore';
import { useDialog } from '@/store/useDialogStore';
import { translations } from '@/lib/translations';
import { formatPrice } from '@/lib/currencies';
import { getImageUrl, getAllImageUrls, cleanImageArrayInput } from '@/lib/images';
import { getProductUrl } from '@/lib/productUrl';
import { broadcastLocalStoreUpdate } from '@/hooks/useRealtimeSync';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch, faPlus, faEdit, faTrash,
  faPlus as faPlusCircle, faMinus, faSave, faTimes,
  faLink, faUpload, faImage, faTags, faEye, faLayerGroup,
  faExternalLinkAlt, faPalette, faBolt, faClock, faFire, faFileExcel,
} from '@fortawesome/free-solid-svg-icons';

interface ProductVariant {
  id?: string;
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
  saleEndsAt?: string | null;
  stockQuantity: number;
  images: string;
  createdAt?: string | Date;
  categories: { id: string; name: string; parent?: { id: string; name: string } | null }[];
  variants?: ProductVariant[];
}
interface Category { id: string; name: string; slug: string; parentId?: string | null; parent?: { id: string; name: string } | null; }

function toDatetimeLocal(isoString?: string | Date | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

function formatCreatedInfo(createdAt?: string | Date, language: string = 'en') {
  if (!createdAt) return { dateStr: '—', timeStr: '', byStr: language === 'ar' ? 'بواسطة الأدمن' : 'By Admin' };
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return { dateStr: '—', timeStr: '', byStr: language === 'ar' ? 'بواسطة الأدمن' : 'By Admin' };

  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  const dateStr = d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const byStr = language === 'ar' ? 'بواسطة الأدمن' : 'By Admin';

  return { dateStr, timeStr, byStr };
}

// --- Per-image entry ---
interface ImageEntry {
  id: string;            // local uuid for key
  tab: 'url' | 'file';
  value: string;         // url string or data:image/...
}

function makeEntry(value = '', tab: 'url' | 'file' = 'url'): ImageEntry {
  return { id: Math.random().toString(36).slice(2), tab, value };
}

// --- Image Entry Card ---
function ImageEntryCard({
  entry,
  index,
  label,
  t,
  language,
  onChangeTab,
  onChangeValue,
  onFileChange,
  onRemove,
  showRemove,
}: {
  entry: ImageEntry;
  index: number;
  label: string;
  t: any;
  language: string;
  onChangeTab: (tab: 'url' | 'file') => void;
  onChangeValue: (value: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  showRemove: boolean;
}) {
  return (
    <div className="border theme-border rounded-2xl p-3 space-y-2.5 bg-[var(--bg-primary)] shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition">
      {/* Card Header: label + remove */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[9px] font-mono font-extrabold">
            {index + 1}
          </span>
          {index === 0 ? (language === 'ar' ? 'الصورة الرئيسية' : 'Main Cover Image') : `${label} ${index + 1}`}
        </span>
        {showRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition px-2 py-0.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60"
          >
            <FontAwesomeIcon icon={faTimes} className="me-1" />
            {t.removeImage}
          </button>
        )}
      </div>

      {/* Tab Toggle */}
      <div className="flex bg-[var(--bg-surface)] p-1 rounded-xl border theme-border gap-1">
        <button
          type="button"
          onClick={() => onChangeTab('url')}
          className={`flex-1 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition ${
            entry.tab === 'url' ? 'bg-indigo-600 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <FontAwesomeIcon icon={faLink} className="text-[10px]" />
          <span>{t.imageTabUrl}</span>
        </button>
        <button
          type="button"
          onClick={() => onChangeTab('file')}
          className={`flex-1 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition ${
            entry.tab === 'file' ? 'bg-indigo-600 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <FontAwesomeIcon icon={faUpload} className="text-[10px]" />
          <span>{t.imageTabFile}</span>
        </button>
      </div>

      {/* URL Input or File Drop */}
      {entry.tab === 'url' ? (
        <input
          type="url"
          value={entry.value}
          onChange={(e) => onChangeValue(e.target.value)}
          placeholder="https://images.unsplash.com/..."
          className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-[11px] rounded-xl px-3 py-2 border theme-border focus:outline-none focus:border-indigo-500 placeholder-[var(--text-muted)] transition"
        />
      ) : (
        <div className="relative border-2 border-dashed theme-border rounded-xl py-3 text-center bg-[var(--bg-surface)] hover:border-indigo-400 transition cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="flex flex-col items-center gap-0.5">
            <FontAwesomeIcon icon={faUpload} className="text-indigo-500 text-sm" />
            <p className="text-[11px] font-bold text-[var(--text-primary)]">{t.uploadPlaceholder}</p>
            <p className="text-[9px] text-[var(--text-muted)]">{t.uploadFormatNote}</p>
          </div>
        </div>
      )}

      {/* Preview thumbnail */}
      {entry.value && (
        <div className="flex items-center gap-2 p-1.5 bg-[var(--bg-surface)] border theme-border rounded-xl">
          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-950 flex-shrink-0 border theme-border">
            <Image src={getImageUrl(entry.value)} alt="preview" fill className="object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-[var(--text-primary)] truncate">
              {entry.value.startsWith('data:') ? (language === 'ar' ? 'ملف مرفوع' : 'Uploaded file') : entry.value}
            </p>
            <span className="text-[9px] text-emerald-500 font-semibold">{language === 'ar' ? 'جاهز' : 'Ready'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Component ---
export default function AdminProductsClient() {
  const { language, currency, serverSettings } = useSettings();
  const t = translations[language].adminProducts;
  const isRTL = language === 'ar';
  const dialog = useDialog();

  const searchParams = useSearchParams();
  const editId = searchParams.get('edit') || searchParams.get('id');
  const openedEditIdRef = useRef<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [massDeleting, setMassDeleting] = useState(false);

  // Multi-image state
  const [imageEntries, setImageEntries] = useState<ImageEntry[]>([makeEntry()]);

  // Color variants state
  const [colorVariants, setColorVariants] = useState<ProductVariant[]>([]);

  function makeVariant(): ProductVariant {
    return { colorName: '', colorHex: '#6366f1', stockQuantity: 0, image: '' };
  }

  // Auto-compute total stock from variants when they exist
  const variantsTotalStock = colorVariants.length > 0
    ? colorVariants.reduce((sum, v) => sum + (parseInt(String(v.stockQuantity), 10) || 0), 0)
    : null;

  // Form fields state including discountedPrice and saleEndsAt
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    discountPercent: '0',
    discountedPrice: '',
    saleEndsAt: '',
    stockQuantity: '',
  });
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const fetchProducts = useCallback(async () => {
    const res = await fetch(`/api/products?search=${search}`);
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : data.products || []);
  }, [search]);

  const fetchCategories = async () => {
    const res = await fetch('/api/categories');
    const data = await res.json();
    setCategories(Array.isArray(data) ? data : []);
  };

  useEffect(() => { fetchProducts(); fetchCategories(); }, []);
  useEffect(() => {
    const timeout = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timeout);
  }, [search, fetchProducts]);

  const openModal = useCallback((product: Product | null = null) => {
    setEditingProduct(product);
    if (product) {
      const urls = getAllImageUrls(product.images);
      setImageEntries(
        urls.length > 0
          ? urls.map((u) => makeEntry(u, u.startsWith('data:') ? 'file' : 'url'))
          : [makeEntry()]
      );

      // Load existing variants
      setColorVariants(product.variants && product.variants.length > 0
        ? product.variants.map((v) => ({ colorName: v.colorName, colorHex: v.colorHex, stockQuantity: v.stockQuantity, image: v.image || '' }))
        : []
      );

      const origPrice = product.price;
      const discPercent = product.discountPercent ?? 0;
      const afterPrice = discPercent > 0 ? (origPrice * (1 - discPercent / 100)).toFixed(2) : origPrice.toFixed(2);

      setForm({
        title: product.title,
        description: product.description,
        price: origPrice.toString(),
        discountPercent: discPercent.toString(),
        discountedPrice: afterPrice,
        saleEndsAt: toDatetimeLocal(product.saleEndsAt),
        stockQuantity: product.stockQuantity.toString(),
      });
      setSelectedCategoryIds(product.categories?.map((c) => c.id) || []);
    } else {
      setImageEntries([makeEntry()]);
      setColorVariants([]);
      setForm({
        title: '',
        description: '',
        price: '',
        discountPercent: '0',
        discountedPrice: '',
        saleEndsAt: '',
        stockQuantity: '',
      });
      setSelectedCategoryIds([]);
    }
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    if (typeof window !== 'undefined' && (searchParams.get('edit') || searchParams.get('id'))) {
      const url = new URL(window.location.href);
      url.searchParams.delete('edit');
      url.searchParams.delete('id');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    }
  }, [searchParams]);

  // Automatically open product edit modal if edit/id query param is present
  useEffect(() => {
    if (!editId || openedEditIdRef.current === editId) return;

    // Check if the product is already in the loaded products list
    const existing = products.find((p) => p.id === editId);
    if (existing) {
      openedEditIdRef.current = editId;
      openModal(existing);
      return;
    }

    // Otherwise fetch the product directly by ID
    let isCancelled = false;
    fetch(`/api/products/${editId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Product not found');
        return res.json();
      })
      .then((prod) => {
        if (!isCancelled && prod && prod.id) {
          openedEditIdRef.current = editId;
          openModal(prod);
        }
      })
      .catch((err) => {
        console.error('Failed to load product for editing from URL param:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [editId, products, openModal]);

  // Bi-directional Price & Discount Calculators
  const handlePriceChange = (val: string) => {
    const p = parseFloat(val);
    const d = parseFloat(form.discountPercent);

    let newAfter = form.discountedPrice;
    if (!isNaN(p) && p > 0) {
      if (!isNaN(d) && d > 0) {
        newAfter = (p * (1 - d / 100)).toFixed(2);
      } else {
        newAfter = p.toFixed(2);
      }
    } else if (!val) {
      newAfter = '';
    }

    setForm((prev) => ({
      ...prev,
      price: val,
      discountedPrice: newAfter,
    }));
  };

  const handleDiscountPercentChange = (val: string) => {
    const d = Math.min(99, Math.max(0, parseFloat(val) || 0));
    const p = parseFloat(form.price);

    let newAfter = form.discountedPrice;
    if (!isNaN(p) && p > 0) {
      newAfter = (p * (1 - d / 100)).toFixed(2);
    }

    setForm((prev) => ({
      ...prev,
      discountPercent: val,
      discountedPrice: newAfter,
    }));
  };

  const handleDiscountedPriceChange = (val: string) => {
    const dp = parseFloat(val);
    const p = parseFloat(form.price);

    let newDiscount = form.discountPercent;
    if (!isNaN(p) && p > 0 && !isNaN(dp)) {
      if (dp >= p) {
        newDiscount = '0';
      } else {
        const calcPercent = Math.round(((p - dp) / p) * 100);
        newDiscount = Math.max(0, Math.min(99, calcPercent)).toString();
      }
    }

    setForm((prev) => ({
      ...prev,
      discountedPrice: val,
      discountPercent: newDiscount,
    }));
  };

  // Image entry helpers
  const updateEntry = (id: string, patch: Partial<ImageEntry>) =>
    setImageEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const handleFileChange = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      await dialog.alert({
        title: isRTL ? 'حجم الصورة كبير' : 'Image Too Large',
        message: isRTL ? 'حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)' : 'File size too large (max 5MB)',
        variant: 'warning',
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        updateEntry(id, { value: data.url, tab: 'file' });
      } else {
        // Fallback to base64
        const reader = new FileReader();
        reader.onloadend = () => updateEntry(id, { value: reader.result as string, tab: 'file' });
        reader.readAsDataURL(file);
      }
    } catch (err) {
      const reader = new FileReader();
      reader.onloadend = () => updateEntry(id, { value: reader.result as string, tab: 'file' });
      reader.readAsDataURL(file);
    }
  };

  const addImageEntry = () => setImageEntries((prev) => [...prev, makeEntry()]);
  const removeImageEntry = (id: string) =>
    setImageEntries((prev) => prev.filter((e) => e.id !== id));

  const handleSave = async () => {
    if (!form.title.trim()) {
      await dialog.alert({
        title: isRTL ? 'بيانات ناقصة' : 'Missing Information',
        message: isRTL ? 'يرجى إدخال اسم المنتج.' : 'Please enter a product title.',
        variant: 'warning',
      });
      return;
    }

    const priceNum = parseFloat(form.price);
    if (isNaN(priceNum) || priceNum < 0) {
      await dialog.alert({
        title: isRTL ? 'بيانات ناقصة' : 'Missing Information',
        message: isRTL ? 'يرجى إدخال سعر صالح للمنتج.' : 'Please enter a valid product price.',
        variant: 'warning',
      });
      return;
    }

    setSaving(true);
    try {
      const validUrls = imageEntries
        .map((e) => e.value.trim())
        .filter((v) => v.startsWith('http') || v.startsWith('/') || v.startsWith('data:image/'));

      const validVariantsPayload = colorVariants
        .filter((v) => v.colorName.trim())
        .map((v) => ({
          colorName: v.colorName.trim(),
          colorHex: v.colorHex || '#6366f1',
          stockQuantity: parseInt(String(v.stockQuantity), 10) || 0,
          image: v.image?.trim() || null,
        }));

      const computedStock = validVariantsPayload.length > 0
        ? validVariantsPayload.reduce((s, v) => s + v.stockQuantity, 0)
        : parseInt(form.stockQuantity, 10) || 0;

      const body = {
        title: form.title.trim(),
        description: form.description.trim() || form.title.trim(),
        price: priceNum,
        discountPercent: parseFloat(form.discountPercent) || 0,
        saleEndsAt: form.saleEndsAt ? new Date(form.saleEndsAt).toISOString() : null,
        stockQuantity: computedStock,
        categoryIds: selectedCategoryIds,
        images: cleanImageArrayInput(validUrls),
        variants: validVariantsPayload,
      };

      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isRTL ? 'فشل حفظ المنتج' : 'Failed to save product'));
      }

      closeModal();
      fetchProducts();
      broadcastLocalStoreUpdate('products');
    } catch (err: any) {
      await dialog.alert({
        title: isRTL ? 'خطأ في الحفظ' : 'Save Error',
        message: err.message || (isRTL ? 'حدث خطأ أثناء حفظ المنتج' : 'An error occurred while saving the product'),
        variant: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await dialog.confirm({
      title: isRTL ? 'تأكيد حذف المنتج' : 'Confirm Delete Product',
      message: t.deleteConfirm || (isRTL ? 'هل أنت متأكد من رغبتك في حذف هذا المنتج؟ لا يمكن التراجع عن هذه العملية.' : 'Are you sure you want to delete this product? This action cannot be undone.'),
      confirmText: isRTL ? 'حذف المنتج' : 'Delete Product',
      variant: 'danger',
    });
    if (!ok) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    fetchProducts();
    broadcastLocalStoreUpdate('products');
  };

  const handleMassDelete = async () => {
    if (selectedIds.size === 0) return;
    const ok = await dialog.confirm({
      title: isRTL ? 'تأكيد الحذف الجماعي' : 'Confirm Bulk Delete',
      message: t.massDeleteConfirm || (isRTL ? `سيتم حذف ${selectedIds.size} منتجات بشكل نهائي. هل أنت متأكد؟` : `${selectedIds.size} products will be permanently deleted. Are you sure?`),
      confirmText: isRTL ? `حذف ${selectedIds.size} منتجات` : `Delete ${selectedIds.size} Products`,
      variant: 'danger',
    });
    if (!ok) return;
    setMassDeleting(true);
    await fetch('/api/products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    setSelectedIds(new Set());
    fetchProducts();
    broadcastLocalStoreUpdate('products');
    setMassDeleting(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length && products.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStockAdjust = async (id: string, delta: number) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const newStock = Math.max(0, product.stockQuantity + delta);
    await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stockQuantity: newStock }),
    });
    fetchProducts();
    broadcastLocalStoreUpdate('products');
  };

  // Valid images list for visual gallery preview in sidebar
  const validImages = imageEntries
    .map((e) => e.value.trim())
    .filter((v) => v.length > 0);

  const allSelected = products.length > 0 && selectedIds.size === products.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < products.length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.search}
              className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs rounded-xl ps-9 pe-4 py-2.5 border theme-border focus:outline-none focus:border-indigo-500 placeholder-[var(--text-muted)]"
            />
            <FontAwesomeIcon icon={faSearch} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs" />
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in">
              <span className="text-[10px] font-bold text-[var(--text-muted)] whitespace-nowrap">
                {selectedIds.size} {t.selectedCount || 'selected'}
              </span>
              <button
                onClick={handleMassDelete}
                disabled={massDeleting}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-red-600/20 transition whitespace-nowrap"
              >
                <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                <span>{massDeleting ? (language === 'ar' ? 'جاري الحذف...' : 'Deleting...') : (t.massDelete || 'Delete Selected')}</span>
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-export-products-excel"
            onClick={async () => {
              try {
                const { exportProductsToExcel } = await import('@/lib/productExport');
                exportProductsToExcel(products, currency, serverSettings?.storeName || 'Store');
              } catch (err: any) {
                await dialog.alert({
                  title: isRTL ? 'خطأ في التصدير' : 'Export Error',
                  message: err.message || (isRTL ? 'فشل تصدير المنتجات' : 'Failed to export products'),
                  variant: 'warning',
                });
              }
            }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition"
          >
            <FontAwesomeIcon icon={faFileExcel} />
            <span>{isRTL ? 'تصدير Excel' : 'Export Excel'}</span>
          </button>
          <button
            onClick={() => openModal(null)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition"
          >
            <FontAwesomeIcon icon={faPlus} /><span>{t.addNew}</span>
          </button>
        </div>
      </div>

      {/* ── Mobile Card List (< 768px) ── */}
      <div className="md:hidden space-y-3">
        {products.length === 0 ? (
          <div className="glass-panel rounded-2xl border theme-border py-12 text-center text-xs text-[var(--text-muted)] font-semibold">{language === 'ar' ? 'لا توجد منتجات' : 'No products found'}</div>
        ) : (
          products.map((product) => {
            const cover = getImageUrl(product.images);
            const hasDiscount = Boolean(product.discountPercent && product.discountPercent > 0);
            const finalSellingPrice = hasDiscount
              ? product.price * (1 - product.discountPercent! / 100)
              : product.price;
            const isSelected = selectedIds.has(product.id);
            return (
              <div key={product.id} className={`glass-card rounded-2xl border theme-border p-4 space-y-3 transition ${isSelected ? 'border-indigo-400 ring-1 ring-indigo-400/30' : ''}`}>
                <div className="flex items-start gap-3">
                  {/* Checkbox + image */}
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(product.id)} className="mt-1 w-4 h-4 accent-indigo-600" />
                  {cover && (
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-900 border theme-border">
                      <Image src={cover} alt={product.title} fill className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[var(--text-primary)] truncate">{product.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {hasDiscount ? (
                        <>
                          <span className="text-[var(--text-muted)] line-through text-xs">{formatPrice(product.price, currency, language)}</span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">{formatPrice(finalSellingPrice, currency, language)}</span>
                          <span className="bg-rose-50 dark:bg-rose-950/80 text-rose-600 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border border-rose-200">-{Math.round(product.discountPercent!)}%</span>
                        </>
                      ) : (
                        <span className="font-bold text-sm text-[var(--text-primary)]">{formatPrice(product.price, currency, language)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stock & Quick Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t theme-border">
                  <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] p-1 rounded-xl border theme-border">
                    <button
                      type="button"
                      onClick={() => handleStockAdjust(product.id, -1)}
                      className="w-7 h-7 bg-[var(--bg-primary)] border theme-border rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-red-500 transition"
                      aria-label="Decrease Stock"
                    >
                      <FontAwesomeIcon icon={faMinus} className="text-[10px]" />
                    </button>
                    <span className={`font-bold w-7 text-center text-xs ${product.stockQuantity < 10 ? 'text-amber-600 dark:text-amber-400 font-extrabold' : 'text-[var(--text-primary)]'}`}>
                      {product.stockQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStockAdjust(product.id, 1)}
                      className="w-7 h-7 bg-[var(--bg-primary)] border theme-border rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-emerald-500 transition"
                      aria-label="Increase Stock"
                    >
                      <FontAwesomeIcon icon={faPlusCircle} className="text-[10px]" />
                    </button>
                    <span className="text-[10px] text-[var(--text-muted)] pe-1.5">{t.units}</span>
                  </div>

                  <div className="flex items-center gap-1.5 ms-auto">
                    <button
                      onClick={() => openModal(product)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/50 text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-100 transition shadow-xs"
                    >
                      <FontAwesomeIcon icon={faEdit} className="text-[11px]" />
                      <span>{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 rounded-xl bg-red-50 dark:bg-red-950/80 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-700/50 hover:bg-red-100 transition shadow-xs"
                      aria-label="Delete Product"
                    >
                      <FontAwesomeIcon icon={faTrash} className="text-xs" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Mobile Floating Action Button (+ New Product) ── */}
      <button
        onClick={() => openModal()}
        className="md:hidden fixed bottom-20 end-4 z-20 w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/40 flex items-center justify-center text-base transition-transform active:scale-95 cursor-pointer"
        aria-label={t.addNew}
        title={t.addNew}
      >
        <FontAwesomeIcon icon={faPlus} />
      </button>

      {/* ── Desktop Table (>= 768px) ── */}
      <div className="hidden md:block glass-panel rounded-2xl border theme-border overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b theme-border bg-[var(--bg-surface)]">
              {/* Select All Checkbox */}
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-2 border-[var(--border-color)] accent-indigo-600 cursor-pointer"
                />
              </th>
              <th className="text-start px-5 py-3 text-[var(--text-secondary)] font-bold uppercase tracking-wider whitespace-nowrap">{t.product}</th>
              <th className="text-start px-5 py-3 text-[var(--text-secondary)] font-bold uppercase tracking-wider whitespace-nowrap">{language === 'ar' ? 'تاريخ الإنشاء' : 'Created'}</th>
              <th className="text-start px-5 py-3 text-[var(--text-secondary)] font-bold uppercase tracking-wider whitespace-nowrap">{t.category}</th>
              <th className="text-start px-5 py-3 text-[var(--text-secondary)] font-bold uppercase tracking-wider whitespace-nowrap">{t.originalPrice}</th>
              <th className="text-start px-5 py-3 text-[var(--text-secondary)] font-bold uppercase tracking-wider whitespace-nowrap">{t.discountLabel || 'Discount %'}</th>
              <th className="text-start px-5 py-3 text-[var(--text-secondary)] font-bold uppercase tracking-wider whitespace-nowrap">{t.priceAfter || 'Price After Discount'}</th>
              <th className="text-start px-5 py-3 text-[var(--text-secondary)] font-bold uppercase tracking-wider whitespace-nowrap">{t.stock}</th>
              <th className="text-start px-5 py-3 text-[var(--text-secondary)] font-bold uppercase tracking-wider whitespace-nowrap">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y theme-border">
            {products.map((product) => {
              const cover = getImageUrl(product.images);
              const allImgs = getAllImageUrls(product.images);
              const hasDiscount = Boolean(product.discountPercent && product.discountPercent > 0);
              const finalSellingPrice = hasDiscount ? product.price * (1 - (product.discountPercent! / 100)) : product.price;
              const isSelected = selectedIds.has(product.id);

              return (
                <tr
                  key={product.id}
                  className={`transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60'
                      : 'hover:bg-[var(--bg-card)]'
                  }`}
                >
                  {/* Selection Checkbox */}
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(product.id)}
                      className="w-4 h-4 rounded border-2 border-[var(--border-color)] accent-indigo-600 cursor-pointer"
                    />
                  </td>

                  {/* Product Name + Thumbnail (Clickable link to product page) */}
                  <td className="px-5 py-4">
                    <Link
                      href={getProductUrl(product)}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-3 group/link hover:opacity-90 transition"
                      title={language === 'ar' ? 'فتح صفحة المنتج' : 'Open product page'}
                    >
                      {cover && (
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-950 flex-shrink-0 border theme-border group-hover/link:border-indigo-500 transition">
                          <Image src={cover} alt={product.title} fill className="object-cover group-hover/link:scale-105 transition" />
                          {allImgs.length > 1 && (
                            <span className="absolute bottom-0 end-0 bg-black/75 text-white text-[8px] font-bold px-1 rounded-ss-md">
                              +{allImgs.length - 1}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-[var(--text-primary)] group-hover/link:text-indigo-600 dark:group-hover/link:text-indigo-400 max-w-[160px] truncate transition flex items-center gap-1.5">
                          {product.title}
                          <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[9px] text-[var(--text-muted)] opacity-0 group-hover/link:opacity-100 transition" />
                        </span>
                        {product.saleEndsAt && new Date(product.saleEndsAt) > new Date() && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-700/50 mt-1 max-w-fit">
                            <FontAwesomeIcon icon={faFire} className="text-[8px]" />
                            <span>⚡ {language === 'ar' ? 'فلاش سيل' : 'Flash Sale'}</span>
                          </span>
                        )}
                      </div>
                    </Link>
                  </td>

                  {/* Created: Date, Time, By */}
                  <td className="px-5 py-4">
                    {(() => {
                      const { dateStr, timeStr, byStr } = formatCreatedInfo(product.createdAt, language);
                      return (
                        <div className="flex flex-col text-xs">
                          <span className="font-bold text-[var(--text-primary)] whitespace-nowrap">
                            {dateStr}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-medium whitespace-nowrap">
                            <span>{timeStr}</span>
                            <span>•</span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{byStr}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </td>

                  {/* Category: show grouped categories by parent */}
                  <td className="px-5 py-4">
                    {product.categories && product.categories.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {(() => {
                          const groups: { parentName: string | null; children: { id: string; name: string }[] }[] = [];
                          for (const cat of product.categories) {
                            const pName = cat.parent?.name || null;
                            let group = groups.find((g) => g.parentName === pName);
                            if (!group) {
                              group = { parentName: pName, children: [] };
                              groups.push(group);
                            }
                            group.children.push({ id: cat.id, name: cat.name });
                          }
                          return groups.map((group, idx) => (
                            <div key={idx} className="flex flex-col gap-0.5">
                              {group.parentName ? (
                                <>
                                  <span className="font-bold text-[var(--text-secondary)] truncate max-w-[130px]">
                                    {group.parentName}
                                  </span>
                                  {group.children.map((child) => (
                                    <span key={child.id} className="font-bold text-[var(--text-secondary)] truncate max-w-[130px] ps-3">
                                      • {child.name}
                                    </span>
                                  ))}
                                </>
                              ) : (
                                group.children.map((child) => (
                                  <span key={child.id} className="font-bold text-[var(--text-secondary)] truncate max-w-[130px]">
                                    {child.name}
                                  </span>
                                ))
                              )}
                            </div>
                          ));
                        })()}
                      </div>
                    ) : (
                      <span className="text-[var(--text-muted)] italic">{t.unassigned}</span>
                    )}
                  </td>

                  {/* Original Price */}
                  <td className="px-5 py-4">
                    <span className={`font-bold ${
                      hasDiscount ? 'text-[var(--text-muted)] line-through font-mono text-xs' : 'text-[var(--text-primary)]'
                    }`}>
                      {formatPrice(product.price, currency, language)}
                    </span>
                  </td>

                  {/* Discount % */}
                  <td className="px-5 py-4">
                    {hasDiscount ? (
                      <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-700/50 px-2.5 py-1 rounded-full font-extrabold text-[11px] whitespace-nowrap">
                        -{Math.round(product.discountPercent!)}%
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)] text-[10px]">—</span>
                    )}
                  </td>

                  {/* Price After Discount */}
                  <td className="px-5 py-4">
                    <span className={`font-extrabold ${
                      hasDiscount ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-muted)] text-[10px]'
                    }`}>
                      {hasDiscount ? formatPrice(finalSellingPrice, currency, language) : '—'}
                    </span>
                  </td>

                  {/* Stock */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleStockAdjust(product.id, -1)} className="w-6 h-6 bg-[var(--bg-surface)] border theme-border rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-red-500 transition">
                        <FontAwesomeIcon icon={faMinus} />
                      </button>
                      <span className={`font-bold w-8 text-center ${product.stockQuantity < 10 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--text-primary)]'}`}>{product.stockQuantity}</span>
                      <button onClick={() => handleStockAdjust(product.id, 1)} className="w-6 h-6 bg-[var(--bg-surface)] border theme-border rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-emerald-500 transition">
                        <FontAwesomeIcon icon={faPlusCircle} />
                      </button>
                      <span className="text-[var(--text-muted)]">{t.units}</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openModal(product)} className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-700/50 transition">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="p-2 rounded-lg bg-red-50 dark:bg-red-950/80 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 border border-red-200 dark:border-red-700/50 transition">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Redesigned Wider Modal with Sidebar Images Section */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-md">
          <div className="bg-[var(--bg-surface)] border theme-border rounded-3xl p-6 sm:p-8 w-full max-w-5xl shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b theme-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <FontAwesomeIcon icon={editingProduct ? faEdit : faPlus} className="text-base" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[var(--text-primary)]">
                    {editingProduct ? t.editTitle : t.addTitle}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] font-medium">
                    {editingProduct ? (language === 'ar' ? 'تحديث معلومات وصور ورسوم المنتج' : 'Update product details, pricing, and images') : (language === 'ar' ? 'أضف منتجاً جديداً إلى الكتالوج الخص بك' : 'Add a brand new product to your store catalog')}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-9 h-9 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition flex items-center justify-center border theme-border"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Product Information & Pricing (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                    {t.titleLabel}
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder={t.titlePlaceholder}
                    className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] text-xs rounded-xl px-4 py-2.5 border theme-border focus:outline-none focus:border-indigo-500 placeholder-[var(--text-muted)] transition"
                  />
                </div>

                {/* Stock & Category */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-[var(--text-primary)]">
                        {t.stockLabel}
                        {t.stockLabelHint && <span className="text-[var(--text-muted)] font-normal ms-1">{t.stockLabelHint}</span>}
                      </label>
                      {variantsTotalStock !== null && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700/40">
                          {variantsTotalStock} {t.units}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      value={variantsTotalStock !== null ? variantsTotalStock : form.stockQuantity}
                      onChange={(e) => {
                        if (variantsTotalStock === null) setForm((prev) => ({ ...prev, stockQuantity: e.target.value }));
                      }}
                      readOnly={variantsTotalStock !== null}
                      placeholder="50"
                      className={`w-full text-[var(--text-primary)] text-xs rounded-xl px-4 py-2.5 border theme-border focus:outline-none focus:border-indigo-500 placeholder-[var(--text-muted)] transition ${variantsTotalStock !== null ? 'bg-[var(--bg-card)] opacity-70 cursor-not-allowed' : 'bg-[var(--bg-primary)]'}`}
                    />
                  </div>

                  {/* Multi-Category Chip Picker */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-[var(--text-primary)]">{t.categoryLabel}</label>
                      {selectedCategoryIds.length > 0 && (
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                          {selectedCategoryIds.length} {language === 'ar' ? 'محدد' : 'selected'}
                        </span>
                      )}
                    </div>

                    {/* Selected Category Pills */}
                    {selectedCategoryIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {selectedCategoryIds.map((id) => {
                          const cat = categories.find((c) => c.id === id);
                          if (!cat) return null;
                          return (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1 bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full"
                            >
                              {cat.parent ? `${cat.parent.name} › ${cat.name}` : cat.name}
                              <button
                                type="button"
                                onClick={() => setSelectedCategoryIds((prev) => prev.filter((x) => x !== id))}
                                className="text-white/70 hover:text-white transition ms-0.5 leading-none"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Category Chip List */}
                    <div className="max-h-36 overflow-y-auto space-y-0.5 border theme-border rounded-xl p-2 bg-[var(--bg-primary)]">
                      {categories.length === 0 && (
                        <p className="text-[11px] text-[var(--text-muted)] px-2 py-1">{t.unassigned}</p>
                      )}
                      {/* Group: top-level categories */}
                      {categories
                        .filter((c) => !c.parentId)
                        .map((parent) => {
                          const children = categories.filter((c) => c.parentId === parent.id);
                          const hasSelectedChild = children.some((c) => selectedCategoryIds.includes(c.id));
                          const isParentSelected = selectedCategoryIds.includes(parent.id);
                          return (
                            <div key={parent.id}>
                              {/* Parent chip */}
                              <button
                                type="button"
                                disabled={hasSelectedChild}
                                onClick={() =>
                                  setSelectedCategoryIds((prev) =>
                                    prev.includes(parent.id)
                                      ? prev.filter((x) => x !== parent.id)
                                      : [...prev, parent.id]
                                  )
                                }
                                className={`w-full text-start px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-between ${
                                  hasSelectedChild
                                    ? 'opacity-60 cursor-not-allowed text-[var(--text-muted)] bg-[var(--bg-surface)]/50'
                                    : isParentSelected
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                                }`}
                              >
                                <span>{parent.name}</span>
                                {hasSelectedChild && (
                                  <span className="text-[9px] font-semibold text-indigo-500 dark:text-indigo-400 italic">
                                    {language === 'ar' ? '(متضمن عبر الفئة الفرعية)' : '(Included via child)'}
                                  </span>
                                )}
                              </button>
                              {/* Children chips */}
                              {children.map((child) => {
                                const isChildSelected = selectedCategoryIds.includes(child.id);
                                return (
                                  <button
                                    key={child.id}
                                    type="button"
                                    onClick={() =>
                                      setSelectedCategoryIds((prev) => {
                                        const isCurrentlySelected = prev.includes(child.id);
                                        let next = isCurrentlySelected
                                          ? prev.filter((x) => x !== child.id)
                                          : [...prev, child.id];
                                        // Auto-deselect parent when a child is picked
                                        if (!isCurrentlySelected) {
                                          next = next.filter((x) => x !== parent.id);
                                        }
                                        return next;
                                      })
                                    }
                                    className={`w-full text-start ps-5 pe-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                                      isChildSelected
                                        ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
                                    }`}
                                  >
                                    • {child.name}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Pricing & Discount Card (3-Column Fields) */}
                <div className="p-4 rounded-2xl border theme-border bg-[var(--bg-card)]/50 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FontAwesomeIcon icon={faTags} className="text-indigo-500 text-xs" />
                    <span className="text-xs font-extrabold text-[var(--text-primary)] uppercase tracking-wider">
                      {language === 'ar' ? 'إعدادات السعر والخصم' : 'Pricing & Discount'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* 1. Original Price */}
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                        {t.priceLabel}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={form.price}
                          onChange={(e) => handlePriceChange(e.target.value)}
                          placeholder="100.00"
                          className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] text-xs rounded-xl px-3 py-2 border theme-border focus:outline-none focus:border-indigo-500 placeholder-[var(--text-muted)] font-bold transition"
                        />
                        <span className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-[var(--text-muted)]">
                          {currency}
                        </span>
                      </div>
                    </div>

                    {/* 2. Discount Percent */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[11px] font-bold text-[var(--text-secondary)]">
                          {t.discountLabel}
                        </label>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="99"
                          step="1"
                          value={form.discountPercent}
                          onChange={(e) => handleDiscountPercentChange(e.target.value)}
                          placeholder="0"
                          className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] text-xs rounded-xl px-3 py-2 border theme-border focus:outline-none focus:border-indigo-500 placeholder-[var(--text-muted)] font-bold transition"
                        />
                        <span className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-rose-500">
                          %
                        </span>
                      </div>
                    </div>

                    {/* 3. Price After Discount */}
                    <div>
                      <label className="block text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                        {t.priceAfterLabel}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={form.discountedPrice}
                          onChange={(e) => handleDiscountedPriceChange(e.target.value)}
                          placeholder="80.00"
                          className="w-full bg-[var(--bg-primary)] text-indigo-600 dark:text-indigo-300 font-extrabold text-xs rounded-xl px-3 py-2 border border-indigo-300 dark:border-indigo-700/60 focus:outline-none focus:border-indigo-500 placeholder-[var(--text-muted)] transition"
                        />
                        <span className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-indigo-500">
                          {currency}
                        </span>
                      </div>
                    </div>
                  </div>

                  {parseFloat(form.discountPercent) > 0 && parseFloat(form.price) > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-700/50">
                        -{Math.round(parseFloat(form.discountPercent))}% {language === 'ar' ? 'خصم فعال' : 'Active Discount'}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium">
                        {language === 'ar' ? `سيتم بيع المنتج بـ ${formatPrice(parseFloat(form.discountedPrice) || 0, currency, language)} بدلاً من ${formatPrice(parseFloat(form.price) || 0, currency, language)}` : `Product will sell for ${formatPrice(parseFloat(form.discountedPrice) || 0, currency, language)} instead of ${formatPrice(parseFloat(form.price) || 0, currency, language)}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* ── Flash Sale / Limited Time Offer (Countdown Timer) ── */}
                <div className="p-4 rounded-2xl border theme-border bg-gradient-to-r from-amber-500/5 via-indigo-500/5 to-rose-500/5 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faFire} className="text-amber-500 text-xs" />
                      <span className="text-xs font-extrabold text-[var(--text-primary)] uppercase tracking-wider">
                        {language === 'ar' ? 'عروض الفلاش والعد التنازلي' : 'Flash Sale & Countdown Timer'}
                      </span>
                    </div>
                    {form.saleEndsAt && new Date(form.saleEndsAt) > new Date() && (
                      <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-700/50 flex items-center gap-1 animate-pulse">
                        <FontAwesomeIcon icon={faBolt} className="text-[9px]" />
                        <span>{language === 'ar' ? 'فلاش سيل مفعل' : 'Flash Sale Active'}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                    {language === 'ar'
                      ? 'حدد موعد انتهاء العرض لتشغيل مؤقت العد التنازلي التفاعلي على صفحة المنتج وبطاقته في المتجر.'
                      : 'Set an expiration date/time to activate a dynamic live countdown timer on the product card and product page.'}
                  </p>

                  {/* Quick Presets */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const target = new Date(Date.now() + 24 * 60 * 60 * 1000);
                        setForm((prev) => ({ ...prev, saleEndsAt: toDatetimeLocal(target) }));
                      }}
                      className="px-2.5 py-1 rounded-xl text-[10px] font-bold border border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition cursor-pointer"
                    >
                      ⚡ +24 {language === 'ar' ? 'ساعة' : 'Hours'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const target = new Date(Date.now() + 72 * 60 * 60 * 1000);
                        setForm((prev) => ({ ...prev, saleEndsAt: toDatetimeLocal(target) }));
                      }}
                      className="px-2.5 py-1 rounded-xl text-[10px] font-bold border border-indigo-300 dark:border-indigo-700/50 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition cursor-pointer"
                    >
                      ⚡ +3 {language === 'ar' ? 'أيام' : 'Days'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const target = new Date(Date.now() + 168 * 60 * 60 * 1000);
                        setForm((prev) => ({ ...prev, saleEndsAt: toDatetimeLocal(target) }));
                      }}
                      className="px-2.5 py-1 rounded-xl text-[10px] font-bold border border-purple-300 dark:border-purple-700/50 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition cursor-pointer"
                    >
                      ⚡ +7 {language === 'ar' ? 'أيام' : 'Days'}
                    </button>
                    {form.saleEndsAt && (
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, saleEndsAt: '' }))}
                        className="px-2.5 py-1 rounded-xl text-[10px] font-bold border border-rose-300 dark:border-rose-700/50 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 hover:bg-rose-100 transition cursor-pointer"
                      >
                        <FontAwesomeIcon icon={faTimes} className="me-1 text-[9px]" />
                        {language === 'ar' ? 'إلغاء المؤقت' : 'Clear Timer'}
                      </button>
                    )}
                  </div>

                  {/* Custom Datetime Input */}
                  <div className="pt-1">
                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                      {language === 'ar' ? 'تاريخ ووقت انتهاء العرض (مخصص):' : 'Custom Expiration Date & Time:'}
                    </label>
                    <input
                      type="datetime-local"
                      value={form.saleEndsAt}
                      onChange={(e) => setForm((prev) => ({ ...prev, saleEndsAt: e.target.value }))}
                      className="w-full sm:max-w-xs bg-[var(--bg-primary)] text-[var(--text-primary)] text-xs rounded-xl px-3 py-2 border theme-border focus:outline-none focus:border-indigo-500 font-mono transition"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">{t.descLabel}</label>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] text-xs rounded-xl p-3.5 border theme-border focus:outline-none focus:border-indigo-500 transition leading-relaxed"
                  />
                </div>

                {/* ── Color Variants Section ── */}
                <div className="p-4 rounded-2xl border theme-border bg-[var(--bg-card)]/50 space-y-3">
                  {/* Section Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faPalette} className="text-indigo-500 text-xs" />
                      <span className="text-xs font-extrabold text-[var(--text-primary)] uppercase tracking-wider">
                        {t.variantsTitle}
                      </span>
                    </div>
                    {colorVariants.length > 0 && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700/40">
                        {language === 'ar' ? `إجمالي: ${variantsTotalStock} وحدة` : `Total: ${variantsTotalStock} units`}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)]">{t.variantsSubtitle}</p>

                  {/* Variant Rows */}
                  {colorVariants.length === 0 ? (
                    <div className="py-4 text-center border-2 border-dashed theme-border rounded-xl bg-[var(--bg-primary)]">
                      <FontAwesomeIcon icon={faPalette} className="text-2xl text-[var(--text-muted)] mb-1" />
                      <p className="text-[11px] text-[var(--text-secondary)] font-medium">{t.noVariants}</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto pe-1">
                      {colorVariants.map((variant, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-start p-3 bg-[var(--bg-primary)] border theme-border rounded-xl">
                          {/* Color Swatch + Hex Picker */}
                          <div className="col-span-2 flex flex-col items-center gap-1">
                            <div
                              className="w-9 h-9 rounded-xl border-2 border-white dark:border-gray-700 shadow-md cursor-pointer overflow-hidden relative"
                              style={{ background: variant.colorHex }}
                            >
                              <input
                                type="color"
                                value={variant.colorHex}
                                onChange={(e) => {
                                  const updated = [...colorVariants];
                                  updated[idx] = { ...updated[idx], colorHex: e.target.value };
                                  setColorVariants(updated);
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                title={t.variantColorHex}
                              />
                            </div>
                            <span className="text-[8px] font-mono text-[var(--text-muted)]">{variant.colorHex}</span>
                          </div>

                          {/* Color Name */}
                          <div className="col-span-4">
                            <label className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-0.5 block">{t.variantColorName}</label>
                            <input
                              type="text"
                              value={variant.colorName}
                              onChange={(e) => {
                                const updated = [...colorVariants];
                                updated[idx] = { ...updated[idx], colorName: e.target.value };
                                setColorVariants(updated);
                              }}
                              placeholder={t.variantColorNamePlaceholder}
                              className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-[11px] rounded-lg px-2 py-1.5 border theme-border focus:outline-none focus:border-indigo-500 placeholder-[var(--text-muted)] transition"
                            />
                          </div>

                          {/* Quantity */}
                          <div className="col-span-3">
                            <label className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-0.5 block">{t.variantQty}</label>
                            <input
                              type="number"
                              min="0"
                              value={variant.stockQuantity}
                              onChange={(e) => {
                                const updated = [...colorVariants];
                                updated[idx] = { ...updated[idx], stockQuantity: parseInt(e.target.value, 10) || 0 };
                                setColorVariants(updated);
                              }}
                              placeholder="0"
                              className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-[11px] font-bold rounded-lg px-2 py-1.5 border theme-border focus:outline-none focus:border-indigo-500 placeholder-[var(--text-muted)] transition"
                            />
                          </div>

                          {/* Remove Button */}
                          <div className="col-span-3 flex flex-col justify-end items-end">
                            <button
                              type="button"
                              onClick={() => setColorVariants((prev) => prev.filter((_, i) => i !== idx))}
                              className="mt-4 text-[10px] font-bold text-rose-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60 transition"
                            >
                              <FontAwesomeIcon icon={faTimes} className="me-1" />{t.removeVariant}
                            </button>
                          </div>

                          {/* Optional variant image URL (full width) */}
                          <div className="col-span-12">
                            <input
                              type="url"
                              value={variant.image || ''}
                              onChange={(e) => {
                                const updated = [...colorVariants];
                                updated[idx] = { ...updated[idx], image: e.target.value };
                                setColorVariants(updated);
                              }}
                              placeholder={`${t.variantImage}: ${t.variantImagePlaceholder}`}
                              className="w-full bg-[var(--bg-surface)] text-[var(--text-muted)] text-[10px] rounded-lg px-2.5 py-1.5 border theme-border focus:outline-none focus:border-indigo-400 placeholder-[var(--text-muted)] transition"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Auto stock notice */}
                  {colorVariants.length > 0 && (
                    <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
                      ✦ {t.variantStockAuto}
                    </p>
                  )}

                  {/* Add Variant Button */}
                  <button
                    type="button"
                    onClick={() => setColorVariants((prev) => [...prev, makeVariant()])}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-indigo-300 dark:border-indigo-700/60 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    <span>{t.addVariant}</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Product Images Sidebar with Preview (5 cols) */}
              <div className="lg:col-span-5 space-y-5 border-t lg:border-t-0 lg:border-s theme-border pt-6 lg:pt-0 lg:ps-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faLayerGroup} className="text-indigo-500 text-xs" />
                    <h3 className="text-xs font-extrabold text-[var(--text-primary)] uppercase tracking-wider">
                      {t.imagesSidebarTitle}
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-primary)] px-2 py-0.5 rounded-full border theme-border">
                    {imageEntries.length} {language === 'ar' ? 'صور' : 'images'}
                  </span>
                </div>

                {/* Visual Gallery Preview Box */}
                <div className="border theme-border rounded-2xl p-3 bg-[var(--bg-card)]/40 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faEye} />
                      {t.galleryPreview}
                    </span>
                    <span>{validImages.length} {language === 'ar' ? 'معاينة جاهزة' : 'previews ready'}</span>
                  </div>

                  {validImages.length > 0 ? (
                    <div className="space-y-2">
                      {/* Main Cover Large Preview */}
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-950 border theme-border group shadow-sm">
                        <Image src={getImageUrl(validImages[0])} alt="Cover Preview" fill className="object-cover" />
                        <span className="absolute top-2 start-2 bg-black/75 text-white text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md">
                          {language === 'ar' ? 'الغلاف الرئيسي' : 'Main Cover'}
                        </span>
                      </div>

                      {/* Thumbnails grid for rest */}
                      {validImages.length > 1 && (
                        <div className="grid grid-cols-4 gap-2">
                          {validImages.slice(1).map((imgUrl, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-950 border theme-border">
                              <Image src={getImageUrl(imgUrl)} alt={`Preview ${idx + 2}`} fill className="object-cover" />
                              <span className="absolute bottom-0.5 end-0.5 bg-black/70 text-white text-[8px] font-mono px-1 rounded">
                                #{idx + 2}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-6 text-center border-2 border-dashed theme-border rounded-xl bg-[var(--bg-primary)]">
                      <FontAwesomeIcon icon={faImage} className="text-2xl text-[var(--text-muted)] mb-1" />
                      <p className="text-xs font-bold text-[var(--text-secondary)]">
                        {language === 'ar' ? 'لا توجد صور حتى الآن' : 'No images added yet'}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {language === 'ar' ? 'أضف رابط صورة أو ارفع ملفاً أدناه' : 'Add image URL or upload file below'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Image Entries List */}
                <div className="space-y-3 max-h-[380px] overflow-y-auto pe-1">
                  {imageEntries.map((entry, index) => (
                    <ImageEntryCard
                      key={entry.id}
                      entry={entry}
                      index={index}
                      label={t.imageN}
                      t={t}
                      language={language}
                      onChangeTab={(tab) => updateEntry(entry.id, { tab, value: '' })}
                      onChangeValue={(value) => updateEntry(entry.id, { value })}
                      onFileChange={(e) => handleFileChange(entry.id, e)}
                      onRemove={() => removeImageEntry(entry.id)}
                      showRemove={imageEntries.length > 1}
                    />
                  ))}
                </div>

                {/* Add Image Button */}
                <button
                  type="button"
                  onClick={addImageEntry}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed theme-border rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-indigo-600 hover:border-indigo-400 bg-[var(--bg-primary)] hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition shadow-sm"
                >
                  <FontAwesomeIcon icon={faImage} />
                  <span>{t.addImage}</span>
                </button>
              </div>

            </div>

            {/* Modal Footer Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t theme-border">
              <button
                onClick={closeModal}
                className="flex-1 py-3 bg-[var(--bg-card)] text-[var(--text-secondary)] border theme-border rounded-xl text-xs font-bold hover:bg-[var(--bg-primary)] transition"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition"
              >
                <FontAwesomeIcon icon={faSave} />
                <span>{saving ? t.saving : t.save}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

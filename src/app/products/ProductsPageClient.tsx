'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { formatPrice } from '@/lib/currencies';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faSliders,
  faRotateLeft,
  faTimes,
  faCheck,
  faStar,
  faTags,
  faLayerGroup,
  faBoxesStacked,
  faMoneyBillWave,
  faArrowDownWideShort,
  faArrowUpWideShort,
  faPercent,
  faFrown,
  faFilter,
  faBorderAll,
  faList,
  faPalette,
} from '@fortawesome/free-solid-svg-icons';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  children?: Category[];
  parent?: Category | null;
  _count?: { products: number };
}

interface ProductsPageClientProps {
  products: any[];
  categories: Category[];
  initialCategorySlug?: string;
  initialSearch?: string;
  initialSort?: string;
  initialMinPrice?: string;
  initialMaxPrice?: string;
  initialInStock?: boolean;
  initialOnSale?: boolean;
  initialMinRating?: string;
  initialColor?: string;
}

export default function ProductsPageClient({
  products,
  categories,
  initialCategorySlug = '',
  initialSearch = '',
  initialSort = 'newest',
  initialMinPrice = '',
  initialMaxPrice = '',
  initialInStock = false,
  initialOnSale = false,
  initialMinRating = '',
  initialColor = '',
}: ProductsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, currency } = useSettings();
  const t = translations[language].products;
  const isRTL = language === 'ar';

  // Mounted guard — prevents hydration mismatch caused by language/theme switching
  // after the Zustand store rehydrates from localStorage on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Core filter states
  const [search, setSearch] = useState(initialSearch);
  const [categorySlug, setCategorySlug] = useState(initialCategorySlug);
  const [sort, setSort] = useState(initialSort);
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [inStockOnly, setInStockOnly] = useState(initialInStock);
  const [onSaleOnly, setOnSaleOnly] = useState(initialOnSale);
  const [minRating, setMinRating] = useState(initialMinRating);
  const [selectedColor, setSelectedColor] = useState(initialColor);

  // Layout and mobile drawer state
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Products and categories state
  const [productsList, setProductsList] = useState(products);
  const [categoriesList, setCategoriesList] = useState(categories);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Extract unique available colors from catalog for color filter pills
  const availableColors = useMemo(() => {
    const colorMap = new Map<string, { name: string; hex: string; count: number }>();
    productsList.forEach((p) => {
      if (Array.isArray(p.variants)) {
        p.variants.forEach((v: any) => {
          if (v.colorName && v.colorName.trim()) {
            const key = v.colorName.trim().toLowerCase();
            const existing = colorMap.get(key);
            if (existing) {
              existing.count += 1;
            } else {
              colorMap.set(key, {
                name: v.colorName.trim(),
                hex: v.colorHex || '#6366f1',
                count: 1,
              });
            }
          }
        });
      }
    });
    return Array.from(colorMap.values());
  }, [productsList]);

  // Sync state when props change
  useEffect(() => {
    setProductsList(products);
  }, [products]);

  useEffect(() => {
    setCategoriesList(categories);
  }, [categories]);

  // Dynamic query builder
  const buildQueryParams = useCallback(
    (overrides: Record<string, any> = {}) => {
      const qSearch = overrides.search !== undefined ? overrides.search : search;
      const qCat = overrides.categorySlug !== undefined ? overrides.categorySlug : categorySlug;
      const qSort = overrides.sort !== undefined ? overrides.sort : sort;
      const qMinPrice = overrides.minPrice !== undefined ? overrides.minPrice : minPrice;
      const qMaxPrice = overrides.maxPrice !== undefined ? overrides.maxPrice : maxPrice;
      const qInStock = overrides.inStockOnly !== undefined ? overrides.inStockOnly : inStockOnly;
      const qOnSale = overrides.onSaleOnly !== undefined ? overrides.onSaleOnly : onSaleOnly;
      const qMinRating = overrides.minRating !== undefined ? overrides.minRating : minRating;
      const qColor = overrides.selectedColor !== undefined ? overrides.selectedColor : selectedColor;

      const params = new URLSearchParams();
      if (qSearch && qSearch.trim()) params.set('search', qSearch.trim());
      if (qCat && qCat.trim()) params.set('category', qCat.trim());
      if (qSort && qSort !== 'newest') params.set('sort', qSort);
      if (qMinPrice) params.set('minPrice', qMinPrice);
      if (qMaxPrice) params.set('maxPrice', qMaxPrice);
      if (qInStock) params.set('inStock', 'true');
      if (qOnSale) params.set('onSale', 'true');
      if (qMinRating) params.set('minRating', qMinRating);
      if (qColor) params.set('color', qColor);

      return params;
    },
    [search, categorySlug, sort, minPrice, maxPrice, inStockOnly, onSaleOnly, minRating, selectedColor]
  );

  // Fetch filtered products
  const fetchFilteredProducts = useCallback(
    async (params: URLSearchParams) => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/products?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setProductsList(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch filtered products:', err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Trigger search with URL updating
  const applyFilters = useCallback(
    (overrides: Record<string, any> = {}) => {
      const params = buildQueryParams(overrides);
      const newUrl = params.toString() ? `/products?${params.toString()}` : '/products';
      
      // Update browser URL silently without page refresh
      window.history.replaceState(null, '', newUrl);

      fetchFilteredProducts(params);
    },
    [buildQueryParams, fetchFilteredProducts]
  );

  // Debounced search on text input
  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      applyFilters({ search: newSearch });
    }, 280);
  };

  // Immediate filter change handlers
  const handleCategorySelect = (slug: string) => {
    setCategorySlug(slug);
    applyFilters({ categorySlug: slug });
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    applyFilters({ sort: newSort });
  };

  const handlePriceApply = (minVal: string, maxVal: string) => {
    setMinPrice(minVal);
    setMaxPrice(maxVal);
    applyFilters({ minPrice: minVal, maxPrice: maxVal });
  };

  const handleQuickPricePreset = (minVal: string, maxVal: string) => {
    setMinPrice(minVal);
    setMaxPrice(maxVal);
    applyFilters({ minPrice: minVal, maxPrice: maxVal });
  };

  const handleInStockToggle = () => {
    const nextVal = !inStockOnly;
    setInStockOnly(nextVal);
    applyFilters({ inStockOnly: nextVal });
  };

  const handleOnSaleToggle = () => {
    const nextVal = !onSaleOnly;
    setOnSaleOnly(nextVal);
    applyFilters({ onSaleOnly: nextVal });
  };

  const handleRatingSelect = (rating: string) => {
    const nextRating = minRating === rating ? '' : rating;
    setMinRating(nextRating);
    applyFilters({ minRating: nextRating });
  };

  const handleColorSelect = (colorName: string) => {
    const nextColor = selectedColor === colorName ? '' : colorName;
    setSelectedColor(nextColor);
    applyFilters({ selectedColor: nextColor });
  };

  // Clear all filters back to default
  const handleClearAllFilters = () => {
    setSearch('');
    setCategorySlug('');
    setSort('newest');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setOnSaleOnly(false);
    setMinRating('');
    setSelectedColor('');
    applyFilters({
      search: '',
      categorySlug: '',
      sort: 'newest',
      minPrice: '',
      maxPrice: '',
      inStockOnly: false,
      onSaleOnly: false,
      minRating: '',
      selectedColor: '',
    });
  };

  // Realtime synchronization re-fetcher
  useRealtimeSync(() => {
    const params = buildQueryParams();
    fetchFilteredProducts(params);
  });

  // Calculate active filters count for badges
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (categorySlug) count++;
    if (minPrice || maxPrice) count++;
    if (inStockOnly) count++;
    if (onSaleOnly) count++;
    if (minRating) count++;
    if (selectedColor) count++;
    if (sort !== 'newest') count++;
    return count;
  }, [search, categorySlug, minPrice, maxPrice, inStockOnly, onSaleOnly, minRating, selectedColor, sort]);

  // Find parent and child categories
  const parentCategories = useMemo(() => categoriesList.filter((c) => !c.parentId), [categoriesList]);
  const selectedCategoryObj = useMemo(() => categoriesList.find((c) => c.slug === categorySlug), [categoriesList, categorySlug]);

  let activeParent: Category | undefined;
  if (selectedCategoryObj) {
    if (!selectedCategoryObj.parentId) {
      activeParent = selectedCategoryObj;
    } else {
      activeParent = categoriesList.find((c) => c.id === selectedCategoryObj.parentId) || selectedCategoryObj.parent || undefined;
    }
  }

  const childCategories = useMemo(() => {
    if (!activeParent) return [];
    return (
      activeParent.children ||
      categoriesList.filter((c) => c.parentId === activeParent?.id)
    );
  }, [activeParent, categoriesList]);

  // Sidebar / Drawer Filter Component
  const FilterContent = () => (
    <div className="space-y-6">
      
      {/* Category Hierarchy Accordion */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
            <FontAwesomeIcon icon={faLayerGroup} className="text-indigo-500 text-xs" />
            <span>{t.categoryFilter}</span>
          </h4>
          {categorySlug && (
            <button
              onClick={() => handleCategorySelect('')}
              className="text-[10px] font-bold text-rose-500 hover:underline"
            >
              {t.resetAll}
            </button>
          )}
        </div>

        <div className="space-y-1 max-h-56 overflow-y-auto pe-1">
          <button
            type="button"
            onClick={() => handleCategorySelect('')}
            className={`w-full text-start px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
              !categorySlug
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>{t.allCategories}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${!categorySlug ? 'bg-white/20' : 'bg-[var(--bg-primary)]'}`}>
              {categoriesList.reduce((sum, c) => sum + (c._count?.products || 0), 0)}
            </span>
          </button>

          {parentCategories.map((c) => {
            const isParentActive = activeParent?.id === c.id;
            const isExactSelected = categorySlug === c.slug;
            return (
              <div key={c.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleCategorySelect(c.slug)}
                  className={`w-full text-start px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                    isExactSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold'
                      : isParentActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="truncate">{c.name}</span>
                  {c._count?.products !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isExactSelected ? 'bg-white/20 text-white' : 'bg-[var(--bg-card)] text-[var(--text-muted)]'
                      }`}
                    >
                      {c._count.products}
                    </span>
                  )}
                </button>

                {/* Subcategories */}
                {isParentActive && childCategories.length > 0 && (
                  <div className="ps-4 space-y-1 pt-1 pb-1 border-s-2 border-indigo-200 dark:border-indigo-900 ms-3">
                    {childCategories.map((child: any) => {
                      const isChildSelected = categorySlug === child.slug;
                      return (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => handleCategorySelect(child.slug)}
                          className={`w-full text-start px-2.5 py-1.5 rounded-lg text-[11px] transition flex items-center justify-between ${
                            isChildSelected
                              ? 'bg-indigo-600 text-white font-bold shadow-sm'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <span className="truncate">{child.name}</span>
                          {child._count?.products !== undefined && (
                            <span className="text-[9px] opacity-70">({child._count.products})</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="space-y-3 pt-4 border-t theme-border">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
            <FontAwesomeIcon icon={faMoneyBillWave} className="text-emerald-500 text-xs" />
            <span>{t.priceRange}</span>
          </h4>
          {(minPrice || maxPrice) && (
            <button
              onClick={() => handlePriceApply('', '')}
              className="text-[10px] font-bold text-rose-500 hover:underline"
            >
              {t.resetAll}
            </button>
          )}
        </div>

        {/* Min / Max Inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">
              {t.minPrice}
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border theme-border rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">
              {t.maxPrice}
            </label>
            <input
              type="number"
              min="0"
              placeholder="1000+"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border theme-border rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => handlePriceApply(minPrice, maxPrice)}
          className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
        >
          {t.applyPrice}
        </button>

        {/* Quick Price Presets */}
        <div className="space-y-1 pt-1">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">
            {t.quickPricePills}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickPricePreset('0', '50')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                minPrice === '0' && maxPrice === '50'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-indigo-400'
              }`}
            >
              {t.underPrice} {formatPrice(50, currency, language)}
            </button>
            <button
              type="button"
              onClick={() => handleQuickPricePreset('50', '150')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                minPrice === '50' && maxPrice === '150'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-indigo-400'
              }`}
            >
              {formatPrice(50, currency, language)} - {formatPrice(150, currency, language)}
            </button>
            <button
              type="button"
              onClick={() => handleQuickPricePreset('150', '')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                minPrice === '150' && !maxPrice
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-indigo-400'
              }`}
            >
              {t.overPrice} {formatPrice(150, currency, language)}
            </button>
          </div>
        </div>
      </div>

      {/* Stock Availability & Discounts */}
      <div className="space-y-3 pt-4 border-t theme-border">
        <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
          <FontAwesomeIcon icon={faBoxesStacked} className="text-sky-500 text-xs" />
          <span>{t.availability}</span>
        </h4>

        <div className="space-y-2">
          {/* In stock toggle */}
          <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[var(--bg-card)] border theme-border cursor-pointer hover:border-indigo-400 transition">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={handleInStockToggle}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
            />
            <span className="text-xs font-bold text-[var(--text-primary)]">{t.inStockOnly}</span>
          </label>

          {/* On Sale toggle */}
          <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[var(--bg-card)] border theme-border cursor-pointer hover:border-rose-400 transition">
            <input
              type="checkbox"
              checked={onSaleOnly}
              onChange={handleOnSaleToggle}
              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-gray-300"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[var(--text-primary)]">{t.offersOnly}</span>
              <FontAwesomeIcon icon={faPercent} className="text-[10px] text-rose-500" />
            </div>
          </label>
        </div>
      </div>

      {/* Customer Rating Filter */}
      <div className="space-y-3 pt-4 border-t theme-border">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
            <FontAwesomeIcon icon={faStar} className="text-amber-400 text-xs" />
            <span>{t.ratingFilter}</span>
          </h4>
          {minRating && (
            <button
              onClick={() => handleRatingSelect('')}
              className="text-[10px] font-bold text-rose-500 hover:underline"
            >
              {t.resetAll}
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          {['4', '3', '2'].map((starVal) => {
            const isSelected = minRating === starVal;
            return (
              <button
                key={starVal}
                type="button"
                onClick={() => handleRatingSelect(starVal)}
                className={`w-full text-start px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                  isSelected
                    ? 'bg-amber-500 text-white font-bold shadow-md shadow-amber-500/20'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border theme-border'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <div className="flex text-amber-400 text-xs">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <FontAwesomeIcon
                        key={i}
                        icon={faStar}
                        className={i < parseInt(starVal, 10) ? (isSelected ? 'text-white' : 'text-amber-400') : 'text-gray-300 dark:text-gray-700'}
                      />
                    ))}
                  </div>
                  <span className="ms-1 font-bold">{starVal} {t.starsAndUp}</span>
                </div>
                {isSelected && <FontAwesomeIcon icon={faCheck} className="text-xs" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Variant Filter (if any exists) */}
      {availableColors.length > 0 && (
        <div className="space-y-3 pt-4 border-t theme-border">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <FontAwesomeIcon icon={faPalette} className="text-purple-500 text-xs" />
              <span>{t.colorFilter}</span>
            </h4>
            {selectedColor && (
              <button
                onClick={() => handleColorSelect('')}
                className="text-[10px] font-bold text-rose-500 hover:underline"
              >
                {t.resetAll}
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            {availableColors.map((col) => {
              const isSelected = selectedColor.toLowerCase() === col.name.toLowerCase();
              return (
                <button
                  key={col.name}
                  type="button"
                  onClick={() => handleColorSelect(col.name)}
                  className={`relative w-7 h-7 rounded-full transition-all duration-200 flex items-center justify-center border shadow-sm ${
                    isSelected
                      ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[var(--bg-primary)] scale-110 border-indigo-500 shadow-indigo-500/20'
                      : 'border-black/20 dark:border-white/20 hover:scale-110 hover:border-indigo-400'
                  }`}
                  style={{ backgroundColor: col.hex }}
                  title={`${col.name} (${col.count})`}
                  aria-label={`${col.name} (${col.count})`}
                >
                  {isSelected && (
                    <FontAwesomeIcon
                      icon={faCheck}
                      className={`text-[10px] ${
                        ['#ffffff', '#fff', 'white', '#f8fafc', '#f1f5f9', '#e2e8f0', '#ffff00', 'yellow'].includes(col.hex?.toLowerCase())
                          ? 'text-gray-900'
                          : 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Clear All Filters Button */}
      {activeFiltersCount > 0 && (
        <button
          type="button"
          onClick={handleClearAllFilters}
          className="w-full py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={faRotateLeft} />
          <span>{t.clearFilters}</span>
        </button>
      )}
    </div>
  );

  // Skeleton while store rehydrates — avoids React hydration mismatch
  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-pulse">
        <div className="h-36 rounded-3xl bg-[var(--bg-card)] border theme-border" />
        <div className="h-14 rounded-2xl bg-[var(--bg-card)] border theme-border" />
        <div className="flex gap-6">
          <div className="hidden lg:block w-64 shrink-0 h-[600px] rounded-2xl bg-[var(--bg-card)] border theme-border" />
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-[var(--bg-card)] border theme-border" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner & Title Area */}
      <div className="relative rounded-3xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/40 border theme-border p-6 sm:p-8 overflow-hidden backdrop-blur-sm shadow-xl">
        <div className="absolute -top-24 -end-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-extrabold uppercase tracking-wider">
            <FontAwesomeIcon icon={faTags} />
            <span>{t.title}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight">
            {selectedCategoryObj?.name || t.title}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            {t.subtitle}
          </p>
        </div>
      </div>

      {/* Search & Action Bar */}
      <div className="glass-panel rounded-2xl p-4 border theme-border space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Main Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm border theme-border rounded-xl ps-10 pe-10 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-inner"
            />
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute end-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-full"
                title={t.resetAll}
              >
                <FontAwesomeIcon icon={faTimes} className="text-xs" />
              </button>
            )}
          </div>

          {/* Right Controls: Sort, Mobile Filter Button, View Mode */}
          <div className="flex items-center gap-2.5 flex-wrap">
            
            {/* Mobile Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="lg:hidden px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-indigo-600/20"
            >
              <FontAwesomeIcon icon={faFilter} />
              <span>{t.filterBtn}</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-white text-indigo-600 font-black text-[10px] flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--text-muted)] hidden sm:inline">
                {t.sortBy}:
              </span>
              <select
                value={sort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-bold border theme-border rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
              >
                <option value="newest">{t.sortNewest}</option>
                <option value="price-asc">{t.sortPriceAsc}</option>
                <option value="price-desc">{t.sortPriceDesc}</option>
                <option value="discount-desc">{t.sortDiscount}</option>
                <option value="rating-desc">{t.sortRating}</option>
                <option value="title-asc">{t.sortTitleAsc}</option>
                <option value="title-desc">{t.sortTitleDesc}</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center bg-[var(--bg-surface)] border theme-border rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg text-xs transition ${
                  viewMode === 'grid'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title={t.viewGrid}
              >
                <FontAwesomeIcon icon={faBorderAll} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`p-2 rounded-lg text-xs transition ${
                  viewMode === 'compact'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title={t.viewCompact}
              >
                <FontAwesomeIcon icon={faList} />
              </button>
            </div>

          </div>
        </div>

        {/* Active Filters Chips Bar */}
        {activeFiltersCount > 0 && (
          <div className="pt-3 border-t theme-border flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">
              {t.activeFilters}:
            </span>

            {/* Search Query Chip */}
            {search && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                <span>{t.searchKeywords} "{search}"</span>
                <button onClick={() => handleSearchChange('')} className="hover:text-rose-500">
                  <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                </button>
              </span>
            )}

            {/* Category Chip */}
            {categorySlug && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                <span>{selectedCategoryObj?.name || categorySlug}</span>
                <button onClick={() => handleCategorySelect('')} className="hover:text-rose-500">
                  <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                </button>
              </span>
            )}

            {/* Price Chip */}
            {(minPrice || maxPrice) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                <span>
                  {t.priceRange}: {minPrice ? formatPrice(parseFloat(minPrice), currency, language) : '0'} - {maxPrice ? formatPrice(parseFloat(maxPrice), currency, language) : '∞'}
                </span>
                <button onClick={() => handlePriceApply('', '')} className="hover:text-rose-500">
                  <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                </button>
              </span>
            )}

            {/* In Stock Chip */}
            {inStockOnly && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-bold text-xs">
                <span>{t.inStockOnly}</span>
                <button onClick={handleInStockToggle} className="hover:text-rose-500">
                  <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                </button>
              </span>
            )}

            {/* On Sale Chip */}
            {onSaleOnly && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-xs">
                <span>{t.offersOnly}</span>
                <button onClick={handleOnSaleToggle} className="hover:text-rose-500">
                  <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                </button>
              </span>
            )}

            {/* Min Rating Chip */}
            {minRating && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-xs">
                <span>★ {minRating}+</span>
                <button onClick={() => handleRatingSelect('')} className="hover:text-rose-500">
                  <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                </button>
              </span>
            )}

            {/* Color Chip */}
            {selectedColor && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold text-xs">
                <span>{t.colorFilter}: {selectedColor}</span>
                <button onClick={() => handleColorSelect('')} className="hover:text-rose-500">
                  <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                </button>
              </span>
            )}

            {/* Clear All Link */}
            <button
              onClick={handleClearAllFilters}
              className="text-xs font-bold text-rose-500 hover:text-rose-600 hover:underline ms-auto flex items-center gap-1"
            >
              <FontAwesomeIcon icon={faRotateLeft} className="text-[10px]" />
              <span>{t.clearFilters}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Layout: Sidebar + Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Desktop Sticky Filters Sidebar */}
        <aside className="hidden lg:block lg:col-span-1 glass-panel rounded-3xl p-6 border theme-border sticky top-24 shadow-lg space-y-6">
          <div className="flex items-center justify-between pb-3 border-b theme-border">
            <h3 className="text-sm font-black text-[var(--text-primary)] flex items-center gap-2">
              <FontAwesomeIcon icon={faSliders} className="text-indigo-500" />
              <span>{t.filterTitle}</span>
            </h3>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black">
                {activeFiltersCount}
              </span>
            )}
          </div>

          <FilterContent />
        </aside>

        {/* Products Grid Area */}
        <main className="lg:col-span-3 space-y-6">
          
          {/* Status and Count Header */}
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] px-1">
            <div>
              <span className="font-bold text-[var(--text-primary)]">{t.showing} </span>
              <span className="font-black text-indigo-600 dark:text-indigo-400">{productsList.length}</span>{' '}
              <span>{productsList.length === 1 ? t.item : t.items}</span>
              {categorySlug && (
                <span>
                  {' '}{t.in}{' '}
                  <strong className="text-[var(--text-primary)]">
                    {selectedCategoryObj?.name || categorySlug}
                  </strong>
                </span>
              )}
            </div>
            
            {isLoading && (
              <span className="text-indigo-500 font-bold animate-pulse text-xs">
                ...
              </span>
            )}
          </div>

          {/* Grid or Empty State */}
          {productsList.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center space-y-5 max-w-lg mx-auto my-12 border theme-border shadow-xl">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto text-3xl">
                <FontAwesomeIcon icon={faFrown} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">{t.noProducts}</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {t.noProductsDesc}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/30"
              >
                <FontAwesomeIcon icon={faRotateLeft} />
                <span>{t.clearFilters}</span>
              </button>
            </div>
          ) : (
            <div
              className={`grid gap-6 ${
                viewMode === 'grid'
                  ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
                  : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
              }`}
            >
              {productsList.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

        </main>
      </div>

      {/* Mobile Slide-Over Filter Drawer Modal */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative ms-auto w-full max-w-xs sm:max-w-sm bg-[var(--bg-surface)] border-s theme-border h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between space-y-6 z-10 animate-slideStart">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b theme-border">
                <h3 className="text-sm font-black text-[var(--text-primary)] flex items-center gap-2">
                  <FontAwesomeIcon icon={faSliders} className="text-indigo-500" />
                  <span>{t.filterTitle}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-card)]"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>

              <FilterContent />
            </div>

            {/* Bottom Drawer Actions */}
            <div className="pt-4 border-t theme-border space-y-2 sticky bottom-0 bg-[var(--bg-surface)]">
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30"
              >
                {t.applyFilters} ({productsList.length})
              </button>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="w-full py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] rounded-xl text-xs font-semibold transition"
                >
                  {t.clearFilters}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

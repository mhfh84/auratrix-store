'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/store/useSettingsStore';
import { formatPrice } from '@/lib/currencies';
import { getImageUrl } from '@/lib/images';
import { getProductUrl } from '@/lib/productUrl';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faSpinner,
  faTimes,
  faArrowRight,
  faBoxOpen,
  faCheckCircle,
  faExclamationCircle,
} from '@fortawesome/free-solid-svg-icons';

import { translations } from '@/lib/translations';

interface SearchDropdownProps {
  placeholder?: string;
  isMobile?: boolean;
  onNavigate?: () => void;
  className?: string;
}

export default function SearchDropdown({
  placeholder,
  isMobile = false,
  onNavigate,
  className = '',
}: SearchDropdownProps) {
  const router = useRouter();
  const { language, currency } = useSettings();
  const t = translations[language].searchDropdown;
  const isRTL = language === 'ar';

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [matchedCategories, setMatchedCategories] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Search API fetcher
  const fetchSearchResults = useCallback(async (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setResults([]);
      setMatchedCategories([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          setResults(Array.isArray(data.products) ? data.products : []);
          setMatchedCategories(Array.isArray(data.categories) ? data.categories : []);
        } else {
          setResults(Array.isArray(data) ? data : []);
          setMatchedCategories([]);
        }
      } else {
        setResults([]);
        setMatchedCategories([]);
      }
    } catch {
      setResults([]);
      setMatchedCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce search query
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);
    setSelectedIndex(-1);

    debounceTimerRef.current = setTimeout(() => {
      fetchSearchResults(trimmed);
    }, 180);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, fetchSearchResults]);

  // If products change in realtime, refresh search results if dropdown is currently active
  useRealtimeSync(
    () => {
      if (isOpen && query.trim()) {
        fetchSearchResults(query);
      }
    },
    { types: ['products', 'all'] }
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    const maxIndex = Math.min(results.length - 1, 5); // top 6 items

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleProductSelect(results[selectedIndex]);
      } else if (query.trim()) {
        handleSubmitFullSearch();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleProductSelect = (productItem: any) => {
    const targetUrl = getProductUrl(productItem);
    setIsOpen(false);
    if (onNavigate) onNavigate();
    router.push(targetUrl);
  };

  const handleProductClick = (e: React.MouseEvent, productItem: any) => {
    e.preventDefault();
    e.stopPropagation();
    handleProductSelect(productItem);
  };

  const handleSubmitFullSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      setIsOpen(false);
      if (onNavigate) onNavigate();
      router.push(`/products?search=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const displayResults = results.slice(0, 6);

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
    >
      {/* Search Input Form */}
      <form onSubmit={handleSubmitFullSearch} className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t.placeholder}
          className={`w-full bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm border theme-border focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-inner ${
            isMobile ? 'rounded-xl ps-10 pe-10 py-2.5' : 'rounded-full ps-10 pe-10 py-2'
          }`}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
        />

        {/* Start Icon (Search or Loading Spinner) */}
        <div className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none flex items-center justify-center">
          {isLoading ? (
            <FontAwesomeIcon icon={faSpinner} className="text-indigo-500 animate-spin text-sm" />
          ) : (
            <FontAwesomeIcon icon={faSearch} className="text-sm" />
          )}
        </div>

        {/* Clear Button */}
        {query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute end-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-card)] transition flex items-center justify-center"
            title={t.clear}
            aria-label="Clear search"
          >
            <FontAwesomeIcon icon={faTimes} className="text-xs" />
          </button>
        )}
      </form>

      {/* Realtime Results Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div
          onMouseDown={(e) => {
            // Prevent input blur before click registers
            e.preventDefault();
            e.stopPropagation();
          }}
          className={`absolute top-full mt-2 start-0 end-0 bg-[var(--bg-surface)] border theme-border shadow-2xl overflow-hidden z-50 animate-fadeIn ${
            isMobile ? 'rounded-2xl max-h-[70vh] overflow-y-auto' : 'rounded-2xl max-h-[480px] overflow-y-auto'
          }`}
        >
          {/* Top Info Bar */}
          <div className="px-4 py-2 bg-[var(--bg-primary)] border-b theme-border flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span className="font-semibold">
              {isLoading ? t.searching : `${t.results} (${results.length})`}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline">
              {t.pressEnter}
            </span>
          </div>

          {/* Matched Categories Chips if any */}
          {matchedCategories.length > 0 && (
            <div className="px-3 py-2 bg-indigo-50/50 dark:bg-indigo-950/30 border-b theme-border flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-[10px] font-bold text-[var(--text-muted)]">{isRTL ? 'الأقسام:' : 'Categories:'}</span>
              {matchedCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/products?category=${encodeURIComponent(cat.slug)}`}
                  onClick={() => {
                    setIsOpen(false);
                    onNavigate?.();
                  }}
                  className="px-2.5 py-0.5 rounded-full bg-[var(--bg-surface)] hover:bg-indigo-600 hover:text-white border theme-border font-semibold text-[11px] text-indigo-600 dark:text-indigo-400 transition"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          )}

          {/* Results List */}
          {displayResults.length > 0 ? (
            <div className="divide-y theme-border">
              {displayResults.map((product, idx) => {
                const isSelected = idx === selectedIndex;
                const hasDiscount = product.discountPercent > 0;
                const finalPrice = hasDiscount
                  ? product.price * (1 - product.discountPercent / 100)
                  : product.price;
                const inStock = product.stockQuantity > 0;
                const categoryName = product.categories?.[0]?.name;
                const productUrl = getProductUrl(product);

                return (
                  <Link
                    key={product.id}
                    href={productUrl}
                    onClick={(e) => handleProductClick(e, product)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className={`w-full text-start p-3 flex items-center gap-3 transition-colors block cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 border-s-4 border-indigo-600'
                        : 'hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-900 overflow-hidden flex-shrink-0 border theme-border">
                      <Image
                        src={getImageUrl(product.images)}
                        alt={product.title}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {product.title}
                        </h4>
                        {categoryName && (
                          <span className="text-[10px] font-medium bg-[var(--bg-primary)] border theme-border text-[var(--text-secondary)] px-1.5 py-0.5 rounded flex-shrink-0">
                            {categoryName}
                          </span>
                        )}
                      </div>

                      {/* Pricing & Stock */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                          {formatPrice(finalPrice, currency, language)}
                        </span>
                        {hasDiscount && (
                          <span className="text-[10px] text-[var(--text-muted)] line-through font-mono">
                            {formatPrice(product.price, currency, language)}
                          </span>
                        )}
                        {hasDiscount && (
                          <span className="text-[9px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 px-1 rounded">
                            -{Math.round(product.discountPercent)}%
                          </span>
                        )}

                        <span
                          className={`ms-auto text-[10px] font-semibold flex items-center gap-1 ${
                            inStock ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                          }`}
                        >
                          <FontAwesomeIcon
                            icon={inStock ? faCheckCircle : faExclamationCircle}
                            className="text-[9px]"
                          />
                          <span>{inStock ? t.inStock : t.outOfStock}</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : !isLoading ? (
            /* Empty State */
            <div className="p-8 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center mx-auto text-sm">
                <FontAwesomeIcon icon={faBoxOpen} />
              </div>
              <p className="text-xs font-bold text-[var(--text-primary)]">
                {t.noResultsFor} "{query}"
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {t.tryDifferent}
              </p>
            </div>
          ) : null}

          {/* Bottom View All Link */}
          {results.length > 0 && (
            <Link
              href={`/products?search=${encodeURIComponent(query.trim())}`}
              onClick={(e) => {
                e.preventDefault();
                handleSubmitFullSearch();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="w-full p-2.5 bg-[var(--bg-primary)] hover:bg-indigo-600 hover:text-white border-t theme-border text-xs font-bold text-indigo-600 dark:text-indigo-400 transition flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>{t.viewAllResults} ({results.length})</span>
              <FontAwesomeIcon
                icon={faArrowRight}
                className={`text-xs transition-transform group-hover:translate-x-1 ${
                  isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''
                }`}
              />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

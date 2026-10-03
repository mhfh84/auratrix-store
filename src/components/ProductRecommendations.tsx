'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/store/useSettingsStore';
import ProductCard from '@/components/ProductCard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faThLarge } from '@fortawesome/free-solid-svg-icons';

interface ProductRecommendationsProps {
  productId: string;
  categoryIds?: string[];
}

export default function ProductRecommendations({ productId, categoryIds = [] }: ProductRecommendationsProps) {
  const { language } = useSettings();
  const isRTL = language === 'ar';

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryIdsKey = (categoryIds || []).filter(Boolean).join(',');

  useEffect(() => {
    if (!productId) return;

    let isMounted = true;
    setLoading(true);

    fetch(`/api/products/recommendations?productId=${encodeURIComponent(productId)}&categoryIds=${encodeURIComponent(categoryIdsKey)}&limit=4`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setProducts(data.products || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [productId, categoryIdsKey]);

  if (!loading && products.length === 0) return null;

  return (
    <div className="space-y-6 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-2">
            <FontAwesomeIcon icon={faStar} className="text-amber-500 text-base" />
            <span>{isRTL ? 'منتجات مقترحة لك' : 'Recommended For You'}</span>
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {isRTL ? 'منتجات مميزة مختارة خصيصاً لتناسب اختياراتك' : 'Specially selected items you might also love'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-72 rounded-2xl bg-[var(--bg-card)] border theme-border" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {products.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      )}
    </div>
  );
}

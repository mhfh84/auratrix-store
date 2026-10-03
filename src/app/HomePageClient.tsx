'use client';

import React, { useState, useMemo, useCallback } from 'react';
import CartBubble from '../components/CartBubble';
import RecentlyViewed from '../components/RecentlyViewed';
import HeroSection from '../components/home/HeroSection';
import CategoryGrid from '../components/home/CategoryGrid';
import FlashDealsSection from '../components/home/FlashDealsSection';
import NewArrivalsCarousel from '../components/home/NewArrivalsCarousel';
import ProductSection from '../components/home/ProductSection';
import TrustBadges from '../components/home/TrustBadges';
import { useSettings } from '../store/useSettingsStore';
import { translations } from '../lib/translations';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { faFire } from '@fortawesome/free-solid-svg-icons';
import type { CategoryData, ProductData } from '@/types/models';

interface HomePageClientProps {
  categories: CategoryData[];
  newArrivals: ProductData[];
  bestSellers: ProductData[];
  heroPool?: ProductData[];
}

export default function HomePageClient({
  categories,
  newArrivals,
  bestSellers,
  heroPool = [],
}: HomePageClientProps) {
  const { language } = useSettings();
  const t = translations[language].home;

  const [categoriesList, setCategoriesList] = useState<CategoryData[]>(categories);
  const [newArrivalsList, setNewArrivalsList] = useState<ProductData[]>(newArrivals);
  const [bestSellersList, setBestSellersList] = useState<ProductData[]>(bestSellers);

  // Candidate pool for hero products rotation and deal inspection (strictly deduplicated)
  const candidatePool = useMemo(() => {
    const combined = [...heroPool, ...newArrivalsList, ...bestSellersList];
    const map = new Map<string, ProductData>();
    combined.forEach((item) => {
      if (item && item.id && !map.has(item.id)) {
        map.set(item.id, item);
      }
    });
    return Array.from(map.values());
  }, [heroPool, newArrivalsList, bestSellersList]);

  // Realtime store updates listener
  const refreshHomeData = useCallback(async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/products?sort=newest'),
        fetch('/api/categories'),
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        if (Array.isArray(prodData)) {
          setNewArrivalsList(prodData.slice(0, 24));
          setBestSellersList((prev) => {
            if (prev.length === 0) return prodData.slice(0, 8);
            const updated = prev.map((p) => prodData.find((fresh: any) => fresh.id === p.id) || p);
            return updated.slice(0, 8);
          });
        }
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        if (Array.isArray(catData)) {
          setCategoriesList(catData);
        }
      }
    } catch {
      // Quietly ignore realtime refresh error
    }
  }, []);

  useRealtimeSync(refreshHomeData);

  return (
    <div className="space-y-16 pb-12">
      {/* 1. Hero Section */}
      <HeroSection
        candidatePool={candidatePool}
        newArrivalsCount={newArrivalsList.length}
        categoriesCount={categoriesList.length}
      />

      {/* 2. Trust Badges */}
      <TrustBadges />

      {/* 3. Category Grid */}
      <CategoryGrid categories={categoriesList} />

      {/* 4. Daily Flash Deals (Deduplicated unique discounted products) */}
      <FlashDealsSection products={candidatePool} />

      {/* 5. New Arrivals (Original Infinite Auto-Scroll Carousel) */}
      <NewArrivalsCarousel products={newArrivalsList} />

      {/* 6. Best Sellers Grid */}
      <ProductSection
        title={t.bestSellers}
        subtitle={t.bestSellersDesc}
        badgeText={t.featuredBadge}
        badgeIcon={faFire}
        badgeColorClass="text-orange-500 bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-700/50"
        products={bestSellersList}
        limit={8}
        viewAllHref="/products?sort=popular"
      />

      {/* 7. Recently Viewed Products */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RecentlyViewed />
      </div>

      {/* Floating Bottom Cart Bubble */}
      <CartBubble />
    </div>
  );
}

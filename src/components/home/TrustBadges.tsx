'use client';

import React from 'react';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTruckFast,
  faShieldHalved,
  faRotateLeft,
  faHeadset,
} from '@fortawesome/free-solid-svg-icons';

export default function TrustBadges() {
  const { language } = useSettings();
  const t = translations[language].features;
  const isRTL = language === 'ar';

  const badges = [
    {
      icon: faTruckFast,
      title: isRTL ? 'شحن سريع ومباشر' : 'Fast Delivery',
      desc: isRTL ? 'شحن سريع وموثوق لكافة المحافظات' : 'Fast and tracked delivery to your door',
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
    },
    {
      icon: faShieldHalved,
      title: isRTL ? 'دفع آمن ومضمون' : '100% Secure Payment',
      desc: isRTL ? 'دفع آمن عند الاستلام أو بالبطاقة' : 'Secure payment on delivery or by card',
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
    },
    {
      icon: faRotateLeft,
      title: isRTL ? 'استبدال واسترجاع سهل' : 'Easy Returns',
      desc: isRTL ? 'سياسة استبدال واسترجاع مرنة وسهلة' : 'Hassle-free return and exchange policy',
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
    },
    {
      icon: faHeadset,
      title: isRTL ? 'دعم فني متواصل' : '24/7 Support',
      desc: isRTL ? 'فريق خدمة عملاء متخصص لمساعدتك' : 'Dedicated customer support team ready to help',
      color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60',
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {badges.map((b, i) => (
          <div
            key={i}
            className="glass-panel p-6 rounded-3xl border theme-border hover:shadow-lg transition-all duration-300 flex items-start gap-4"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 ${b.color}`}>
              <FontAwesomeIcon icon={b.icon} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text-primary)]">{b.title}</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

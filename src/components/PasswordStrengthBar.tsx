'use client';

import React from 'react';
import { getPasswordStrength, type PasswordStrength } from '@/lib/validation';

interface PasswordStrengthBarProps {
  password: string;
  isArabic?: boolean;
}

const LABELS: Record<PasswordStrength, { en: string; ar: string; color: string; bg: string }> = {
  empty:  { en: '',       ar: '',         color: 'bg-gray-200 dark:bg-gray-700', bg: 'text-[var(--text-muted)]' },
  weak:   { en: 'Weak',   ar: 'ضعيفة',   color: 'bg-rose-500',                  bg: 'text-rose-500' },
  medium: { en: 'Medium', ar: 'متوسطة',  color: 'bg-amber-500',                 bg: 'text-amber-500' },
  strong: { en: 'Strong', ar: 'قوية',    color: 'bg-emerald-500',               bg: 'text-emerald-500' },
};

export default function PasswordStrengthBar({ password, isArabic = false }: PasswordStrengthBarProps) {
  const { score, strength, feedback } = getPasswordStrength(password, isArabic);

  if (!password) return null;

  const label = LABELS[strength];
  const filledSegments = score; // 0–4 segments

  return (
    <div className="mt-2 space-y-1.5">
      {/* 4-segment bar */}
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < filledSegments ? label.color : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>

      {/* Label + first hint */}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold ${label.bg}`}>
          {isArabic ? label.ar : label.en}
        </span>
        {feedback.length > 0 && (
          <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[70%] text-end">
            {feedback[0]}
          </span>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faFire } from '@fortawesome/free-solid-svg-icons';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { useMounted } from '@/hooks/useMounted';

interface CountdownTimerProps {
  targetDate: string | Date;
  compact?: boolean;
  onExpire?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function calculateTimeLeft(target: Date): TimeLeft {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds, isExpired: false };
}

export default function CountdownTimer({
  targetDate,
  compact = false,
  onExpire,
}: CountdownTimerProps) {
  const mounted = useMounted();
  const { language } = useSettings();
  const t = translations[language].countdown;
  const target = new Date(targetDate);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(target));

  useEffect(() => {
    if (!mounted) return;

    setTimeLeft(calculateTimeLeft(target));

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft(target);
      setTimeLeft(remaining);
      if (remaining.isExpired) {
        clearInterval(timer);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [mounted, targetDate, onExpire]);

  if (!mounted || timeLeft.isExpired) {
    return null;
  }

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-mono text-[11px] font-extrabold backdrop-blur-xs">
        <FontAwesomeIcon icon={faFire} className="text-rose-500 animate-pulse text-[10px]" />
        <span suppressHydrationWarning>
          {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
          {String(timeLeft.hours).padStart(2, '0')}:
          {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-pink-500/10 border border-rose-500/20 shadow-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
          <FontAwesomeIcon icon={faFire} className="text-rose-500 animate-bounce" />
          <span>{t.flashSaleTitle}</span>
        </span>
        <span className="text-[11px] text-[var(--text-muted)] font-bold flex items-center gap-1">
          <FontAwesomeIcon icon={faClock} />
          <span>{t.endsIn}</span>
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center pt-1">
        {[
          { label: t.days, val: timeLeft.days },
          { label: t.hours, val: timeLeft.hours },
          { label: t.minutes, val: timeLeft.minutes },
          { label: t.seconds, val: timeLeft.seconds },
        ].map((unit, idx) => (
          <div key={idx} className="bg-[var(--bg-surface)] border theme-border rounded-xl p-2 shadow-xs">
            <span suppressHydrationWarning className="block text-lg font-black font-mono text-rose-600 dark:text-rose-400 leading-tight">
              {String(unit.val).padStart(2, '0')}
            </span>
            <span className="block text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

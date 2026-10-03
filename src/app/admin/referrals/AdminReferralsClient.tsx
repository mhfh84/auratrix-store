'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/store/useSettingsStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGift, faUsers, faMedal, faCheckCircle, faHourglassHalf,
  faChartLine, faStar, faCoins,
} from '@fortawesome/free-solid-svg-icons';

export default function AdminReferralsClient() {
  const { language } = useSettings();
  const isRTL = language === 'ar';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/referrals?view=admin')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data?.stats || {};
  const topReferrers = data?.topReferrers || [];
  const records = data?.records || [];

  const statCards = [
    {
      icon: faUsers, color: 'indigo', label: isRTL ? 'إجمالي الإحالات' : 'Total Referrals',
      value: stats.totalRecords || 0,
    },
    {
      icon: faCheckCircle, color: 'emerald', label: isRTL ? 'مكافآت محوّلة' : 'Rewarded',
      value: stats.rewarded || 0,
    },
    {
      icon: faHourglassHalf, color: 'amber', label: isRTL ? 'في الانتظار' : 'Pending',
      value: stats.pending || 0,
    },
    {
      icon: faCoins, color: 'purple', label: isRTL ? 'نقاط موزّعة' : 'Points Awarded',
      value: (stats.totalPoints || 0).toLocaleString(),
    },
  ];

  const colorMap: Record<string, string> = {
    indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-500/30',
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-500/30',
    amber:   'from-amber-500 to-amber-600 shadow-amber-500/30',
    purple:  'from-purple-500 to-purple-600 shadow-purple-500/30',
  };

  const bgMap: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-950/60',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/60',
    amber:   'bg-amber-50 dark:bg-amber-950/60',
    purple:  'bg-purple-50 dark:bg-purple-950/60',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-2">
          <FontAwesomeIcon icon={faGift} className="text-purple-500" />
          <span>{isRTL ? 'برنامج الإحالة' : 'Referral Program'}</span>
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          {isRTL ? 'متابعة إحصائيات الإحالة ومكافآت العملاء' : 'Monitor referral statistics and customer rewards'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="glass-card rounded-2xl border theme-border p-5 space-y-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[s.color]} text-white flex items-center justify-center shadow-md`}>
              <FontAwesomeIcon icon={s.icon} className="text-sm" />
            </div>
            <div>
              <p className="text-2xl font-black text-[var(--text-primary)]">{s.value}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Referrers Leaderboard */}
        <div className="glass-panel rounded-2xl border theme-border p-5 space-y-4">
          <h2 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <FontAwesomeIcon icon={faMedal} className="text-amber-500" />
            {isRTL ? 'أكثر العملاء إحالةً' : 'Top Referrers'}
          </h2>

          {topReferrers.length === 0 ? (
            <div className="py-10 text-center">
              <FontAwesomeIcon icon={faUsers} className="text-3xl text-[var(--text-muted)] mb-2" />
              <p className="text-xs text-[var(--text-secondary)]">
                {isRTL ? 'لا توجد بيانات إحالة بعد' : 'No referral data yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {topReferrers.map((r: any, idx: number) => (
                <div key={r.id} className="flex items-center justify-between bg-[var(--bg-card)] rounded-xl px-4 py-3 border theme-border">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                      idx === 0 ? 'bg-amber-500 text-white' :
                      idx === 1 ? 'bg-slate-400 text-white' :
                      idx === 2 ? 'bg-orange-600 text-white' :
                      'bg-[var(--bg-surface)] text-[var(--text-muted)] border theme-border'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">{r.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{r.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-end">
                      <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">{r.count} {isRTL ? 'إحالة' : 'refs'}</p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">{r.points} pts</p>
                    </div>
                    {idx === 0 && <FontAwesomeIcon icon={faStar} className="text-amber-500 text-sm" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Referral Activity */}
        <div className="glass-panel rounded-2xl border theme-border p-5 space-y-4">
          <h2 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <FontAwesomeIcon icon={faChartLine} className="text-indigo-500" />
            {isRTL ? 'آخر نشاط إحالة' : 'Recent Referral Activity'}
          </h2>

          {records.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-xs text-[var(--text-secondary)]">
                {isRTL ? 'لا يوجد نشاط بعد' : 'No activity yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {records.slice(0, 20).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between text-[11px] bg-[var(--bg-card)] px-3 py-2.5 rounded-xl border theme-border gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[var(--text-primary)] truncate">{r.referredUser?.name || 'User'}</p>
                    <p className="text-[var(--text-muted)] truncate">
                      {isRTL ? 'عبر إحالة' : 'via'}: <span className="font-medium">{r.referrer?.name}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] ${
                      r.status === 'REWARDED' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600' :
                      r.status === 'CONVERTED' ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600' :
                      'bg-amber-50 dark:bg-amber-950/60 text-amber-600'
                    }`}>
                      {r.status}
                    </span>
                    {r.rewardPoints > 0 && (
                      <span className="text-amber-600 font-mono font-bold">+{r.rewardPoints} pts</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

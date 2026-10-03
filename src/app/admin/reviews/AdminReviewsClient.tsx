'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/store/useSettingsStore';
import { useToastStore } from '@/store/useToastStore';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStar, faCheckCircle, faClock, faTrash,
  faSearch, faComments, faShieldHalved, faReply,
  faTimes, faPaperPlane, faTimesCircle,
} from '@fortawesome/free-solid-svg-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewRow {
  id: string;
  productId: string;
  productTitle: string;
  authorName: string;
  authorEmail: string;
  rating: number;
  comment: string;
  isVerified: boolean;
  status?: string;
  adminReply?: string | null;
  adminRepliedAt?: string | null;
  createdAt: string;
}

interface AdminReviewsClientProps {
  reviews: ReviewRow[];
}

type StatusFilter = 'all' | 'approved' | 'pending' | 'rejected';

// ─── StarDisplay ──────────────────────────────────────────────────────────────

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <FontAwesomeIcon
          key={s}
          icon={faStar}
          className={`text-[10px] ${s <= rating ? 'text-amber-400' : 'text-gray-300 dark:text-gray-700'}`}
        />
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminReviewsClient({ reviews: initialReviews }: AdminReviewsClientProps) {
  const { language } = useSettings();
  const t = translations[language].adminReviews;
  const isAr = language === 'ar';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [reviews, setReviews] = useState<ReviewRow[]>(initialReviews);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [ratingFilter, setRatingFilter] = useState<number>(0);

  // Reply Modal State
  const [replyingReview, setReplyingReview] = useState<ReviewRow | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySaving, setReplySaving] = useState(false);

  // ── Metrics ──
  const totalReviews = reviews.length;
  const approvedCount = reviews.filter((r) => r.isVerified || r.status === 'APPROVED').length;
  const pendingCount = reviews.filter((r) => !r.isVerified && r.status !== 'REJECTED').length;

  // ── Filtering ──
  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        r.authorName.toLowerCase().includes(q) ||
        r.productTitle.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q) ||
        r.authorEmail?.toLowerCase().includes(q);

      const isAppr = r.isVerified || r.status === 'APPROVED';
      const isRej = r.status === 'REJECTED';
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'approved' && isAppr) ||
        (statusFilter === 'pending' && !isAppr && !isRej) ||
        (statusFilter === 'rejected' && isRej);

      const matchRating = ratingFilter === 0 || r.rating === ratingFilter;

      return matchSearch && matchStatus && matchRating;
    });
  }, [reviews, search, statusFilter, ratingFilter]);

  // ── Actions ──
  const handleSetStatus = async (reviewId: string, newStatus: 'APPROVED' | 'REJECTED' | 'PENDING') => {
    try {
      const res = await fetch('/api/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, status: newStatus, isVerified: newStatus === 'APPROVED' }),
      });
      if (!res.ok) throw new Error('Failed');
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, status: newStatus, isVerified: newStatus === 'APPROVED' } : r))
      );
      useToastStore.getState().success(
        newStatus === 'APPROVED'
          ? (isAr ? 'تمت الموافقة على التقييم بنجاح' : 'Review approved successfully')
          : newStatus === 'REJECTED'
          ? (isAr ? 'تم رفض التقييم' : 'Review rejected')
          : (isAr ? 'تم تحويل التقييم لقيد الانتظار' : 'Review set to pending')
      );
      startTransition(() => router.refresh());
    } catch {
      useToastStore.getState().error(isAr ? 'حدث خطأ أثناء تحديث الحالة' : 'Failed to update review status');
    }
  };

  const handleSaveReply = async () => {
    if (!replyingReview) return;
    setReplySaving(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: replyingReview.id, adminReply: replyText }),
      });
      if (!res.ok) throw new Error('Failed to save reply');
      setReviews((prev) =>
        prev.map((r) => (r.id === replyingReview.id ? { ...r, adminReply: replyText, adminRepliedAt: new Date().toISOString() } : r))
      );
      useToastStore.getState().success(isAr ? 'تم حفظ رد الإدارة بنجاح' : 'Store reply saved successfully');
      setReplyingReview(null);
      setReplyText('');
      startTransition(() => router.refresh());
    } catch {
      useToastStore.getState().error(isAr ? 'فشل حفظ الرد' : 'Failed to save store reply');
    } finally {
      setReplySaving(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      const res = await fetch(`/api/reviews?reviewId=${reviewId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      useToastStore.getState().success(t.deleteSuccess);
      startTransition(() => router.refresh());
    } catch {
      useToastStore.getState().error(isAr ? 'حدث خطأ أثناء حذف التقييم' : 'Failed to delete review');
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2.5">
          <FontAwesomeIcon icon={faComments} className="text-indigo-500" />
          {t.title}
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">{t.subtitle}</p>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: t.totalReviews, value: totalReviews, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-700/50', icon: faComments },
          { label: t.approved, value: approvedCount, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-700/50', icon: faCheckCircle },
          { label: t.pending, value: pendingCount, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-700/50', icon: faClock },
        ].map((card, i) => (
          <div key={i} className="glass-card p-4 rounded-2xl border theme-border flex items-center gap-4 shadow-sm">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${card.color}`}>
              <FontAwesomeIcon icon={card.icon} />
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-secondary)] font-medium">{card.label}</p>
              <p className="text-2xl font-black text-[var(--text-primary)] font-mono">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className="glass-card rounded-2xl border theme-border p-4 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <FontAwesomeIcon icon={faSearch} className="absolute top-1/2 -translate-y-1/2 start-3 text-[var(--text-muted)] text-xs" />
            <input
              id="reviews-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full ps-8 pe-3 py-2 rounded-xl bg-[var(--bg-surface)] border theme-border text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              ['all', t.filterAll || 'All'],
              ['approved', t.filterApproved || 'Approved'],
              ['pending', t.filterPending || 'Pending'],
              ['rejected', isAr ? 'مرفوض' : 'Rejected'],
            ].map(([key, label]) => (
              <button
                key={key}
                id={`reviews-filter-${key}`}
                onClick={() => setStatusFilter(key as StatusFilter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  statusFilter === key
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border)] hover:text-indigo-600 hover:border-indigo-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Rating filter */}
          <select
            id="reviews-rating-filter"
            value={ratingFilter}
            onChange={(e) => setRatingFilter(Number(e.target.value))}
            className="text-xs bg-[var(--bg-surface)] border theme-border rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
          >
            <option value={0}>{t.allStars}</option>
            {[5, 4, 3, 2, 1].map((s) => (
              <option key={s} value={s}>{'★'.repeat(s)} ({s})</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Reviews Table ── */}
      <div className="glass-panel rounded-2xl border theme-border overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--text-muted)]">{t.noReviews}</div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y theme-border">
              {filtered.map((r) => {
                const isApproved = r.isVerified || r.status === 'APPROVED';
                const isRejected = r.status === 'REJECTED';
                return (
                  <div key={r.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-[var(--text-primary)] truncate">{r.productTitle}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{r.authorName}</p>
                        <StarDisplay rating={r.rating} />
                      </div>
                      <div className="flex-shrink-0">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 font-bold text-[10px]"><FontAwesomeIcon icon={faCheckCircle} className="text-[9px]" />{t.statusApproved}</span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 border border-rose-200 font-bold text-[10px]"><FontAwesomeIcon icon={faTimesCircle} className="text-[9px]" />{isAr ? 'مرفوض' : 'Rejected'}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 border border-amber-200 font-bold text-[10px]"><FontAwesomeIcon icon={faClock} className="text-[9px]" />{t.statusPending}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{r.comment}</p>
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      {!isApproved && <button onClick={() => handleSetStatus(r.id, 'APPROVED')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"><FontAwesomeIcon icon={faCheckCircle} className="text-[9px]" /><span>{t.approve || 'Approve'}</span></button>}
                      {!isRejected && <button onClick={() => handleSetStatus(r.id, 'REJECTED')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border bg-amber-50 dark:bg-amber-950/60 text-amber-600 border-amber-200 hover:bg-amber-100 transition cursor-pointer"><FontAwesomeIcon icon={faTimesCircle} className="text-[9px]" /><span>{isAr ? 'رفض' : 'Reject'}</span></button>}
                      <button onClick={() => { setReplyingReview(r); setReplyText(r.adminReply || ''); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border-indigo-200 hover:bg-indigo-100 transition cursor-pointer"><FontAwesomeIcon icon={faReply} className="text-[9px]" /><span>{r.adminReply ? (isAr ? 'تعديل الرد' : 'Edit Reply') : (isAr ? 'رد' : 'Reply')}</span></button>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-xl text-[10px] font-bold border bg-rose-50 dark:bg-rose-950/60 text-rose-600 border-rose-200 hover:bg-rose-100 transition cursor-pointer"><FontAwesomeIcon icon={faTrash} className="text-[10px]" /></button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b theme-border bg-[var(--bg-surface)]">
                    {[t.colProduct, t.colAuthor, t.colRating, t.colComment, t.colDate, t.colStatus, t.colActions].map((h) => (
                      <th key={h} className="text-start px-4 py-3 text-[var(--text-secondary)] font-bold uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y theme-border">
                  {filtered.map((r) => {
                    const isApproved = r.isVerified || r.status === 'APPROVED';
                    const isRejected = r.status === 'REJECTED';

                    return (
                      <tr key={r.id} className="hover:bg-[var(--bg-card)] transition group">
                        {/* Product */}
                        <td className="px-4 py-3.5 max-w-[140px]">
                          <span className="font-bold text-[var(--text-primary)] line-clamp-1">{r.productTitle}</span>
                        </td>

                        {/* Author */}
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-[var(--text-primary)]">{r.authorName}</p>
                          {r.authorEmail && (
                            <p className="text-[10px] text-[var(--text-muted)]">{r.authorEmail}</p>
                          )}
                        </td>

                        {/* Rating */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <StarDisplay rating={r.rating} />
                          <span className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5 block">{r.rating}/5</span>
                        </td>

                        {/* Comment & Admin Reply */}
                        <td className="px-4 py-3.5 max-w-[240px]">
                          <p className="text-[var(--text-secondary)] line-clamp-2 leading-relaxed">{r.comment}</p>
                          {r.adminReply && (
                            <div className="mt-1.5 p-2 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/40 text-[11px] text-indigo-700 dark:text-indigo-300">
                              <span className="font-extrabold block text-[10px] text-indigo-600 dark:text-indigo-400">
                                💬 {isAr ? 'رد المتجر:' : 'Store Reply:'}
                              </span>
                              <span className="line-clamp-1">{r.adminReply}</span>
                            </div>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-[var(--text-muted)] font-mono">
                          {new Date(r.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                        </td>

                        {/* Status Badge */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50 font-bold text-[10px]">
                              <FontAwesomeIcon icon={faCheckCircle} className="text-[9px]" />
                              {t.statusApproved}
                            </span>
                          ) : isRejected ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-700/50 font-bold text-[10px]">
                              <FontAwesomeIcon icon={faTimesCircle} className="text-[9px]" />
                              {isAr ? 'مرفوض' : 'Rejected'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50 font-bold text-[10px]">
                              <FontAwesomeIcon icon={faClock} className="text-[9px]" />
                              {t.statusPending}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {/* Approve Button */}
                            {!isApproved && (
                              <button
                                onClick={() => handleSetStatus(r.id, 'APPROVED')}
                                title={t.approve || 'Approve'}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/40 hover:bg-emerald-100 transition cursor-pointer"
                              >
                                <FontAwesomeIcon icon={faCheckCircle} className="text-[9px]" />
                                <span>{t.approve || 'Approve'}</span>
                              </button>
                            )}

                            {/* Reject Button */}
                            {!isRejected && (
                              <button
                                onClick={() => handleSetStatus(r.id, 'REJECTED')}
                                title={isAr ? 'رفض' : 'Reject'}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-700/40 hover:bg-amber-100 transition cursor-pointer"
                              >
                                <FontAwesomeIcon icon={faTimesCircle} className="text-[9px]" />
                                <span>{isAr ? 'رفض' : 'Reject'}</span>
                              </button>
                            )}

                            {/* Store Reply Button */}
                            <button
                              onClick={() => {
                                setReplyingReview(r);
                                setReplyText(r.adminReply || '');
                              }}
                              title={isAr ? 'الرد على التقييم' : 'Reply'}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700/40 hover:bg-indigo-100 transition cursor-pointer"
                            >
                              <FontAwesomeIcon icon={faReply} className="text-[9px]" />
                              <span>{r.adminReply ? (isAr ? 'تعديل الرد' : 'Edit Reply') : (isAr ? 'رد' : 'Reply')}</span>
                            </button>

                            {/* Delete */}
                            <button
                              id={`review-delete-${r.id}`}
                              onClick={() => handleDelete(r.id)}
                              title={t.delete}
                              className="p-1.5 rounded-xl text-[10px] font-bold border bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-700/40 hover:bg-rose-100 transition cursor-pointer"
                            >
                              <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Admin Reply Modal ── */}
      {replyingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-surface)] border theme-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <h3 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <FontAwesomeIcon icon={faReply} className="text-indigo-600" />
                <span>{isAr ? 'الرد على تقييم العميل' : 'Store Reply to Review'}</span>
              </h3>
              <button
                onClick={() => setReplyingReview(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 transition cursor-pointer"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* Original review quote */}
            <div className="p-3 rounded-xl bg-[var(--bg-card)] border theme-border text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--text-primary)]">{replyingReview.authorName}</span>
                <StarDisplay rating={replyingReview.rating} />
              </div>
              <p className="text-[var(--text-secondary)] italic">"{replyingReview.comment}"</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)]">
                {isAr ? 'نص رد المتجر:' : 'Store Reply Text:'}
              </label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                placeholder={isAr ? 'شكراً لتقييمك الرائع! نسعد دائماً بخدمتك...' : 'Thank you for your feedback! We appreciate...'}
                className="w-full px-3.5 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReplyingReview(null)}
                className="px-4 py-2 rounded-xl border theme-border text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveReply}
                disabled={replySaving || !replyText.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition disabled:opacity-50 cursor-pointer"
              >
                <FontAwesomeIcon icon={faPaperPlane} />
                <span>{replySaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ الرد' : 'Save Reply')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

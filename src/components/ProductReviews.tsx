'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faCheckCircle, faComments, faPaperPlane } from '@fortawesome/free-solid-svg-icons';

interface ProductReviewsProps {
  productId: string;
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const { data: session } = useSession();
  const { language } = useSettings();
  const t = translations[language].reviews;

  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form State
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [authorName, setAuthorName] = useState(session?.user?.name || '');
  const [authorEmail, setAuthorEmail] = useState(session?.user?.email || '');
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  useEffect(() => {
    if (session?.user) {
      if (!authorName) setAuthorName(session.user.name || '');
      if (!authorEmail) setAuthorEmail(session.user.email || '');
    }
  }, [session]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reviews?productId=${productId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (err) {
      // Quietly handle fetch error
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !authorName.trim()) return;

    setSubmitting(true);
    setSuccess(false);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          rating,
          authorName,
          authorEmail,
          comment,
        }),
      });

      if (res.ok) {
        // Don't add optimistically — review is pending approval
        setComment('');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 6000);
      }
    } catch (err) {
      // Quietly handle submit error
    } finally {
      setSubmitting(false);
    }
  };

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <div className="pt-10 border-t theme-border space-y-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b theme-border">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-2">
            <FontAwesomeIcon icon={faComments} className="text-indigo-600" />
            <span>{t.title}</span>
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {reviews.length > 0 ? (
              <>
                {t.basedOnReviews} <span className="font-bold text-[var(--text-primary)]">{reviews.length}</span> {t.reviewsCount}
              </>
            ) : (
              t.noReviews
            )}
          </p>
        </div>

        {reviews.length > 0 && (
          <div className="flex items-center gap-3 bg-[var(--bg-card)] px-4 py-2 rounded-2xl border theme-border">
            <span className="text-3xl font-black text-[var(--text-primary)] font-mono">{averageRating.toFixed(1)}</span>
            <div>
              <div className="flex text-amber-400 text-xs">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FontAwesomeIcon
                    key={star}
                    icon={faStar}
                    className={star <= Math.round(averageRating) ? 'text-amber-400' : 'text-gray-300 dark:text-gray-700'}
                  />
                ))}
              </div>
              <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">{reviews.length} {t.reviewsCount}</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Review Submission Form */}
        <div className="lg:col-span-1 glass-card p-6 rounded-3xl border theme-border shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-[var(--text-primary)]">{t.writeReview}</h3>

          {success && (
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-xs flex items-start gap-2">
              <FontAwesomeIcon icon={faCheckCircle} className="mt-0.5 flex-shrink-0" />
              <span>{t.submittedForApproval}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-[var(--text-secondary)] mb-1.5">{t.rating}</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 text-xl transition-transform hover:scale-125 focus:outline-none"
                    >
                      <FontAwesomeIcon
                        icon={faStar}
                        className={filled ? 'text-amber-400' : 'text-gray-300 dark:text-gray-700'}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block font-bold text-[var(--text-secondary)] mb-1">{t.authorName}</label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder={t.namePlaceholder}
                required
                className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm rounded-xl p-3 border theme-border focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-[var(--text-secondary)] mb-1">{t.authorEmail}</label>
              <input
                type="email"
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
                placeholder="example@mail.com"
                className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm rounded-xl p-3 border theme-border focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-[var(--text-secondary)] mb-1">{t.comment}</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder={t.commentPlaceholder}
                required
                className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm rounded-xl p-3 border theme-border focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faPaperPlane} />
              <span>{submitting ? t.submitting : t.submit}</span>
            </button>
          </form>
        </div>

        {/* Reviews List */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">{t.loadingReviews}</div>
          ) : reviews.length === 0 ? (
            <div className="glass-panel p-10 text-center rounded-3xl border theme-border space-y-2 text-xs text-[var(--text-secondary)]">
              <p>{t.noReviews}</p>
            </div>
          ) : (
            reviews.map((rev) => (
              <div key={rev.id} className="glass-card p-5 rounded-2xl border theme-border space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-black text-xs flex items-center justify-center">
                      {rev.authorName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">{rev.authorName}</p>
                      <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                        <FontAwesomeIcon icon={faCheckCircle} />
                        <span>{t.verifiedBuyer}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex text-amber-400 text-xs">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FontAwesomeIcon
                          key={star}
                          icon={faStar}
                          className={star <= rev.rating ? 'text-amber-400' : 'text-gray-300 dark:text-gray-700'}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                      {new Date(rev.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed ps-10">
                  {rev.comment}
                </p>

                {/* Verified Store Staff Reply */}
                {rev.adminReply && (
                  <div className="ms-10 mt-2 p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 text-[11px]">
                      <span>👑</span>
                      <span>{t.adminReplyTitle}</span>
                      {rev.adminRepliedAt && (
                        <span className="text-[10px] text-[var(--text-muted)] font-normal font-mono">
                          • {new Date(rev.adminRepliedAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                        </span>
                      )}
                    </div>
                    <p className="text-[var(--text-primary)] leading-relaxed">
                      {rev.adminReply}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

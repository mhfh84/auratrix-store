'use client';

import React, { useEffect, useRef } from 'react';
import { useDialogStore } from '@/store/useDialogStore';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTriangleExclamation,
  faCircleExclamation,
  faCircleCheck,
  faCircleInfo,
  faTrashCan,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

export default function GlobalDialog() {
  const {
    isOpen,
    type,
    title,
    message,
    confirmText,
    cancelText,
    buttonText,
    variant,
    inputValue,
    placeholder,
    setInputValue,
    handleConfirm,
    handleCancel,
  } = useDialogStore();

  const { language } = useSettings();
  const t = translations[language].dialog;
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on prompt open, or manage keyboard events
  useEffect(() => {
    if (!isOpen) return;

    if (type === 'prompt' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter' && type !== 'prompt') {
        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, type, handleCancel, handleConfirm]);

  if (!isOpen) return null;

  // Icon and Colors by Variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: type === 'confirm' ? faTrashCan : faCircleExclamation,
          badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30',
          glowBg: 'rgba(244, 63, 94, 0.15)',
          confirmBtn: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-rose-600/30',
          defaultTitle: t.confirmDeleteTitle,
          defaultConfirm: t.deleteBtn,
        };
      case 'warning':
        return {
          icon: faTriangleExclamation,
          badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
          glowBg: 'rgba(245, 158, 11, 0.15)',
          confirmBtn: 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-amber-600/30',
          defaultTitle: t.warningTitle,
          defaultConfirm: t.proceedBtn,
        };
      case 'success':
        return {
          icon: faCircleCheck,
          badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          glowBg: 'rgba(16, 185, 129, 0.15)',
          confirmBtn: 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-emerald-600/30',
          defaultTitle: t.successTitle,
          defaultConfirm: t.okBtn,
        };
      case 'info':
      default:
        return {
          icon: faCircleInfo,
          badgeBg: 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
          glowBg: 'rgba(99, 102, 241, 0.15)',
          confirmBtn: 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-indigo-600/30',
          defaultTitle: t.infoTitle,
          defaultConfirm: t.okBtn,
        };
    }
  };

  const vStyles = getVariantStyles();
  const displayTitle = title || vStyles.defaultTitle;
  const displayConfirmText = confirmText || buttonText || vStyles.defaultConfirm;
  const displayCancelText = cancelText || t.cancelBtn;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-message"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Blurred Backdrop */}
      <div
        onClick={handleCancel}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      />

      {/* Dialog Card */}
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-900 dark:text-white transform transition-all animate-in zoom-in-95 fade-in duration-200"
        style={{
          boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 40px ${vStyles.glowBg}`,
        }}
      >
        {/* Close button */}
        <button
          onClick={handleCancel}
          className="absolute top-5 left-5 sm:left-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close dialog"
        >
          <FontAwesomeIcon icon={faXmark} className="text-sm" />
        </button>

        <div className="flex flex-col items-center text-center">
          {/* Glowing Icon Header */}
          <div
            className={`w-16 h-16 rounded-2xl border flex items-center justify-center mb-5 text-2xl shadow-inner ${vStyles.badgeBg}`}
          >
            <FontAwesomeIcon icon={vStyles.icon} />
          </div>

          {/* Title */}
          <h2
            id="dialog-title"
            className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-2.5"
          >
            {displayTitle}
          </h2>

          {/* Message Content */}
          <p
            id="dialog-message"
            className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mb-6 whitespace-pre-line"
          >
            {message}
          </p>

          {/* Input field for prompt dialogs */}
          {type === 'prompt' && (
            <div className="w-full mb-6">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirm();
                  }
                }}
                placeholder={placeholder || t.placeholder}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="w-full flex items-center gap-3">
            {type === 'confirm' || type === 'prompt' ? (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-all active:scale-95"
                >
                  {displayCancelText}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${vStyles.confirmBtn}`}
                >
                  {displayConfirmText}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleConfirm}
                className={`w-full py-3 px-5 rounded-xl font-semibold text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${vStyles.confirmBtn}`}
              >
                {displayConfirmText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

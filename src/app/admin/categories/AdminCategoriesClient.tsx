'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/store/useSettingsStore';
import { useDialog } from '@/store/useDialogStore';
import { translations } from '@/lib/translations';
import { broadcastLocalStoreUpdate } from '@/hooks/useRealtimeSync';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faEdit,
  faTrash,
  faSave,
  faTimes,
  faTag,
  faBoxes,
  faRotateRight,
  faFolder,
  faFolderOpen,
  faTurnDown,
  faSitemap,
  faUpload,
  faLink,
  faImage,
} from '@fortawesome/free-solid-svg-icons';

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  parentId?: string | null;
  parent?: { id: string; name: string; slug: string } | null;
  children?: Array<{
    id: string;
    name: string;
    slug: string;
    image?: string | null;
    parentId?: string | null;
    _count?: { products: number };
  }>;
  _count: { products: number; children?: number };
}

export default function AdminCategoriesClient() {
  const { language } = useSettings();
  const t = translations[language].adminCategories;
  const isRTL = language === 'ar';
  const dialog = useDialog();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({ name: '', parentId: '', image: '' });
  const [imageTab, setImageTab] = useState<'file' | 'url'>('file');

  // Auto-generate slug preview
  const slugPreview = form.name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06ff-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      // Quietly handle fetch error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openModal = (category: Category | null = null, defaultParentId: string = '') => {
    setEditingCategory(category);
    setForm({
      name: category?.name ?? '',
      parentId: category?.parentId ?? defaultParentId,
      image: category?.image ?? '',
    });
    setImageTab(category?.image && !category.image.startsWith('data:') ? 'url' : 'file');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setForm({ name: '', parentId: '', image: '' });
    setErrorMsg('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg(language === 'ar' ? 'حجم الملف كبير جداً (الحد الأقصى 4 ميجابايت)' : 'File size too large (max 4MB)');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        setForm((prev) => ({ ...prev, image: reader.result as string }));
        setErrorMsg('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال اسم الفئة' : 'Please enter a category name');
      return;
    }
    setSaving(true);
    setErrorMsg('');

    const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
    const method = editingCategory ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        parentId: form.parentId ? form.parentId : null,
        image: form.image ? form.image : null,
      }),
    });

    if (res.ok) {
      closeModal();
      fetchCategories();
      broadcastLocalStoreUpdate('categories');
    } else {
      const data = await res.json();
      setErrorMsg(data?.error ?? 'Error saving category');
    }
    setSaving(false);
  };

  const handleDelete = async (category: Category) => {
    const ok = await dialog.confirm({
      title: isRTL ? 'تأكيد حذف الفئة' : 'Confirm Category Delete',
      message: t.deleteConfirm || (isRTL ? `هل أنت متأكد من رغبتك في حذف الفئة "${category.name}"؟` : `Are you sure you want to delete "${category.name}"?`),
      confirmText: isRTL ? 'حذف الفئة' : 'Delete Category',
      cancelText: isRTL ? 'إلغاء' : 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    const res = await fetch(`/api/categories/${category.id}`, { method: 'DELETE' });

    if (res.ok) {
      fetchCategories();
      broadcastLocalStoreUpdate('categories');
    } else {
      const data = await res.json();
      if (data?.error === 'HAS_CHILDREN') {
        await dialog.alert({
          title: isRTL ? 'لا يمكن الحذف' : 'Cannot Delete',
          message: t.deleteHasChildrenBlocked || (isRTL ? 'لا يمكن حذف الفئة لأنها تحتوي على فئات فرعية. يرجى إعادة تعيين الفئات الفرعية أولاً.' : 'Cannot delete category because it contains subcategories. Please reassign them first.'),
          variant: 'warning',
        });
      } else if (data?.error === 'HAS_PRODUCTS') {
        await dialog.alert({
          title: isRTL ? 'لا يمكن الحذف' : 'Cannot Delete',
          message: t.deleteBlocked || (isRTL ? 'لا يمكن حذف الفئة لأنها مرتبطة بمنتجات موجودة.' : 'Cannot delete category linked to active products.'),
          variant: 'warning',
        });
      } else {
        await dialog.alert({
          title: isRTL ? 'خطأ' : 'Error',
          message: language === 'ar' ? 'حدث خطأ أثناء الحذف' : 'Error deleting category',
          variant: 'danger',
        });
      }
    }
  };

  // Helper to get valid parent options for the dropdown (exclude current category & its descendants)
  const getValidParentOptions = () => {
    if (!editingCategory) return categories;

    // Recursive search to get all descendant IDs of the editing category
    const descendantIds = new Set<string>();
    const collectDescendants = (catId: string) => {
      descendantIds.add(catId);
      categories
        .filter((c) => c.parentId === catId)
        .forEach((child) => collectDescendants(child.id));
    };
    collectDescendants(editingCategory.id);

    return categories.filter((c) => !descendantIds.has(c.id));
  };

  // Group categories into parent (father) categories and rootless/standalone categories
  const parentCategories = categories.filter((c) => !c.parentId);
  const childCategoryMap = new Map<string, Category[]>();

  categories.forEach((cat) => {
    if (cat.parentId) {
      const existing = childCategoryMap.get(cat.parentId) || [];
      existing.push(cat);
      childCategoryMap.set(cat.parentId, existing);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[var(--text-primary)]">{t.title}</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/50">
              <FontAwesomeIcon icon={faSitemap} className="me-1" />
              {isRTL ? 'تسلسل هرمي' : 'Hierarchy'}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {language === 'ar'
              ? `${parentCategories.length} فئة رئيسية | ${categories.length - parentCategories.length} فئة فرعية`
              : `${parentCategories.length} Main Categories | ${categories.length - parentCategories.length} Subcategories`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCategories}
            className="p-2.5 bg-[var(--bg-surface)] border theme-border rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition"
            title={language === 'ar' ? 'تحديث' : 'Refresh'}
          >
            <FontAwesomeIcon icon={faRotateRight} className="text-xs" />
          </button>
          <button
            onClick={() => openModal(null)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition"
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>{t.addNew}</span>
          </button>
        </div>
      </div>

      {/* Category Hierarchy List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel rounded-2xl border theme-border p-5 animate-pulse space-y-3">
              <div className="h-5 bg-[var(--bg-card)] rounded-lg w-1/3" />
              <div className="h-4 bg-[var(--bg-card)] rounded-lg w-1/4" />
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="glass-panel rounded-2xl border theme-border p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center mx-auto mb-4">
            <FontAwesomeIcon icon={faTag} className="text-indigo-400 text-2xl" />
          </div>
          <p className="text-sm font-bold text-[var(--text-primary)] mb-1">{t.noCategories}</p>
          <button
            onClick={() => openModal(null)}
            className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition"
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>{t.addNew}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {parentCategories.map((parent) => {
            const children = childCategoryMap.get(parent.id) || [];
            return (
              <div
                key={parent.id}
                className="glass-panel rounded-2xl border theme-border overflow-hidden transition"
              >
                {/* Parent (Father) Header Card */}
                <div className="p-5 bg-gradient-to-r from-indigo-50/50 dark:from-indigo-950/30 via-[var(--bg-surface)] to-[var(--bg-surface)] border-b theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    {parent.image ? (
                      <div className="w-11 h-11 rounded-2xl overflow-hidden flex-shrink-0 border theme-border shadow-md shadow-indigo-600/10 relative bg-gray-100 dark:bg-gray-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={parent.image} alt={parent.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-600/25">
                        <FontAwesomeIcon icon={children.length > 0 ? faFolderOpen : faFolder} className="text-base" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-base text-[var(--text-primary)]">{parent.name}</h3>
                        <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-full border border-indigo-200 dark:border-indigo-700/50">
                          {isRTL ? 'فئة رئيسية' : 'Main Category'}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">/{parent.slug}</p>
                    </div>
                  </div>

                  {/* Stats & Actions */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Products Count */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-primary)] border theme-border rounded-xl">
                      <FontAwesomeIcon icon={faBoxes} className="text-[var(--text-muted)] text-xs" />
                      <span className="text-xs font-bold text-[var(--text-primary)]">{parent._count.products}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {language === 'ar' ? 'منتج' : 'products'}
                      </span>
                    </div>

                    {/* Subcategories Count */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-700/50 rounded-xl">
                      <FontAwesomeIcon icon={faSitemap} className="text-xs" />
                      <span className="text-xs font-bold">{children.length}</span>
                      <span className="text-[10px]">
                        {language === 'ar' ? 'فئة فرعية' : 'subcategories'}
                      </span>
                    </div>

                    {/* Add Subcategory Action */}
                    <button
                      onClick={() => openModal(null, parent.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-700/50 rounded-xl text-xs font-bold transition"
                      title={isRTL ? 'إضافة فئة فرعية' : 'Add Child Category'}
                    >
                      <FontAwesomeIcon icon={faPlus} className="text-xs" />
                      <span>{isRTL ? 'إضافة فرعية' : 'Add Sub'}</span>
                    </button>

                    {/* Edit Parent */}
                    <button
                      onClick={() => openModal(parent)}
                      className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-700/50 text-xs font-bold transition"
                      title={isRTL ? 'تعديل' : 'Edit'}
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>

                    {/* Delete Parent */}
                    <button
                      onClick={() => handleDelete(parent)}
                      className="p-2 rounded-xl bg-red-50 dark:bg-red-950/80 text-red-500 dark:text-red-400 hover:bg-red-100 border border-red-200 dark:border-red-700/50 text-xs font-bold transition"
                      title={isRTL ? 'حذف' : 'Delete'}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>

                {/* Subcategories (Child Categories) nested under father category */}
                {children.length > 0 ? (
                  <div className="p-4 sm:p-5 bg-[var(--bg-primary)]/40 divide-y theme-border">
                    {children.map((child) => (
                      <div
                        key={child.id}
                        className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ps-4 sm:ps-8 border-s-2 border-indigo-500/40 ms-2 sm:ms-4 my-1"
                      >
                        <div className="flex items-center gap-3">
                          <FontAwesomeIcon
                            icon={faTurnDown}
                            className={`text-indigo-400 text-xs ${isRTL ? '-scale-x-100' : ''}`}
                          />
                          {child.image ? (
                            <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 border theme-border shadow-sm bg-gray-100 dark:bg-gray-900">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={child.image} alt={child.name} className="w-full h-full object-cover" />
                            </div>
                          ) : null}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[var(--text-primary)]">{child.name}</span>
                              <span className="text-[10px] px-2 py-0.5 bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-700/50 rounded-md font-medium">
                                {isRTL ? `فرعية من ${parent.name}` : `Child of ${parent.name}`}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--text-muted)] font-mono">/{child.slug}</p>
                          </div>
                        </div>

                        {/* Child Item Badges & Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <div className="flex items-center gap-1 px-2.5 py-1 bg-[var(--bg-surface)] border theme-border rounded-lg text-xs font-semibold text-[var(--text-secondary)]">
                            <FontAwesomeIcon icon={faBoxes} className="text-[var(--text-muted)] text-[10px]" />
                            <span>{child._count.products}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {language === 'ar' ? 'منتج' : 'products'}
                            </span>
                          </div>
                          <button
                            onClick={() => openModal(child)}
                            className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-700/50 text-xs font-bold transition"
                            title={isRTL ? 'تعديل' : 'Edit'}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          <button
                            onClick={() => handleDelete(child)}
                            className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/80 text-red-500 dark:text-red-400 hover:bg-red-100 border border-red-200 dark:border-red-700/50 text-xs font-bold transition"
                            title={isRTL ? 'حذف' : 'Delete'}
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-3 text-[11px] text-[var(--text-muted)] italic">
                    {isRTL ? 'لا توجد فئات فرعية مضافة بعد' : 'No subcategories added under this main category yet'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-surface)] border theme-border rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex justify-between items-center">
              <h2 className="text-base font-extrabold text-[var(--text-primary)]">
                {editingCategory ? t.editTitle : t.addTitle}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* Name Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">{t.nameLabel}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, name: e.target.value }));
                  setErrorMsg('');
                }}
                placeholder={t.namePlaceholder}
                autoFocus
                className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm rounded-xl px-4 py-3 border theme-border focus:outline-none focus:border-indigo-500 placeholder-[var(--text-muted)] transition"
              />
            </div>

            {/* Parent Category Select (Father Category) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                {t.parentCategory || (isRTL ? 'الفئة الرئيسية (الأب)' : 'Parent Category')}
              </label>
              <select
                value={form.parentId}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, parentId: e.target.value }));
                  setErrorMsg('');
                }}
                className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm rounded-xl px-4 py-3 border theme-border focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="">{t.noParent || (isRTL ? 'بدون (فئة رئيسية)' : 'None (Top Level Category)')}</option>
                {getValidParentOptions().map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} {cat.parentId ? `(${isRTL ? 'فرعية' : 'Sub'})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Image */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                  {t.imageLabel || (isRTL ? 'صورة الفئة (اختياري)' : 'Category Image (Optional)')}
                </label>
                {form.image && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, image: '' }))}
                    className="text-[11px] font-bold text-red-500 hover:text-red-600 transition flex items-center gap-1"
                  >
                    <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                    <span>{t.removeImage || (isRTL ? 'إزالة الصورة' : 'Remove Image')}</span>
                  </button>
                )}
              </div>

              {/* Image Input Mode Switcher */}
              <div className="flex bg-[var(--bg-primary)] p-1 rounded-xl border theme-border gap-1">
                <button
                  type="button"
                  onClick={() => setImageTab('file')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    imageTab === 'file'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <FontAwesomeIcon icon={faUpload} className="text-xs" />
                  <span>{t.imageTabFile || (isRTL ? 'رفع ملف' : 'Upload File')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImageTab('url')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    imageTab === 'url'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <FontAwesomeIcon icon={faLink} className="text-xs" />
                  <span>{t.imageTabUrl || (isRTL ? 'رابط مباشر' : 'Direct URL')}</span>
                </button>
              </div>

              {/* File Drop / URL Input */}
              {imageTab === 'file' ? (
                <div className="relative border-2 border-dashed theme-border rounded-xl py-3 px-4 text-center bg-[var(--bg-primary)] hover:border-indigo-400 transition cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center gap-1">
                    <FontAwesomeIcon icon={faUpload} className="text-indigo-500 text-base" />
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      {t.uploadPlaceholder || (isRTL ? 'اضغط أو اسحب الملف لرفعه' : 'Click or drag file to upload')}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {t.uploadFormatNote || (isRTL ? 'PNG, JPG, WebP حتى 4 ميجابايت' : 'PNG, JPG, WebP up to 4MB')}
                    </p>
                  </div>
                </div>
              ) : (
                <input
                  type="url"
                  value={form.image}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, image: e.target.value }));
                    setErrorMsg('');
                  }}
                  placeholder={t.imageUrlPlaceholder || 'https://images.unsplash.com/...'}
                  className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm rounded-xl px-4 py-3 border theme-border focus:outline-none focus:border-indigo-500 placeholder-[var(--text-muted)] transition"
                />
              )}

              {/* Preview Thumbnail */}
              {form.image && (
                <div className="flex items-center gap-3 p-2 bg-[var(--bg-primary)] border theme-border rounded-xl mt-2">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 flex-shrink-0 border theme-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.image} alt="Category preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                      {form.image.startsWith('data:') ? (isRTL ? 'صورة مرفوعة' : 'Uploaded Image File') : form.image}
                    </p>
                    <span className="text-[10px] text-emerald-500 font-semibold">{isRTL ? 'معاينة جاهزة' : 'Ready preview'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Slug Preview */}
            {form.name.trim() && (
              <div className="px-4 py-3 bg-[var(--bg-primary)] border theme-border rounded-xl">
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  {t.slugLabel}
                </p>
                <p className="text-xs font-mono text-indigo-500 dark:text-indigo-400">/{slugPreview || '...'}</p>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="px-4 py-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-700/50 rounded-xl">
                <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{errorMsg}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 bg-[var(--bg-card)] text-[var(--text-secondary)] border theme-border rounded-xl text-xs font-semibold hover:bg-[var(--bg-primary)] transition"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition"
              >
                <FontAwesomeIcon icon={faSave} />
                <span>{saving ? t.saving : t.save}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

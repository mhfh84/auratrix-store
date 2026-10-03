'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSettings, useSettingsStore, defaultStoreSettings, ServerStoreSettings } from '@/store/useSettingsStore';
import { useDialog } from '@/store/useDialogStore';
import { useToastStore } from '@/store/useToastStore';
import { translations } from '@/lib/translations';
import { currencies } from '@/lib/currencies';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSliders,
  faPalette,
  faGlobe,
  faFont,
  faBullhorn,
  faShareNodes,
  faScrewdriverWrench,
  faUndo,
  faCheck,
  faSpinner,
  faEye,
  faCoins,
  faStore,
  faEnvelope,
  faPhone,
  faPercent,
  faTruck,
  faSun,
  faMoon,
  faUpload,
  faLink,
  faTrash,
  faImage,
  faGift,
  faDatabase,
  faCreditCard,
  faMoneyBillWave,
  faBolt,
  faKey,
  faLock,
  faShieldAlt,
  faMobileScreen,
  faSearch,
  faTimes,
  faLayerGroup,
  faBrush,
  faChartLine,
  faGear,
  faChevronRight,
  faChevronLeft,
  faChevronDown,
} from '@fortawesome/free-solid-svg-icons';
import { faFacebook, faInstagram, faTwitter, faTiktok, faWhatsapp } from '@fortawesome/free-brands-svg-icons';

export default function AdminSettingsClient() {
  const { language, serverSettings } = useSettings();
  const { setServerSettings } = useSettingsStore();
  const t = translations[language].adminSettings;

  const [activeTab, setActiveTab] = useState<'general' | 'defaults' | 'payment' | 'shipping' | 'email' | 'loyalty' | 'appearance' | 'typography' | 'announcement' | 'popup' | 'social' | 'maintenance'>('general');
  const [mobileCategory, setMobileCategory] = useState<string>('operations');
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [formData, setFormData] = useState<ServerStoreSettings>(serverSettings || defaultStoreSettings);
  const [logoInputMode, setLogoInputMode] = useState<'upload' | 'url'>('upload');
  const [saving, setSaving] = useState(false);
  const [showCardSecret, setShowCardSecret] = useState(false);
  const [showFawrySecret, setShowFawrySecret] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync form data when serverSettings load
  useEffect(() => {
    if (serverSettings) {
      setFormData(serverSettings);
    }
  }, [serverSettings]);

  // Track whether any setting has been modified
  const hasChanged = useMemo(() => {
    if (!serverSettings) return false;
    return JSON.stringify(formData) !== JSON.stringify(serverSettings);
  }, [formData, serverSettings]);

  const showSaveButton = hasChanged;

  const handleChange = (field: keyof ServerStoreSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const dialog = useDialog();

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      dialog.alert({
        title: language === 'ar' ? 'حجم الملف كبير' : 'File Too Large',
        message: language === 'ar' ? 'حجم ملف الشعار كبير جداً (الحد الأقصى 4 ميجابايت)' : 'Logo file size too large (max 4MB)',
        variant: 'warning',
      });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        handleChange('storeLogo', reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const isRTL = language === 'ar';

  const handleSave = async (eOrSettings?: React.FormEvent | ServerStoreSettings) => {
    if (eOrSettings && typeof (eOrSettings as any).preventDefault === 'function') {
      (eOrSettings as React.FormEvent).preventDefault();
    }
    const settingsToSave = eOrSettings && !('preventDefault' in eOrSettings) ? (eOrSettings as ServerStoreSettings) : formData;

    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.errorMsg);
      }

      const updated = await res.json();
      setFormData(updated);
      setServerSettings(updated);

      // Sync across all browser tabs via broadcast and same-tab event
      if (typeof window !== 'undefined') {
        if ('BroadcastChannel' in window) {
          try {
            const channel = new BroadcastChannel('auratrix-settings-sync');
            channel.postMessage({ type: 'SETTINGS_UPDATED', settings: updated });
            channel.close();
          } catch (bcError) {
            // Ignore BroadcastChannel errors
          }
        }
        window.dispatchEvent(new CustomEvent('auratrix-settings-updated', { detail: updated }));
      }

      setSuccessMsg(t.successMsg);
      useToastStore.getState().success(isRTL ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      const msg = err.message || t.errorMsg;
      setErrorMsg(msg);
      useToastStore.getState().error(msg);
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleResetColors = () => {
    setFormData((prev) => ({
      ...prev,
      lightBgPrimary: defaultStoreSettings.lightBgPrimary,
      lightBgSurface: defaultStoreSettings.lightBgSurface,
      lightTextPrimary: defaultStoreSettings.lightTextPrimary,
      lightTextSecondary: defaultStoreSettings.lightTextSecondary,
      lightAccentColor: defaultStoreSettings.lightAccentColor,
      darkBgPrimary: defaultStoreSettings.darkBgPrimary,
      darkBgSurface: defaultStoreSettings.darkBgSurface,
      darkTextPrimary: defaultStoreSettings.darkTextPrimary,
      darkTextSecondary: defaultStoreSettings.darkTextSecondary,
      darkAccentColor: defaultStoreSettings.darkAccentColor,
    }));
  };

  const [searchQuery, setSearchQuery] = useState('');

  type SettingTabId = 'general' | 'defaults' | 'payment' | 'shipping' | 'email' | 'loyalty' | 'appearance' | 'typography' | 'announcement' | 'popup' | 'social' | 'maintenance';

  interface TabItem {
    id: SettingTabId;
    label: string;
    desc: string;
    icon: any;
    activeIndicator?: boolean;
    indicatorColor?: string;
  }

  interface TabGroup {
    id: string;
    title: string;
    icon: any;
    badge?: string;
    tabs: TabItem[];
  }

  const tabGroups: TabGroup[] = useMemo(() => [
    {
      id: 'operations',
      title: isRTL ? 'المتجر والعمليات' : 'Store & Operations',
      icon: faLayerGroup,
      badge: isRTL ? 'الأساسيات' : 'Core',
      tabs: [
        {
          id: 'general' as const,
          label: t.tabGeneral,
          desc: isRTL ? 'اسم المتجر، الشعار وبيانات الهوية' : 'Store name, logo & identity profile',
          icon: faStore,
        },
        {
          id: 'defaults' as const,
          label: t.tabDefaults,
          desc: isRTL ? 'العملة واللغة الافتراضية للزوار' : 'Default currency, language & region',
          icon: faGlobe,
        },
        {
          id: 'payment' as const,
          label: t.tabPayment || (isRTL ? 'طرق وبوابات الدفع' : 'Payment & Gateways'),
          desc: isRTL ? 'الدفع عند الاستلام، إنستاباي، والبطاقات' : 'COD, Instapay, Fawry & Card gateways',
          icon: faCreditCard,
          activeIndicator: Boolean(formData.paymentCodEnabled || formData.paymentInstapayEnabled || formData.paymentCardEnabled || formData.paymentFawryEnabled || formData.paymentWalletsEnabled),
        },
        {
          id: 'shipping' as const,
          label: t.tabShipping || (isRTL ? 'الشحن والتتبع' : 'Shipping & Tracking'),
          desc: isRTL ? 'رسوم الشحن وتكامل شركات التوصيل' : 'Shipping fees & courier tracking',
          icon: faTruck,
          activeIndicator: formData.courierTrackingEnabled,
        },
      ],
    },
    {
      id: 'design',
      title: isRTL ? 'الهوية والتصميم' : 'Design & Theme',
      icon: faBrush,
      tabs: [
        {
          id: 'appearance' as const,
          label: t.tabAppearance,
          desc: isRTL ? 'ألوان الوضع الليلي والنهاري والتمييز' : 'Light/Dark palette & accent colors',
          icon: faPalette,
        },
        {
          id: 'typography' as const,
          label: t.tabTypography,
          desc: isRTL ? 'عائلة الخطوط العربية والإنجليزية وأحجامها' : 'Fonts family & typography scaling',
          icon: faFont,
        },
      ],
    },
    {
      id: 'marketing',
      title: isRTL ? 'التسويق والتفاعل' : 'Marketing & Engagement',
      icon: faChartLine,
      tabs: [
        {
          id: 'announcement' as const,
          label: t.tabAnnouncement,
          desc: isRTL ? 'الشريط الترويجي العلوي أعلى المتجر' : 'Top promotional banner bar',
          icon: faBullhorn,
          activeIndicator: formData.announcementEnabled,
        },
        {
          id: 'popup' as const,
          label: isRTL ? 'نافذة الترحيب والهدية' : 'Welcome Popup & Promo',
          desc: isRTL ? 'نافذة العرض الترويجي وكود الخصم للزوار' : 'First-visit promo modal & discount code',
          icon: faGift,
          activeIndicator: formData.popupEnabled,
        },
        {
          id: 'loyalty' as const,
          label: isRTL ? 'نقاط الولاء والمكافآت' : 'Loyalty Rewards',
          desc: isRTL ? 'برنامج مكافآت العملاء واستبدال النقاط' : 'Customer point earning & redemption system',
          icon: faCoins,
          activeIndicator: formData.loyaltyEnabled,
        },
        {
          id: 'social' as const,
          label: t.tabContactSocial,
          desc: isRTL ? 'البريد، الهاتف، وروابط التواصل' : 'Contact channels & social media links',
          icon: faShareNodes,
        },
      ],
    },
    {
      id: 'system',
      title: isRTL ? 'النظام والصيانة' : 'System & Maintenance',
      icon: faGear,
      tabs: [
        {
          id: 'email' as const,
          label: isRTL ? 'إشعارات البريد' : 'Email Notifications',
          desc: isRTL ? 'إعدادات مزود البريد Resend وتنبيهات الطلبات' : 'Resend integration & order alerts',
          icon: faEnvelope,
          activeIndicator: formData.emailNotificationsEnabled,
        },
        {
          id: 'maintenance' as const,
          label: t.tabMaintenance,
          desc: isRTL ? 'تفعيل شاشة الصيانة والرسالة المؤقتة' : 'Store lockdown & under-maintenance screen',
          icon: faScrewdriverWrench,
          activeIndicator: formData.maintenanceMode,
          indicatorColor: 'rose',
        },
      ],
    },
  ], [formData, isRTL, t]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return tabGroups;
    const query = searchQuery.toLowerCase().trim();
    return tabGroups
      .map((group) => {
        const matchingTabs = group.tabs.filter(
          (t) =>
            t.label.toLowerCase().includes(query) ||
            t.desc.toLowerCase().includes(query) ||
            group.title.toLowerCase().includes(query)
        );
        return { ...group, tabs: matchingTabs };
      })
      .filter((group) => group.tabs.length > 0);
  }, [tabGroups, searchQuery]);

  const currentTabInfo = useMemo(() => {
    for (const group of tabGroups) {
      const found = group.tabs.find((t) => t.id === activeTab);
      if (found) return { ...found, groupTitle: group.title, groupIcon: group.icon };
    }
    return null;
  }, [tabGroups, activeTab]);

  const renderLivePreview = () => (
    <div className="glass-panel p-4 sm:p-5 rounded-2xl border theme-border shadow-md space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-[var(--text-primary)] flex items-center gap-2">
          <FontAwesomeIcon icon={faEye} className="text-indigo-600 dark:text-indigo-400" />
          <span>{t.livePreview}</span>
        </h3>
        {mobilePreviewOpen && (
          <button
            type="button"
            onClick={() => setMobilePreviewOpen(false)}
            className="xl:hidden text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-card)] transition"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        )}
      </div>

      {/* Live Mock Phone / Screen Box */}
      <div
        className="rounded-2xl p-4 border transition-all duration-300 space-y-3 text-start shadow-inner overflow-hidden"
        style={{
          backgroundColor: formData.defaultTheme === 'dark' ? formData.darkBgPrimary : formData.lightBgPrimary,
          color: formData.defaultTheme === 'dark' ? formData.darkTextPrimary : formData.lightTextPrimary,
          borderColor: 'rgba(99, 102, 241, 0.3)',
        }}
      >
        {/* Mock Announcement Bar */}
        {formData.announcementEnabled && (
          <div className="text-[10px] font-bold p-1.5 text-center text-white rounded-lg bg-indigo-600 truncate">
            {formData.announcementText}
          </div>
        )}

        {/* Mock Store Header */}
        <div
          className="p-3 rounded-xl border flex items-center justify-between"
          style={{
            backgroundColor: formData.defaultTheme === 'dark' ? formData.darkBgSurface : formData.lightBgSurface,
            color: formData.defaultTheme === 'dark' ? formData.darkTextPrimary : formData.lightTextPrimary,
          }}
        >
          {formData.storeLogo ? (
            <img src={formData.storeLogo} alt="Logo" className="h-6 object-contain" />
          ) : (
            <span className="text-xs font-black truncate max-w-[140px]">{formData.storeName}</span>
          )}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-indigo-600">
            {formData.defaultCurrency}
          </span>
        </div>

        {/* Mock Product Card */}
        <div
          className="p-4 rounded-xl border space-y-2 shadow-sm"
          style={{
            backgroundColor: formData.defaultTheme === 'dark' ? formData.darkBgSurface : formData.lightBgSurface,
            color: formData.defaultTheme === 'dark' ? formData.darkTextPrimary : formData.lightTextPrimary,
          }}
        >
          <div className="h-24 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold">
            Product Image Preview
          </div>
          <div className="text-xs font-bold">{formData.storeName ? `${formData.storeName} Item` : 'Premium Product'}</div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-extrabold text-indigo-600">$199.00</span>
            <button
              type="button"
              style={{
                backgroundColor: formData.defaultTheme === 'dark' ? formData.darkAccentColor : formData.lightAccentColor,
              }}
              className="text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm"
            >
              Add to Cart
            </button>
          </div>
        </div>

        {/* Preview Footer / Specs */}
        <div className="text-[10px] opacity-70 flex justify-between pt-1 font-mono">
          <span>Lang: {formData.defaultLanguage.toUpperCase()}</span>
          <span>Font: {formData.fontFamily}</span>
          <span>Size: {formData.fontSize}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-panel p-4 sm:p-6 rounded-2xl border theme-border shadow-sm">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-[var(--text-primary)] flex items-center gap-2.5">
            <FontAwesomeIcon icon={faSliders} className="text-indigo-600 dark:text-indigo-400" />
            <span>{t.title}</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mobile Live Preview Button */}
          <button
            type="button"
            onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
            className={`xl:hidden flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl border text-xs font-bold transition shadow-sm cursor-pointer ${
              mobilePreviewOpen
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/25'
                : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-theme hover:bg-[var(--bg-card)]'
            }`}
            title={isRTL ? 'معاينة مظهر المتجر' : 'Live Storefront Preview'}
          >
            <FontAwesomeIcon icon={faEye} />
            <span>{isRTL ? 'معاينة' : 'Preview'}</span>
          </button>

          <Link
            href="/admin/backup"
            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-300 font-bold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900 transition shadow-sm"
          >
            <FontAwesomeIcon icon={faDatabase} />
            <span className="hidden sm:inline">{isRTL ? 'النسخ الاحتياطي' : 'Backup'}</span>
            <span className="sm:hidden">{isRTL ? 'نسخ احتياطي' : 'Backup'}</span>
          </Link>

          {showSaveButton && (
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50 animate-fade-in"
            >
              {saving ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  <span>{t.saving}</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheck} />
                  <span>{t.saveChanges}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Live Preview Drawer / Accordion (Visible when toggled on < xl screens) */}
      {mobilePreviewOpen && (
        <div className="xl:hidden animate-in slide-in-from-top-4 duration-200">
          {renderLivePreview()}
        </div>
      )}

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <FontAwesomeIcon icon={faCheck} className="text-sm" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-700/50 text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Mobile Dedicated Tabs Bar (< lg screens) */}
      <div className="lg:hidden space-y-3 glass-panel p-3.5 sm:p-4 rounded-2xl border theme-border shadow-xs">
        {/* Mobile Search & Direct Jump Select */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Quick Search */}
          <div className="relative">
            <FontAwesomeIcon
              icon={faSearch}
              className={`absolute top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)] pointer-events-none ${
                isRTL ? 'right-3' : 'left-3'
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRTL ? 'بحث سريع في الإعدادات...' : 'Search settings...'}
              className={`w-full py-2 rounded-xl border theme-border bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                isRTL ? 'pr-8 pl-7' : 'pl-8 pr-7'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 ${
                  isRTL ? 'left-2' : 'right-2'
                }`}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            )}
          </div>

          {/* Quick Tab Dropdown */}
          <div className="relative">
            <select
              value={activeTab}
              onChange={(e) => {
                const newTab = e.target.value as SettingTabId;
                setActiveTab(newTab);
                const parentGroup = tabGroups.find((g) => g.tabs.some((t) => t.id === newTab));
                if (parentGroup) setMobileCategory(parentGroup.id);
              }}
              className="w-full py-2 px-3 rounded-xl border theme-border bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none cursor-pointer"
            >
              {tabGroups.map((group) => (
                <optgroup key={group.id} label={group.title}>
                  {group.tabs.map((tab) => (
                    <option key={tab.id} value={tab.id}>
                      {tab.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className={`absolute top-1/2 -translate-y-1/2 pointer-events-none text-xs text-[var(--text-secondary)] ${isRTL ? 'left-3' : 'right-3'}`}>
              <FontAwesomeIcon icon={faChevronDown} />
            </div>
          </div>
        </div>

        {/* Horizontal Category Segment Pills */}
        {!searchQuery && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 pt-1">
            {tabGroups.map((group) => {
              const isGroupActive = group.tabs.some((t) => t.id === activeTab);
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    setMobileCategory(group.id);
                    if (!group.tabs.some((t) => t.id === activeTab)) {
                      setActiveTab(group.tabs[0].id);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                    isGroupActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border theme-border hover:text-[var(--text-primary)]'
                  }`}
                >
                  <FontAwesomeIcon icon={group.icon} className="text-[10px]" />
                  <span>{group.title}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Horizontal Sub-Tabs List Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          {(searchQuery
            ? filteredGroups.flatMap((g) => g.tabs)
            : (tabGroups.find((g) => g.tabs.some((t) => t.id === activeTab))?.tabs || [])
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] border-2 border-indigo-600 dark:border-indigo-400 shadow-sm font-black'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border theme-border hover:bg-[var(--bg-card)]'
                }`}
              >
                <FontAwesomeIcon icon={tab.icon} className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-muted)]'} />
                <span>{tab.label}</span>
                {tab.activeIndicator !== undefined && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      tab.activeIndicator
                        ? (tab as any).indicatorColor === 'rose'
                          ? 'bg-rose-500'
                          : 'bg-emerald-400'
                        : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Settings Navigation & Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Vertical Navigation Sidebar (Desktop only) */}
        <div className="hidden lg:block lg:col-span-4 xl:col-span-3 space-y-4 lg:sticky lg:top-24">
          {/* Quick Search Box */}
          <div className="relative">
            <FontAwesomeIcon
              icon={faSearch}
              className={`absolute top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)] pointer-events-none ${
                isRTL ? 'right-3.5' : 'left-3.5'
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRTL ? 'بحث سريع في الإعدادات...' : 'Quick search settings...'}
              className={`w-full py-2.5 rounded-2xl border theme-border bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs ${
                isRTL ? 'pr-9 pl-8' : 'pl-9 pr-8'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 ${
                  isRTL ? 'left-2.5' : 'right-2.5'
                }`}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            )}
          </div>

          {/* Grouped Accordion / Category Cards */}
          <div className="space-y-3">
            {filteredGroups.length === 0 ? (
              <div className="p-6 text-center rounded-2xl border theme-border bg-[var(--bg-surface)] text-xs text-[var(--text-secondary)]">
                {isRTL ? 'لم يتم العثور على نتائج مطابقة للبحث' : 'No settings matching your search'}
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className="rounded-2xl border theme-border bg-[var(--bg-surface)]/80 backdrop-blur-md overflow-hidden shadow-xs"
                >
                  {/* Category Header */}
                  <div className="px-3.5 py-2.5 bg-[var(--bg-primary)]/50 border-b theme-border flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-black text-[var(--text-primary)]">
                      <FontAwesomeIcon icon={group.icon} className="text-indigo-600 dark:text-indigo-400 text-xs" />
                      <span>{group.title}</span>
                    </div>
                    {group.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {group.badge}
                      </span>
                    )}
                  </div>

                  {/* Category Items */}
                  <div className="p-1.5 space-y-1">
                    {group.tabs.map((tab) => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(tab.id as any);
                          }}
                          className={`w-full p-2.5 rounded-xl text-start transition flex items-center justify-between gap-2.5 group cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-1 ring-indigo-400/50'
                              : 'text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold transition ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                              }`}
                            >
                              <FontAwesomeIcon icon={tab.icon} />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                                {tab.label}
                              </p>
                              <p
                                className={`text-[10px] truncate ${
                                  isActive ? 'text-indigo-100' : 'text-[var(--text-secondary)]'
                                }`}
                              >
                                {tab.desc}
                              </p>
                            </div>
                          </div>

                          {/* Status Indicator / Arrow */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {tab.activeIndicator !== undefined && (
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  tab.activeIndicator
                                    ? (tab as any).indicatorColor === 'rose'
                                      ? 'bg-rose-500 ring-2 ring-rose-300'
                                      : 'bg-emerald-400 ring-2 ring-emerald-300'
                                    : 'bg-gray-300 dark:bg-gray-700'
                                }`}
                                title={tab.activeIndicator ? (isRTL ? 'مفعّل' : 'Active') : (isRTL ? 'غير مفعّل' : 'Disabled')}
                              />
                            )}
                            <FontAwesomeIcon
                              icon={isRTL ? faChevronLeft : faChevronRight}
                              className={`text-[10px] opacity-40 transition group-hover:opacity-100 group-hover:translate-x-0.5 ${
                                isActive ? 'text-white opacity-80' : 'text-[var(--text-secondary)]'
                              }`}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center / Form Settings Panel */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-6 space-y-4 sm:space-y-6">
          {/* Active Tab Breadcrumb & Title Banner */}
          {currentTabInfo && (
            <div className="p-3.5 sm:p-5 rounded-2xl glass-panel border theme-border flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm sm:text-base shadow-md shadow-indigo-600/25 flex-shrink-0">
                  <FontAwesomeIcon icon={currentTabInfo.icon} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    <span className="truncate max-w-[120px] sm:max-w-none">{currentTabInfo.groupTitle}</span>
                    <FontAwesomeIcon icon={isRTL ? faChevronLeft : faChevronRight} className="text-[7px] sm:text-[8px]" />
                    <span className="text-indigo-600 dark:text-indigo-400 font-extrabold truncate max-w-[140px] sm:max-w-none">{currentTabInfo.label}</span>
                  </div>
                  <h2 className="text-xs sm:text-base font-black text-[var(--text-primary)] mt-0.5 truncate">
                    {currentTabInfo.label}
                  </h2>
                </div>
              </div>

              {showSaveButton && (
                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-indigo-600/30 flex-shrink-0"
                >
                  {saving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faCheck} />}
                  <span>{isRTL ? 'حفظ' : 'Save'}</span>
                </button>
              )}
            </div>
          )}

          {/* Tab Content Box */}
          <form onSubmit={handleSave} className="glass-panel p-4 sm:p-6 md:p-8 rounded-2xl border theme-border shadow-sm space-y-5 sm:space-y-6">
            {/* TAB 1: General Identity */}
            {activeTab === 'general' && (
              <div className="space-y-5 animate-fade-in">
                <h2 className="text-sm font-extrabold text-[var(--text-primary)] border-b theme-border pb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faStore} className="text-indigo-600" />
                  <span>{t.tabGeneral}</span>
                </h2>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">{t.storeName}</label>
                  <input
                    type="text"
                    value={formData.storeName}
                    onChange={(e) => handleChange('storeName', e.target.value)}
                    placeholder={t.storeNamePlaceholder}
                    className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-3 pt-2 border-t theme-border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <FontAwesomeIcon icon={faImage} className="text-indigo-600" />
                      <span>{t.storeLogo}</span>
                    </label>
                    {formData.storeLogo && (
                      <button
                        type="button"
                        onClick={() => handleChange('storeLogo', '')}
                        className="text-[11px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                        <span>{t.removeLogo}</span>
                      </button>
                    )}
                  </div>

                  {/* Input Mode Switcher: Upload File vs Direct URL */}
                  <div className="flex items-center gap-2 p-1 bg-[var(--bg-surface)] border theme-border rounded-xl w-full sm:w-fit">
                    <button
                      type="button"
                      onClick={() => setLogoInputMode('upload')}
                      className={`flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        logoInputMode === 'upload'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <FontAwesomeIcon icon={faUpload} />
                      <span>{t.logoTabUpload}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoInputMode('url')}
                      className={`flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        logoInputMode === 'url'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <FontAwesomeIcon icon={faLink} />
                      <span>{t.logoTabUrl}</span>
                    </button>
                  </div>

                  {/* Upload File Input */}
                  {logoInputMode === 'upload' ? (
                    <div className="border-2 border-dashed theme-border hover:border-indigo-400 rounded-2xl p-6 text-center bg-[var(--bg-surface)] transition cursor-pointer relative group">
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp, image/svg+xml"
                        onChange={handleLogoFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="space-y-2 pointer-events-none">
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                          <FontAwesomeIcon icon={faUpload} />
                        </div>
                        <p className="text-xs font-bold text-[var(--text-primary)]">{t.logoUploadPlaceholder}</p>
                        <p className="text-[10px] text-[var(--text-secondary)]">{t.logoUploadFormatNote}</p>
                      </div>
                    </div>
                  ) : (
                    /* Direct URL Input */
                    <div className="space-y-1.5">
                      <input
                        type="url"
                        value={formData.storeLogo}
                        onChange={(e) => handleChange('storeLogo', e.target.value)}
                        placeholder={t.storeLogoPlaceholder}
                        className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Current Logo Preview */}
                  {formData.storeLogo && (
                    <div className="p-3 rounded-xl border theme-border bg-[var(--bg-surface)] space-y-2">
                      <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{t.logoPreview}</p>
                      <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-lg flex items-center justify-center max-h-24">
                        <img src={formData.storeLogo} alt="Store Logo Preview" className="max-h-20 object-contain" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}



            {/* TAB 2: Defaults & Currency */}
            {activeTab === 'defaults' && (
              <div className="space-y-6 animate-fade-in">
                <h2 className="text-sm font-extrabold text-[var(--text-primary)] border-b theme-border pb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faGlobe} className="text-indigo-600" />
                  <span>{t.tabDefaults}</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Default Language */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-primary)]">{t.defaultLanguage}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleChange('defaultLanguage', 'ar')}
                        className={`p-3 rounded-xl border text-center text-xs font-bold transition ${
                          formData.defaultLanguage === 'ar'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                            : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-theme hover:bg-[var(--bg-card)]'
                        }`}
                      >
                        العربية (Arabic)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange('defaultLanguage', 'en')}
                        className={`p-3 rounded-xl border text-center text-xs font-bold transition ${
                          formData.defaultLanguage === 'en'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                            : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-theme hover:bg-[var(--bg-card)]'
                        }`}
                      >
                        English
                      </button>
                    </div>
                  </div>

                  {/* Default Theme */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-primary)]">{t.defaultTheme}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleChange('defaultTheme', 'light')}
                        className={`p-3 rounded-xl border text-center text-xs font-bold transition flex items-center justify-center gap-2 ${
                          formData.defaultTheme === 'light'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                            : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-theme hover:bg-[var(--bg-card)]'
                        }`}
                      >
                        <FontAwesomeIcon icon={faSun} />
                        <span>{language === 'ar' ? 'الوضع الفاتح' : 'Light Mode'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange('defaultTheme', 'dark')}
                        className={`p-3 rounded-xl border text-center text-xs font-bold transition flex items-center justify-center gap-2 ${
                          formData.defaultTheme === 'dark'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                            : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-theme hover:bg-[var(--bg-card)]'
                        }`}
                      >
                        <FontAwesomeIcon icon={faMoon} />
                        <span>{language === 'ar' ? 'الوضع الداكن' : 'Dark Mode'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Default Currency Grid */}
                <div className="space-y-3 pt-4 border-t theme-border">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <FontAwesomeIcon icon={faCoins} className="text-amber-500" />
                    <span>{t.defaultCurrency}</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.values(currencies).map((curr) => {
                      const isSelected = formData.defaultCurrency === curr.code;
                      return (
                        <button
                          key={curr.code}
                          type="button"
                          onClick={() => handleChange('defaultCurrency', curr.code)}
                          className={`p-3 rounded-xl border text-start transition ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25 ring-2 ring-indigo-400/50'
                              : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-indigo-400'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase">{curr.code}</span>
                            <span className="text-xs font-bold">{language === 'ar' ? curr.symbolAr : curr.symbol}</span>
                          </div>
                          <span className={`text-[10px] mt-1 block truncate ${isSelected ? 'text-indigo-100' : 'text-[var(--text-secondary)]'}`}>
                            {language === 'ar' ? curr.nameAr : curr.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Payment Methods & Gateways */}
            {activeTab === 'payment' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b theme-border pb-3">
                  <div>
                    <h2 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                      <FontAwesomeIcon icon={faCreditCard} className="text-indigo-600" />
                      <span>{isRTL ? 'إعدادات طرق وبوابات الدفع الإلكتروني' : 'Payment Methods & Gateways Configuration'}</span>
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {isRTL
                        ? 'التحكم في تفعيل أو تعطيل خيارات الدفع لعملائك، وتكوين بوابات الدفع بالبطاقات وإنستاباي وفوري والمحافظ الإلكترونية'
                        : 'Enable or disable checkout payment methods, set up online card gateways, Instapay, Fawry, and mobile wallets'}
                    </p>
                  </div>
                </div>

                {/* 1. Cash on Delivery (COD) */}
                <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border theme-border space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base border border-emerald-200 dark:border-emerald-800/40">
                        <FontAwesomeIcon icon={faMoneyBillWave} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-xs text-[var(--text-primary)]">
                          {isRTL ? 'الدفع عند الاستلام (Cash on Delivery)' : 'Cash on Delivery (COD)'}
                        </h3>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          {isRTL ? 'إتاحة خيار دفع العميل نقداً للمندوب وقت استلام الشحنة' : 'Allow customers to pay in cash upon package delivery'}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleChange('paymentCodEnabled', !(formData.paymentCodEnabled ?? true))}
                      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                        (formData.paymentCodEnabled ?? true) ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                          (formData.paymentCodEnabled ?? true) ? (isRTL ? 'right-1' : 'left-6') : (isRTL ? 'right-6' : 'left-1')
                        }`}
                      />
                    </button>
                  </div>

                  {(formData.paymentCodEnabled ?? true) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t theme-border animate-fade-in">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[var(--text-primary)]">
                          {isRTL ? 'رسوم إضافية لخدمة الدفع عند الاستلام (اختياري)' : 'COD Extra Handling Fee (Optional)'}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={formData.paymentCodExtraFee ?? 0}
                            onChange={(e) => handleChange('paymentCodExtraFee', parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                          <span className="text-xs font-bold text-[var(--text-secondary)]">{formData.defaultCurrency}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[var(--text-primary)]">
                          {isRTL ? 'ملاحظات / تعليمات تظهر للعميل' : 'Customer Guidance Note'}
                        </label>
                        <input
                          type="text"
                          value={formData.paymentCodInstructions || ''}
                          onChange={(e) => handleChange('paymentCodInstructions', e.target.value)}
                          placeholder={isRTL ? 'الدفع نقداً للمندوب عند استلام الشحنة' : 'Pay cash to courier upon delivery'}
                          className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Instapay (إنستاباي) */}
                <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border theme-border space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-base border border-purple-200 dark:border-purple-800/40">
                        <FontAwesomeIcon icon={faBolt} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-xs text-[var(--text-primary)]">
                            {isRTL ? 'إنستاباي (Instapay - التحويل الفوري)' : 'Instapay Instant Transfer'}
                          </h3>
                          <span className="text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5 rounded font-bold">
                            {isRTL ? 'إيصال تحويل' : 'Proof Upload'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          {isRTL ? 'استقبال التحويلات البنكية الفورية عبر معرّف إنستاباي مع رفع إيصال الدفع' : 'Accept instant bank transfers via Instapay IPA with customer proof screenshot'}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleChange('paymentInstapayEnabled', !(formData.paymentInstapayEnabled ?? true))}
                      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                        (formData.paymentInstapayEnabled ?? true) ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                          (formData.paymentInstapayEnabled ?? true) ? (isRTL ? 'right-1' : 'left-6') : (isRTL ? 'right-6' : 'left-1')
                        }`}
                      />
                    </button>
                  </div>

                  {(formData.paymentInstapayEnabled ?? true) && (
                    <div className="space-y-4 pt-3 border-t theme-border animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[var(--text-primary)]">
                            {isRTL ? 'معرّف حساب إنستاباي (IPA / Username) *' : 'Instapay IPA Address *'}
                          </label>
                          <input
                            type="text"
                            value={formData.paymentInstapayAddress || ''}
                            onChange={(e) => handleChange('paymentInstapayAddress', e.target.value)}
                            placeholder="username@instapay"
                            className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-purple-600 dark:text-purple-400 font-mono font-bold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[var(--text-primary)]">
                            {isRTL ? 'اسم صاحب الحساب أو رقم الهاتف المربوط' : 'Account Name / Linked Phone'}
                          </label>
                          <input
                            type="text"
                            value={formData.paymentInstapayPhone || ''}
                            onChange={(e) => handleChange('paymentInstapayPhone', e.target.value)}
                            placeholder={isRTL ? '+201000000000 أو اسم الحساب' : '+201000000000 or Account Name'}
                            className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[var(--text-primary)]">
                          {isRTL ? 'تعليمات التحويل للعميل' : 'Customer Transfer Instructions'}
                        </label>
                        <textarea
                          rows={2}
                          value={formData.paymentInstapayInstructions || ''}
                          onChange={(e) => handleChange('paymentInstapayInstructions', e.target.value)}
                          placeholder={isRTL ? 'يرجى تحويل المبلغ بدقة وإرفاق لقطة شاشة واضحة من تطبيق إنستاباي' : 'Please transfer the exact amount and upload a clear screenshot from the Instapay app'}
                          className="w-full px-4 py-2 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Fawry / FawryPay (فوري) */}
                <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border theme-border space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-base border border-amber-200 dark:border-amber-800/40">
                        <FontAwesomeIcon icon={faCoins} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-xs text-[var(--text-primary)]">
                          {isRTL ? 'شبكة فوري (Fawry / FawryPay)' : 'Fawry Network Payments'}
                        </h3>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          {isRTL ? 'إصدار كود دفع مرجعي عبر شبكة فوري ومنافذ البيع بالتجزئة' : 'Generate reference payment codes for retail outlets and FawryPay app'}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleChange('paymentFawryEnabled', !(formData.paymentFawryEnabled ?? true))}
                      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                        (formData.paymentFawryEnabled ?? true) ? 'bg-amber-600' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                          (formData.paymentFawryEnabled ?? true) ? (isRTL ? 'right-1' : 'left-6') : (isRTL ? 'right-6' : 'left-1')
                        }`}
                      />
                    </button>
                  </div>

                  {(formData.paymentFawryEnabled ?? true) && (
                    <div className="space-y-4 pt-3 border-t theme-border animate-fade-in">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <div>
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                            {isRTL ? 'وضع الاختبار (Sandbox / Test Mode)' : 'Sandbox / Test Mode'}
                          </p>
                          <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80">
                            {isRTL ? 'تفعيل وضع الاختبار دون خصم مبالغ حقيقية' : 'Test Fawry checkout flows without live financial charges'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleChange('paymentFawryTestMode', !(formData.paymentFawryTestMode ?? true))}
                          className={`relative w-10 h-5 rounded-full transition-colors ${
                            (formData.paymentFawryTestMode ?? true) ? 'bg-amber-600' : 'bg-gray-300 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                              (formData.paymentFawryTestMode ?? true) ? (isRTL ? 'right-0.5' : 'left-5') : (isRTL ? 'right-5' : 'left-0.5')
                            }`}
                          />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[var(--text-primary)]">
                            {isRTL ? 'كود التاجر (Merchant Code)' : 'Fawry Merchant Code'}
                          </label>
                          <input
                            type="text"
                            value={formData.paymentFawryMerchantCode || ''}
                            onChange={(e) => handleChange('paymentFawryMerchantCode', e.target.value)}
                            placeholder="e.g. 770000000000"
                            className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                            <span>{isRTL ? 'مفتاح الحماية السري (Security Key / Secret)' : 'Fawry Security Key'}</span>
                            <button
                              type="button"
                              onClick={() => setShowFawrySecret(!showFawrySecret)}
                              className="text-[10px] text-indigo-600 hover:underline"
                            >
                              {showFawrySecret ? (isRTL ? 'إخفاء' : 'Hide') : (isRTL ? 'إظهار' : 'Show')}
                            </button>
                          </label>
                          <input
                            type={showFawrySecret ? 'text' : 'password'}
                            value={formData.paymentFawrySecurityKey || ''}
                            onChange={(e) => handleChange('paymentFawrySecurityKey', e.target.value)}
                            placeholder="••••••••••••••••"
                            className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[var(--text-primary)]">
                          {isRTL ? 'إرشادات الدفع للعميل' : 'Customer Guidance Instructions'}
                        </label>
                        <input
                          type="text"
                          value={formData.paymentFawryInstructions || ''}
                          onChange={(e) => handleChange('paymentFawryInstructions', e.target.value)}
                          placeholder={isRTL ? 'سيتم تزويدك برقم كود الدفع المرجعي بعد تأكيد الطلب للدفع خلال 24 ساعة' : 'A reference code will be generated upon order completion to pay within 24 hours'}
                          className="w-full px-4 py-2 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Online Card Gateway (بوابة الدفع بالبطاقات البنكية) */}
                <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border theme-border space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-base border border-indigo-200 dark:border-indigo-800/40">
                        <FontAwesomeIcon icon={faShieldAlt} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-xs text-[var(--text-primary)]">
                            {isRTL ? 'البطاقات البنكية وبوابات الدفع الإلكتروني (Card Gateways)' : 'Online Card Payment Gateways'}
                          </h3>
                          <span className="text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-2 py-0.5 rounded font-bold uppercase">
                            Visa / Master / Meeza
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          {isRTL ? 'ربط بوابة دفع إلكترونية معتمدة (Stripe, Paymob, FawryPay, Tap Payments)' : 'Connect an online card processing gateway (Stripe, Paymob, FawryPay, Tap Payments)'}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleChange('paymentCardEnabled', !(formData.paymentCardEnabled ?? true))}
                      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                        (formData.paymentCardEnabled ?? true) ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                          (formData.paymentCardEnabled ?? true) ? (isRTL ? 'right-1' : 'left-6') : (isRTL ? 'right-6' : 'left-1')
                        }`}
                      />
                    </button>
                  </div>

                  {(formData.paymentCardEnabled ?? true) && (
                    <div className="space-y-4 pt-3 border-t theme-border animate-fade-in">
                      {/* Provider Selection */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          <FontAwesomeIcon icon={faCreditCard} className="text-indigo-500" />
                          <span>{isRTL ? 'مزود بوابة الدفع (Gateway Provider)' : 'Payment Gateway Provider'}</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {[
                            { id: 'stripe', name: 'Stripe', desc: 'Global Cards & Apple Pay' },
                            { id: 'paymob', name: 'Paymob', desc: 'Egypt / MENA Cards & Wallets' },
                            { id: 'fawry', name: 'FawryPay', desc: 'Cards & Installments' },
                            { id: 'tap', name: 'Tap Payments', desc: 'GCC & Middle East' },
                          ].map((gw) => {
                            const isSelected = (formData.paymentCardGateway || 'stripe') === gw.id;
                            return (
                              <button
                                key={gw.id}
                                type="button"
                                onClick={() => handleChange('paymentCardGateway', gw.id)}
                                className={`p-3 rounded-xl border text-start transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 ring-2 ring-indigo-400/50'
                                    : 'bg-[var(--bg-card)] text-[var(--text-primary)] border theme-border hover:border-indigo-400'
                                }`}
                              >
                                <p className="font-extrabold text-xs">{gw.name}</p>
                                <p className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-indigo-100' : 'text-[var(--text-secondary)]'}`}>
                                  {gw.desc}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Live vs Test Mode */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                        <div>
                          <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                            {isRTL ? 'بيئة الاختبار التجريبية (Sandbox / Test Mode)' : 'Sandbox / Test Mode'}
                          </p>
                          <p className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80">
                            {isRTL ? 'استخدام مفاتيح الاختبار التجريبية للتحقق من سلامة الدفع' : 'Use test API keys to verify card checkout flows safely'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleChange('paymentCardTestMode', !(formData.paymentCardTestMode ?? true))}
                          className={`relative w-10 h-5 rounded-full transition-colors ${
                            (formData.paymentCardTestMode ?? true) ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                              (formData.paymentCardTestMode ?? true) ? (isRTL ? 'right-0.5' : 'left-5') : (isRTL ? 'right-5' : 'left-0.5')
                            }`}
                          />
                        </button>
                      </div>

                      {/* API Keys */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faKey} className="text-indigo-500 text-[10px]" />
                            <span>{isRTL ? 'المفتاح العام (Publishable / Public Key)' : 'Publishable / Public API Key'}</span>
                          </label>
                          <input
                            type="text"
                            value={formData.paymentCardPublishableKey || ''}
                            onChange={(e) => handleChange('paymentCardPublishableKey', e.target.value)}
                            placeholder="pk_test_... or API Key"
                            className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <FontAwesomeIcon icon={faLock} className="text-rose-500 text-[10px]" />
                              <span>{isRTL ? 'المفتاح السري (Secret Key)' : 'Secret API Key'}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowCardSecret(!showCardSecret)}
                              className="text-[10px] text-indigo-600 hover:underline"
                            >
                              {showCardSecret ? (isRTL ? 'إخفاء' : 'Hide') : (isRTL ? 'إظهار' : 'Show')}
                            </button>
                          </label>
                          <input
                            type={showCardSecret ? 'text' : 'password'}
                            value={formData.paymentCardSecretKey || ''}
                            onChange={(e) => handleChange('paymentCardSecretKey', e.target.value)}
                            placeholder="sk_test_... or Secret Key"
                            className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[var(--text-primary)]">
                          {isRTL ? 'ملاحظة البطاقات المقبولة للمشتري' : 'Accepted Cards / Security Note'}
                        </label>
                        <input
                          type="text"
                          value={formData.paymentCardInstructions || ''}
                          onChange={(e) => handleChange('paymentCardInstructions', e.target.value)}
                          placeholder={isRTL ? 'نقبل جميع البطاقات البنكية مع تشفير وحماية ثلاثية الأبعاد 3D Secure' : 'We accept Visa, Mastercard, and Meeza with 3D-Secure encryption'}
                          className="w-full px-4 py-2 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Mobile Wallets (فودافون كاش / المحافظ الإلكترونية) */}
                <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border theme-border space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-base border border-rose-200 dark:border-rose-800/40">
                        <FontAwesomeIcon icon={faMobileScreen} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-xs text-[var(--text-primary)]">
                            {isRTL ? 'المحافظ الإلكترونية (Vodafone Cash / Orange / Etisalat / WE)' : 'Mobile Cash Wallets'}
                          </h3>
                          <span className="text-[9px] bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 px-2 py-0.5 rounded font-bold">
                            {isRTL ? 'تحويل كاش' : 'Cash Transfer'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          {isRTL ? 'استقبال التحويلات عبر المحافظ الذكية وإرفاق إيصال التحويل' : 'Accept direct mobile wallet transfers with customer proof screenshot'}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleChange('paymentWalletsEnabled', !(formData.paymentWalletsEnabled ?? false))}
                      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                        (formData.paymentWalletsEnabled ?? false) ? 'bg-rose-600' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                          (formData.paymentWalletsEnabled ?? false) ? (isRTL ? 'right-1' : 'left-6') : (isRTL ? 'right-6' : 'left-1')
                        }`}
                      />
                    </button>
                  </div>

                  {(formData.paymentWalletsEnabled ?? false) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t theme-border animate-fade-in">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[var(--text-primary)]">
                          {isRTL ? 'رقم المحفظة لاستقبال التحويلات *' : 'Wallet Mobile Number *'}
                        </label>
                        <input
                          type="tel"
                          value={formData.paymentWalletsNumber || ''}
                          onChange={(e) => handleChange('paymentWalletsNumber', e.target.value)}
                          placeholder="010XXXXXXXX"
                          className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-rose-600 dark:text-rose-400 font-mono font-bold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[var(--text-primary)]">
                          {isRTL ? 'تعليمات التحويل للعميل' : 'Customer Wallet Instructions'}
                        </label>
                        <input
                          type="text"
                          value={formData.paymentWalletsInstructions || ''}
                          onChange={(e) => handleChange('paymentWalletsInstructions', e.target.value)}
                          placeholder={isRTL ? 'يرجى تحويل المبلغ لرقم المحفظة ورفع صورة الإيصال لتأكيد الطلب' : 'Please transfer the amount to the wallet number and upload confirmation screenshot'}
                          className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Order Deposit & Anti-Cancellation Policy (نظام العربون وتأكيد الطلبات) */}
                <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border-2 border-indigo-200/80 dark:border-indigo-800/60 space-y-4 shadow-sm relative overflow-hidden">
                  {/* Decorative badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-base border border-amber-500/20">
                        <FontAwesomeIcon icon={faLock} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-xs text-[var(--text-primary)]">
                            {isRTL ? 'نظام العربون وتأكيد الطلبات لمنع الإلغاء' : 'Order Deposit & Anti-Cancellation Policy'}
                          </h3>
                          <span className="text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded font-bold">
                            {isRTL ? 'حماية من الإلغاء والطلبات الوهمية' : 'Fraud & Cancellation Protection'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          {isRTL
                            ? 'إلزام المشتري بدفع عربون مقدماً لتأكيد جدية الطلب ومنع التراجع أو الإلغاء بعد بدء التجهيز والشحن'
                            : 'Require an upfront deposit to confirm orders, preventing casual cancellations and shipping loss'}
                        </p>
                      </div>
                    </div>

                    {/* Main Deposit Toggle */}
                    <button
                      type="button"
                      onClick={() => handleChange('depositEnabled', !Boolean(formData.depositEnabled))}
                      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                        formData.depositEnabled ? 'bg-amber-500 shadow-sm shadow-amber-500/30' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                          formData.depositEnabled ? (isRTL ? 'right-1' : 'left-6') : (isRTL ? 'right-6' : 'left-1')
                        }`}
                      />
                    </button>
                  </div>

                  {formData.depositEnabled && (
                    <div className="space-y-4 pt-4 border-t theme-border animate-fade-in">
                      {/* Target Payment Methods */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-primary)]">
                          {isRTL ? 'تطبيق العربون على:' : 'Apply Deposit To:'}
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => handleChange('depositAppliesTo', 'COD')}
                            className={`p-3 rounded-xl border text-start transition cursor-pointer ${
                              (formData.depositAppliesTo || 'COD') === 'COD'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500 ring-2 ring-amber-400/40 font-bold'
                                : 'bg-[var(--bg-card)] text-[var(--text-primary)] border theme-border hover:border-amber-400'
                            }`}
                          >
                            <p className="text-xs font-black">{isRTL ? 'طلبات الدفع عند الاستلام (COD) فقط' : 'COD (Cash on Delivery) Only'}</p>
                            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                              {isRTL ? 'موصى به: حماية المتجر من رفض استلام الشحنة وتكبد مصاريف الشحن' : 'Recommended: Secures delivery return costs against non-serious buyers'}
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleChange('depositAppliesTo', 'ALL')}
                            className={`p-3 rounded-xl border text-start transition cursor-pointer ${
                              formData.depositAppliesTo === 'ALL'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500 ring-2 ring-amber-400/40 font-bold'
                                : 'bg-[var(--bg-card)] text-[var(--text-primary)] border theme-border hover:border-amber-400'
                            }`}
                          >
                            <p className="text-xs font-black">{isRTL ? 'جميع الطلبات بدون استثناء' : 'All Orders'}</p>
                            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                              {isRTL ? 'تطبيق العربون الإلزامي على أي وسيلة دفع مختارة' : 'Enforce deposit requirement regardless of selected checkout method'}
                            </p>
                          </button>
                        </div>
                      </div>

                      {/* Deposit Calculation Mode */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-primary)]">
                          {isRTL ? 'طريقة احتساب مبلغ العربون:' : 'Deposit Calculation Method:'}
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {[
                            { id: 'FIXED', label: isRTL ? 'مبلغ ثابت' : 'Fixed Amount', desc: isRTL ? 'مثلاً 50 أو 100 جنيه' : 'e.g. $10 or 50 EGP' },
                            { id: 'PERCENTAGE', label: isRTL ? 'نسبة مئوية' : 'Percentage (%)', desc: isRTL ? 'مثلاً 20% أو 30% من الإجمالي' : 'e.g. 20% of cart total' },
                            { id: 'SHIPPING_ONLY', label: isRTL ? 'ما يعادل تكلفة الشحن' : 'Shipping Fee Only', desc: isRTL ? 'يساوي رسوم التوصيل' : 'Matches shipping cost' },
                          ].map((mode) => {
                            const isSelected = (formData.depositType || 'FIXED') === mode.id;
                            return (
                              <button
                                key={mode.id}
                                type="button"
                                onClick={() => handleChange('depositType', mode.id)}
                                className={`p-3 rounded-xl border text-start transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/25 ring-2 ring-amber-300/50'
                                    : 'bg-[var(--bg-card)] text-[var(--text-primary)] border theme-border hover:border-amber-400'
                                }`}
                              >
                                <p className="font-extrabold text-xs">{mode.label}</p>
                                <p className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-amber-100' : 'text-[var(--text-secondary)]'}`}>
                                  {mode.desc}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Deposit Value & Minimum Order Total Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(formData.depositType || 'FIXED') !== 'SHIPPING_ONLY' && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[var(--text-primary)]">
                              {(formData.depositType || 'FIXED') === 'PERCENTAGE'
                                ? (isRTL ? 'نسبة العربون المئوية (%) *' : 'Deposit Percentage (%) *')
                                : (isRTL ? 'قيمة مبلغ العربون الثابت *' : 'Fixed Deposit Amount *')}
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={formData.depositValue ?? 50}
                                onChange={(e) => handleChange('depositValue', parseFloat(e.target.value) || 0)}
                                className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-amber-700 dark:text-amber-400 font-mono font-bold text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                              />
                              <span className="text-xs font-bold text-[var(--text-secondary)]">
                                {(formData.depositType || 'FIXED') === 'PERCENTAGE' ? '%' : formData.defaultCurrency}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[var(--text-primary)]">
                            {isRTL ? 'تطبيق فقط على الطلبات الأكبر من (اختياري)' : 'Min Order Threshold (0 = All)'}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="10"
                              value={formData.depositMinOrderTotal ?? 0}
                              onChange={(e) => handleChange('depositMinOrderTotal', parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] font-mono font-bold text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            />
                            <span className="text-xs font-bold text-[var(--text-secondary)]">{formData.defaultCurrency}</span>
                          </div>
                        </div>
                      </div>

                      {/* Deposit Payment Instructions */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[var(--text-primary)]">
                          {isRTL ? 'تعليمات وبيانات تحويل العربون للعميل' : 'Deposit Payment Instructions for Customer'}
                        </label>
                        <textarea
                          rows={2}
                          value={formData.depositInstructions || ''}
                          onChange={(e) => handleChange('depositInstructions', e.target.value)}
                          placeholder={
                            isRTL
                              ? 'يرجى تحويل قيمة العربون عبر إنستاباي أو فودافون كاش ورفع صورة الإيصال لتأكيد تجهيز الطلب'
                              : 'Please transfer the deposit via Instapay or Mobile Wallet and upload the receipt to confirm your order'
                          }
                          className="w-full px-4 py-2 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>

                      {/* Non-Refundable Cancellation Disclaimer */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[var(--text-primary)]">
                          {isRTL ? 'نص سياسة عدم الاسترداد عند الإلغاء (تظهر بصفحة الدفع وتفاصيل الطلب)' : 'Non-Refundable Policy Notice (Shown at checkout)'}
                        </label>
                        <input
                          type="text"
                          value={formData.depositPolicyText || ''}
                          onChange={(e) => handleChange('depositPolicyText', e.target.value)}
                          placeholder={
                            isRTL
                              ? 'عربون حجز غير قابل للاسترداد في حال إلغاء الطلب بعد دخوله مرحلة التجهيز أو الشحن'
                              : 'This deposit is non-refundable if the order is cancelled after processing/dispatch'
                          }
                          className="w-full px-4 py-2 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Shipping & Courier Tracking */}
            {activeTab === 'shipping' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b theme-border pb-3">
                  <div>
                    <h2 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                      <FontAwesomeIcon icon={faTruck} className="text-indigo-600" />
                      <span>{isRTL ? 'إعدادات الشحن والتتبع مع شركات الشحن' : 'Shipping & Courier Tracking Settings'}</span>
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {isRTL
                        ? 'تحديد تكلفة الشحن وربط أرقام التتبع مع شركات الشحن السريع (أرامكس، بوسطة، البريد المصري)'
                        : 'Configure default shipping rates and enable live courier tracking links for customers'}
                    </p>
                  </div>
                </div>

                {/* Base Shipping Fee */}
                <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border theme-border space-y-2">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <FontAwesomeIcon icon={faTruck} className="text-indigo-600" />
                    <span>{isRTL ? 'تكلفة الشحن الافتراضية' : 'Default Base Shipping Fee'}</span>
                  </label>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {isRTL ? 'القيمة الافتراضية المضافة كرسوم شحن عند إتمام الطلب (0 تعني شحن مجاني)' : 'Default shipping cost added to order totals (0 for free shipping)'}
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.shippingFee ?? 0}
                      onChange={(e) => handleChange('shippingFee', parseFloat(e.target.value) || 0)}
                      className="w-full max-w-xs px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="text-xs font-bold text-[var(--text-secondary)]">{formData.defaultCurrency}</span>
                  </div>
                </div>

                {/* Enable Courier Tracking Integration Toggle */}
                <div className="flex items-center justify-between p-5 rounded-2xl bg-[var(--bg-surface)] border theme-border shadow-xs">
                  <div>
                    <p className="font-extrabold text-xs text-[var(--text-primary)]">
                      {isRTL ? 'تفعيل رابط التتبع الخارجي لشركة الشحن' : 'Enable External Courier Tracking Links'}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      {isRTL
                        ? 'عند التفعيل، سيظهر زر في صفحة تتبع الطلب يتيح للعميل فتح بوليصة الشحن مباشرة على موقع شركة الشحن'
                        : 'When enabled, customers can click a button on the Track Order page to track directly with the courier'}
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.courierTrackingEnabled ?? false}
                      onChange={(e) => handleChange('courierTrackingEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* Courier Provider & URL Template Setup (Visible if enabled) */}
                {formData.courierTrackingEnabled && (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-500/5 to-sky-500/5 border border-indigo-500/20 space-y-4 animate-fade-in">
                    <h3 className="text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                      {isRTL ? 'مزود خدمة الشحن ورابط التتبع' : 'Courier Provider & Tracking Template'}
                    </h3>

                    {/* Presets Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        {
                          id: 'aramex',
                          name: 'Aramex (أرامكس)',
                          template: 'https://www.aramex.com/track/results?mode=0&ShipmentNumber={trackingNumber}',
                        },
                        {
                          id: 'bosta',
                          name: 'Bosta (بوسطة)',
                          template: 'https://bosta.co/tracking-shipment/?shipment_number={trackingNumber}',
                        },
                        {
                          id: 'egypt_post',
                          name: 'Egypt Post (البريد المصري)',
                          template: 'https://www.egyptpost.org/tracking?item={trackingNumber}',
                        },
                        {
                          id: 'custom',
                          name: isRTL ? 'رابط مخصص' : 'Custom URL',
                          template: formData.courierTrackingUrlTemplate || '',
                        },
                      ].map((prov) => {
                        const isSelected = (formData.courierProvider || 'aramex') === prov.id;
                        return (
                          <button
                            key={prov.id}
                            type="button"
                            onClick={() => {
                              handleChange('courierProvider', prov.id);
                              if (prov.id !== 'custom') {
                                handleChange('courierTrackingUrlTemplate', prov.template);
                              }
                            }}
                            className={`p-3 rounded-xl border text-xs font-bold text-start transition cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25'
                                : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-theme hover:bg-[var(--bg-card)]'
                            }`}
                          >
                            <p className="font-extrabold text-xs">{prov.name}</p>
                            <p className={`text-[10px] mt-1 truncate ${isSelected ? 'text-indigo-100' : 'text-[var(--text-muted)]'}`}>
                              {prov.id === 'custom' ? (isRTL ? 'رابطك الخاص' : 'Custom Template') : 'Preset URL'}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom URL Template Input */}
                    <div className="space-y-1.5 pt-2">
                      <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                        <span>{isRTL ? 'قالب رابط التتبع (Tracking URL Template)' : 'Tracking URL Template'}</span>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                          {'{trackingNumber}'} = {isRTL ? 'سيستبدل برقم التتبع' : 'replaced with AWB'}
                        </span>
                      </label>
                      <input
                        type="text"
                        value={formData.courierTrackingUrlTemplate || ''}
                        onChange={(e) => {
                          handleChange('courierTrackingUrlTemplate', e.target.value);
                          handleChange('courierProvider', 'custom');
                        }}
                        placeholder="https://example-courier.com/track/{trackingNumber}"
                        className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* Live Preview of Generated URL */}
                    <div className="p-3 bg-[var(--bg-surface)] rounded-xl border theme-border flex items-center justify-between gap-3 text-xs">
                      <div className="truncate">
                        <span className="text-[10px] text-[var(--text-muted)] block">{isRTL ? 'معاينة الرابط الناتج (مثال 123456):' : 'Generated Link Preview (Sample 123456):'}</span>
                        <code className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono truncate block mt-0.5">
                          {(formData.courierTrackingUrlTemplate || 'https://www.aramex.com/track/results?mode=0&ShipmentNumber={trackingNumber}').replace(
                            '{trackingNumber}',
                            '123456'
                          )}
                        </code>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Email Notifications (Resend Integration) */}
            {activeTab === 'email' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b theme-border pb-3">
                  <div>
                    <h2 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                      <FontAwesomeIcon icon={faEnvelope} className="text-indigo-600 dark:text-indigo-400" />
                      <span>{isRTL ? 'إعدادات إشعارات البريد الإلكتروني (Resend)' : 'Email Notifications Settings (Resend)'}</span>
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {isRTL
                        ? 'إرسال رسائل بريد إلكتروني آلية للعملاء عند تأكيد الطلب وتحديث حالة الشحن عبر منصة Resend'
                        : 'Send automated transactional emails to customers on order creation and shipping status changes via Resend'}
                    </p>
                  </div>
                </div>

                {/* Email Enable Toggle */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-surface)] border theme-border shadow-xs">
                  <div>
                    <p className="font-extrabold text-xs text-[var(--text-primary)]">
                      {isRTL ? 'تفعيل إرسال إشعارات البريد الإلكتروني' : 'Enable Automated Email Notifications'}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      {isRTL
                        ? 'تفعيل أو تعطيل إرسال رسائل البريد الإلكتروني للعملاء والإدارة'
                        : 'Toggle transactional emails for customers and store managers'}
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.emailNotificationsEnabled ?? false}
                      onChange={(e) => handleChange('emailNotificationsEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {formData.emailNotificationsEnabled && (
                  <div className="space-y-4 p-5 rounded-2xl bg-[var(--bg-card)] border theme-border space-y-4 animate-fade-in">
                    {/* Resend API Key */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                        <span>{isRTL ? 'مفتاح API الخاص بـ Resend (Resend API Key) *' : 'Resend API Key *'}</span>
                        <a
                          href="https://resend.com/api-keys"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          <FontAwesomeIcon icon={faLink} />
                          <span>{isRTL ? 'الحصول على مفتاح من Resend' : 'Get API Key'}</span>
                        </a>
                      </label>
                      <input
                        type="password"
                        value={formData.resendApiKey || ''}
                        onChange={(e) => handleChange('resendApiKey', e.target.value)}
                        placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* From Email & Admin Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[var(--text-primary)]">{isRTL ? 'البريد المرسل (From Email)' : 'Sender Email (From Email)'}</label>
                        <input
                          type="email"
                          value={formData.fromEmail || ''}
                          onChange={(e) => handleChange('fromEmail', e.target.value)}
                          placeholder="orders@yourdomain.com"
                          className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {isRTL ? 'استخدم onboarding@resend.dev للاختبار أو نطاقك الموثق' : 'Use onboarding@resend.dev for testing or your verified domain'}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[var(--text-primary)]">{isRTL ? 'بريد تنبيهات الإدارة' : 'Admin Notification Email'}</label>
                        <input
                          type="email"
                          value={formData.adminNotifyEmail || ''}
                          onChange={(e) => handleChange('adminNotifyEmail', e.target.value)}
                          placeholder="admin@yourdomain.com"
                          className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Triggers Checklist */}
                    <div className="pt-2 border-t theme-border space-y-2">
                      <p className="text-xs font-bold text-[var(--text-primary)]">{isRTL ? 'أحداث الإرسال التلقائي:' : 'Automated Trigger Events:'}</p>

                      <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.notifyOnNewOrder ?? true}
                          onChange={(e) => handleChange('notifyOnNewOrder', e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{isRTL ? 'إرسال بريد تأكيد للعميل فور إنشاء الطلب' : 'Send order confirmation to customer immediately on checkout'}</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.notifyOnStatusChange ?? true}
                          onChange={(e) => handleChange('notifyOnStatusChange', e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{isRTL ? 'إرسال بريد تحديث عند تغيير حالة الطلب (الشحن / التسليم)' : 'Send update email on order status change (shipped, delivered, etc.)'}</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Loyalty Rewards Points Settings */}
            {activeTab === 'loyalty' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b theme-border pb-3">
                  <div>
                    <h2 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                      <FontAwesomeIcon icon={faCoins} className="text-amber-500" />
                      <span>{isRTL ? 'إعدادات نقاط الولاء والمكافآت' : 'Loyalty & Reward Points Settings'}</span>
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {isRTL
                        ? 'تحكم في كيفية كسب واستبدال العملاء لنقاط المكافآت عند الشراء من المتجر'
                        : 'Configure how customers earn and redeem reward points on store purchases'}
                    </p>
                  </div>
                </div>

                {/* Loyalty Enable Toggle */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-surface)] border theme-border shadow-xs">
                  <div>
                    <p className="font-extrabold text-xs text-[var(--text-primary)]">
                      {isRTL ? 'تفعيل برنامج نقاط الولاء' : 'Enable Loyalty Rewards Program'}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      {isRTL
                        ? 'عند التفعيل، سيحصل العملاء المسجلون على نقاط تلقائية عند إتمام الطلبات مع إمكانية استبدالها'
                        : 'When enabled, registered customers earn points on checkout and can redeem them for discounts'}
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.loyaltyEnabled ?? true}
                      onChange={(e) => handleChange('loyaltyEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* Points Configuration Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Points per Currency Unit Earning */}
                  <div className="space-y-1.5 p-4 rounded-2xl bg-[var(--bg-surface)] border theme-border">
                    <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faCoins} className="text-amber-500" />
                      <span>{isRTL ? 'معدل كسب النقاط (لكل 1 عملة)' : 'Earning Rate (Points per 1 spent)'}</span>
                    </label>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      {isRTL ? 'عدد النقاط التي يكتسبها العميل مقابل كل وحدة عملة يتم إنفاقها' : 'Points awarded for each currency unit spent'}
                    </p>
                    <div className="relative pt-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={formData.pointsPerDollar ?? 1.0}
                        onChange={(e) => handleChange('pointsPerDollar', parseFloat(e.target.value) || 1.0)}
                        className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                      <span className="absolute end-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[var(--text-muted)]">
                        {isRTL ? 'نقطة' : 'pts'}
                      </span>
                    </div>
                  </div>

                  {/* Points per Currency Unit Redemption */}
                  <div className="space-y-1.5 p-4 rounded-2xl bg-[var(--bg-surface)] border theme-border">
                    <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faCoins} className="text-indigo-500" />
                      <span>{isRTL ? 'معدل الاستبدال (نقاط لكل 1 عملة خصم)' : 'Redemption Rate (Points per 1 discount)'}</span>
                    </label>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      {isRTL ? 'كم نقطة يحتاجها العميل للحصول على خصم بقيمة 1 عملة (مثال: 20 نقطة = 1 دولار)' : 'Points needed for 1 currency discount (e.g. 20 pts = $1)'}
                    </p>
                    <div className="relative pt-1">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={formData.pointsRedemptionRate ?? 20.0}
                        onChange={(e) => handleChange('pointsRedemptionRate', parseFloat(e.target.value) || 20.0)}
                        className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <span className="absolute end-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[var(--text-muted)]">
                        {isRTL ? 'نقطة = 1 عملة' : 'pts = 1 unit'}
                      </span>
                    </div>
                  </div>

                  {/* Min Points To Redeem */}
                  <div className="space-y-1.5 p-4 rounded-2xl bg-[var(--bg-surface)] border theme-border sm:col-span-2">
                    <label className="text-xs font-bold text-[var(--text-primary)]">
                      {isRTL ? 'الحد الأدنى من النقاط للاستبدال' : 'Minimum Points Threshold to Redeem'}
                    </label>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      {isRTL ? 'أقل رصيد نقاط يجب أن يمتلكه العميل ليتمكن من استبدالها في صفحة الدفع' : 'Minimum points balance required before customer can redeem at checkout'}
                    </p>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={formData.minPointsToRedeem ?? 20}
                      onChange={(e) => handleChange('minPointsToRedeem', parseInt(e.target.value) || 20)}
                      className="w-full max-w-xs px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Live Interactive Calculation Preview */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border border-amber-300/40 dark:border-amber-700/50 space-y-3">
                  <h4 className="text-xs font-black text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faCoins} className="text-amber-500" />
                    <span>{isRTL ? 'محاكي تجربة العميل (معاينة حية):' : 'Customer Experience Simulation (Live Preview):'}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-[var(--bg-surface)] rounded-xl border theme-border">
                      <p className="text-[10px] text-[var(--text-secondary)] font-semibold">{isRTL ? 'إذا اشترى العميل بمبلغ:' : 'If customer spends:'}</p>
                      <p className="text-base font-black text-[var(--text-primary)] font-mono mt-0.5">100 {formData.defaultCurrency}</p>
                    </div>

                    <div className="p-3 bg-[var(--bg-surface)] rounded-xl border theme-border">
                      <p className="text-[10px] text-[var(--text-secondary)] font-semibold">{isRTL ? 'سيكتسب العميل:' : 'Customer will earn:'}</p>
                      <p className="text-base font-black text-amber-600 font-mono mt-0.5">
                        {Math.floor(100 * (formData.pointsPerDollar ?? 1.0))} {isRTL ? 'نقطة' : 'pts'}
                      </p>
                    </div>

                    <div className="p-3 bg-[var(--bg-surface)] rounded-xl border theme-border">
                      <p className="text-[10px] text-[var(--text-secondary)] font-semibold">{isRTL ? 'قيمة الخصم عند الاستبدال:' : 'Redemption value:'}</p>
                      <p className="text-base font-black text-emerald-600 font-mono mt-0.5">
                        {((Math.floor(100 * (formData.pointsPerDollar ?? 1.0))) / (formData.pointsRedemptionRate || 20.0)).toFixed(2)} {formData.defaultCurrency}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Theme & Custom Colors */}
            {activeTab === 'appearance' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b theme-border pb-3">
                  <h2 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                    <FontAwesomeIcon icon={faPalette} className="text-indigo-600" />
                    <span>{t.tabAppearance}</span>
                  </h2>
                  <button
                    type="button"
                    onClick={handleResetColors}
                    className="text-xs text-indigo-600 hover:text-indigo-500 font-bold flex items-center gap-1.5 transition"
                  >
                    <FontAwesomeIcon icon={faUndo} />
                    <span>{t.resetColors}</span>
                  </button>
                </div>

                {/* Light Theme Pickers */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                    <FontAwesomeIcon icon={faSun} />
                    <span>{t.lightThemeTitle}</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Light BG Primary */}
                    <div className="flex items-center justify-between p-3 rounded-xl border theme-border bg-[var(--bg-surface)]">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{t.bgPrimary}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={formData.lightBgPrimary}
                          maxLength={7}
                          placeholder="#ffffff"
                          onChange={(e) => {
                            const v = e.target.value;
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) handleChange('lightBgPrimary', v);
                          }}
                          className="w-20 text-xs font-mono px-2 py-1 rounded-lg border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
                        />
                        <input
                          type="color"
                          value={formData.lightBgPrimary}
                          onChange={(e) => handleChange('lightBgPrimary', e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                        />
                      </div>
                    </div>
                    {/* Light BG Surface */}
                    <div className="flex items-center justify-between p-3 rounded-xl border theme-border bg-[var(--bg-surface)]">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{t.bgSurface}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={formData.lightBgSurface}
                          maxLength={7}
                          placeholder="#ffffff"
                          onChange={(e) => {
                            const v = e.target.value;
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) handleChange('lightBgSurface', v);
                          }}
                          className="w-20 text-xs font-mono px-2 py-1 rounded-lg border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
                        />
                        <input
                          type="color"
                          value={formData.lightBgSurface}
                          onChange={(e) => handleChange('lightBgSurface', e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                        />
                      </div>
                    </div>
                    {/* Light Text Primary */}
                    <div className="flex items-center justify-between p-3 rounded-xl border theme-border bg-[var(--bg-surface)]">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{t.textPrimary}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={formData.lightTextPrimary}
                          maxLength={7}
                          placeholder="#000000"
                          onChange={(e) => {
                            const v = e.target.value;
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) handleChange('lightTextPrimary', v);
                          }}
                          className="w-20 text-xs font-mono px-2 py-1 rounded-lg border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
                        />
                        <input
                          type="color"
                          value={formData.lightTextPrimary}
                          onChange={(e) => handleChange('lightTextPrimary', e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                        />
                      </div>
                    </div>
                    {/* Light Text Secondary */}
                    <div className="flex items-center justify-between p-3 rounded-xl border theme-border bg-[var(--bg-surface)]">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{t.textSecondary}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={formData.lightTextSecondary}
                          maxLength={7}
                          placeholder="#555555"
                          onChange={(e) => {
                            const v = e.target.value;
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) handleChange('lightTextSecondary', v);
                          }}
                          className="w-20 text-xs font-mono px-2 py-1 rounded-lg border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
                        />
                        <input
                          type="color"
                          value={formData.lightTextSecondary}
                          onChange={(e) => handleChange('lightTextSecondary', e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                        />
                      </div>
                    </div>
                    {/* Light Accent */}
                    <div className="flex items-center justify-between p-3 rounded-xl border theme-border bg-[var(--bg-surface)] sm:col-span-2">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{t.accentColor}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={formData.lightAccentColor}
                          maxLength={7}
                          placeholder="#4f46e5"
                          onChange={(e) => {
                            const v = e.target.value;
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) handleChange('lightAccentColor', v);
                          }}
                          className="w-20 text-xs font-mono px-2 py-1 rounded-lg border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
                        />
                        <input
                          type="color"
                          value={formData.lightAccentColor}
                          onChange={(e) => handleChange('lightAccentColor', e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dark Theme Pickers */}
                <div className="space-y-4 pt-4 border-t theme-border">
                  <h3 className="text-xs font-black text-indigo-400 flex items-center gap-2">
                    <FontAwesomeIcon icon={faMoon} />
                    <span>{t.darkThemeTitle}</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Dark BG Primary */}
                    <div className="flex items-center justify-between p-3 rounded-xl border theme-border bg-[var(--bg-surface)]">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{t.bgPrimary}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={formData.darkBgPrimary}
                          maxLength={7}
                          placeholder="#0f172a"
                          onChange={(e) => {
                            const v = e.target.value;
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) handleChange('darkBgPrimary', v);
                          }}
                          className="w-20 text-xs font-mono px-2 py-1 rounded-lg border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
                        />
                        <input
                          type="color"
                          value={formData.darkBgPrimary}
                          onChange={(e) => handleChange('darkBgPrimary', e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                        />
                      </div>
                    </div>
                    {/* Dark BG Surface */}
                    <div className="flex items-center justify-between p-3 rounded-xl border theme-border bg-[var(--bg-surface)]">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{t.bgSurface}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={formData.darkBgSurface}
                          maxLength={7}
                          placeholder="#1e293b"
                          onChange={(e) => {
                            const v = e.target.value;
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) handleChange('darkBgSurface', v);
                          }}
                          className="w-20 text-xs font-mono px-2 py-1 rounded-lg border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
                        />
                        <input
                          type="color"
                          value={formData.darkBgSurface}
                          onChange={(e) => handleChange('darkBgSurface', e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                        />
                      </div>
                    </div>
                    {/* Dark Text Primary */}
                    <div className="flex items-center justify-between p-3 rounded-xl border theme-border bg-[var(--bg-surface)]">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{t.textPrimary}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={formData.darkTextPrimary}
                          maxLength={7}
                          placeholder="#f1f5f9"
                          onChange={(e) => {
                            const v = e.target.value;
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) handleChange('darkTextPrimary', v);
                          }}
                          className="w-20 text-xs font-mono px-2 py-1 rounded-lg border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
                        />
                        <input
                          type="color"
                          value={formData.darkTextPrimary}
                          onChange={(e) => handleChange('darkTextPrimary', e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                        />
                      </div>
                    </div>
                    {/* Dark Text Secondary */}
                    <div className="flex items-center justify-between p-3 rounded-xl border theme-border bg-[var(--bg-surface)]">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{t.textSecondary}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={formData.darkTextSecondary}
                          maxLength={7}
                          placeholder="#94a3b8"
                          onChange={(e) => {
                            const v = e.target.value;
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) handleChange('darkTextSecondary', v);
                          }}
                          className="w-20 text-xs font-mono px-2 py-1 rounded-lg border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
                        />
                        <input
                          type="color"
                          value={formData.darkTextSecondary}
                          onChange={(e) => handleChange('darkTextSecondary', e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                        />
                      </div>
                    </div>
                    {/* Dark Accent */}
                    <div className="flex items-center justify-between p-3 rounded-xl border theme-border bg-[var(--bg-surface)] sm:col-span-2">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{t.accentColor}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={formData.darkAccentColor}
                          maxLength={7}
                          placeholder="#6366f1"
                          onChange={(e) => {
                            const v = e.target.value;
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) handleChange('darkAccentColor', v);
                          }}
                          className="w-20 text-xs font-mono px-2 py-1 rounded-lg border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
                        />
                        <input
                          type="color"
                          value={formData.darkAccentColor}
                          onChange={(e) => handleChange('darkAccentColor', e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Typography & Size */}
            {activeTab === 'typography' && (
              <div className="space-y-6 animate-fade-in">
                <h2 className="text-sm font-extrabold text-[var(--text-primary)] border-b theme-border pb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faFont} className="text-indigo-600" />
                  <span>{t.tabTypography}</span>
                </h2>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-[var(--text-primary)]">{t.fontFamily}</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(t.fonts).map(([key, label]) => {
                      const isSelected = formData.fontFamily === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleChange('fontFamily', key)}
                          className={`p-3.5 rounded-xl border text-start transition ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                              : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-theme hover:bg-[var(--bg-card)]'
                          }`}
                        >
                          <span className="text-xs font-bold block">{label}</span>
                          <span className="text-[10px] opacity-75 mt-1 block font-mono">Sample Text - {formData.storeName || (language === 'ar' ? 'المتجر' : 'Store')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t theme-border">
                  <label className="text-xs font-bold text-[var(--text-primary)]">{t.fontSize}</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'small', label: t.fontSizeSmall },
                      { key: 'medium', label: t.fontSizeMedium },
                      { key: 'large', label: t.fontSizeLarge },
                    ].map((sz) => {
                      const isSelected = formData.fontSize === sz.key;
                      return (
                        <button
                          key={sz.key}
                          type="button"
                          onClick={() => handleChange('fontSize', sz.key)}
                          className={`p-3 rounded-xl border text-center text-xs font-bold transition ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                              : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-theme hover:bg-[var(--bg-card)]'
                          }`}
                        >
                          {sz.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: Announcement Bar */}
            {activeTab === 'announcement' && (
              <div className="space-y-6 animate-fade-in">
                <h2 className="text-sm font-extrabold text-[var(--text-primary)] border-b theme-border pb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faBullhorn} className="text-indigo-600" />
                  <span>{t.tabAnnouncement}</span>
                </h2>

                <div className="flex items-center justify-between p-4 rounded-xl border theme-border bg-[var(--bg-surface)]">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-primary)]">{t.announcementEnable}</label>
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      {language === 'ar' ? 'عرض شريط الإعلانات في أعلى المتجر لجميع الزوار.' : 'Show notification banner at the top of the storefront.'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.announcementEnabled}
                    onChange={(e) => handleChange('announcementEnabled', e.target.checked)}
                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">{t.announcementText}</label>
                  <textarea
                    rows={3}
                    value={formData.announcementText}
                    onChange={(e) => handleChange('announcementText', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* TAB: Welcome Promo Popup */}
            {activeTab === 'popup' && (
              <div className="space-y-6 animate-fade-in">
                <h2 className="text-sm font-extrabold text-[var(--text-primary)] border-b theme-border pb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faGift} className="text-pink-500" />
                  <span>{isRTL ? 'نافذة الهدية وكود الخصم الترحيبي' : 'Welcome Gift & Promo Popup'}</span>
                </h2>

                {/* Enable Popup Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl border theme-border bg-[var(--bg-surface)]">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-primary)]">
                      {isRTL ? 'تفعيل النافذة الترحيبية للزوار الجدد' : 'Enable Welcome Gift Popup'}
                    </label>
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      {isRTL ? 'إظهار نافذة منبثقة مميزة تمنح الزوار الجدد كود خصم فوري عند أول زيارة للمتجر.' : 'Show an attractive modal offering new visitors an instant welcome discount code on their first visit.'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.popupEnabled ?? true}
                    onChange={(e) => handleChange('popupEnabled', e.target.checked)}
                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                {/* Popup Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">
                    {isRTL ? 'عنوان النافذة الترحيبية' : 'Popup Headline Title'}
                  </label>
                  <input
                    type="text"
                    value={formData.popupTitle || ''}
                    onChange={(e) => handleChange('popupTitle', e.target.value)}
                    placeholder={isRTL ? '🎉 هدية خاصة لزوارنا!' : '🎉 Special Welcome Gift!'}
                    className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Popup Subtitle / Text */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">
                    {isRTL ? 'نص العرض / الوصف' : 'Popup Subtitle / Offer Details'}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.popupText || ''}
                    onChange={(e) => handleChange('popupText', e.target.value)}
                    placeholder={isRTL ? 'استمتع بخصم إضافي على طلبك القادم' : 'Enjoy an extra discount on your next purchase'}
                    className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Promo Code Offered */}
                <div className="space-y-1.5 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/5 to-pink-500/5 border border-indigo-500/20">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faGift} className="text-indigo-600" />
                    <span>{isRTL ? 'كود الخصم المعروض في النافذة' : 'Promotional Code Displayed'}</span>
                  </label>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    {isRTL ? 'الكود الذي ينسخه العميل ويستخدمه في صفحة الدفع (مثال: WELCOME10). يمكنك إدارة نسبته وحدوده من صفحة "أكواد الخصم".' : 'The code visitors copy and apply at checkout (e.g. WELCOME10). You can manage its discount value & limits in the Promo Codes page.'}
                  </p>
                  <input
                    type="text"
                    value={formData.popupDiscountCode || 'WELCOME10'}
                    onChange={(e) => handleChange('popupDiscountCode', e.target.value.toUpperCase())}
                    placeholder="WELCOME10"
                    className="w-full max-w-xs px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 font-mono font-black text-sm uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* TAB 6: Contact & Socials */}
            {activeTab === 'social' && (
              <div className="space-y-5 animate-fade-in">
                <h2 className="text-sm font-extrabold text-[var(--text-primary)] border-b theme-border pb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faShareNodes} className="text-indigo-600" />
                  <span>{t.tabContactSocial}</span>
                </h2>

                {/* Contact fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <FontAwesomeIcon icon={faEnvelope} className="text-indigo-500" />
                      <span>{t.contactEmail}</span>
                    </label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => handleChange('contactEmail', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border theme-border bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <FontAwesomeIcon icon={faPhone} className="text-emerald-500" />
                      <span>{t.contactPhone}</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => handleChange('contactPhone', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border theme-border bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Social platforms */}
                <div className="space-y-3 pt-4 border-t theme-border">
                  <p className="text-xs font-extrabold text-[var(--text-primary)]">
                    {language === 'ar' ? 'حسابات التواصل الاجتماعي' : 'Social Media Accounts'}
                  </p>

                  {/* Facebook */}
                  {(() => {
                    const enabled = formData.socialFacebookEnabled;
                    return (
                      <div className={`rounded-xl border theme-border p-3 transition ${enabled ? 'bg-[var(--bg-surface)]' : 'bg-[var(--bg-primary)] opacity-60'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <FontAwesomeIcon icon={faFacebook} className="text-blue-600" />
                            <span>{t.socialFacebook}</span>
                          </label>
                          {/* Toggle */}
                          <button
                            type="button"
                            onClick={() => handleChange('socialFacebookEnabled', !enabled)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-indigo-600' : 'bg-[var(--border-color)]'}`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? (language === 'ar' ? 'right-0.5' : 'left-5') : (language === 'ar' ? 'right-5' : 'left-0.5')}`} />
                          </button>
                        </div>
                        <input
                          type="url"
                          value={formData.socialFacebook}
                          disabled={!enabled}
                          onChange={(e) => handleChange('socialFacebook', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:cursor-not-allowed"
                        />
                      </div>
                    );
                  })()}

                  {/* Instagram */}
                  {(() => {
                    const enabled = formData.socialInstagramEnabled;
                    return (
                      <div className={`rounded-xl border theme-border p-3 transition ${enabled ? 'bg-[var(--bg-surface)]' : 'bg-[var(--bg-primary)] opacity-60'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <FontAwesomeIcon icon={faInstagram} className="text-pink-600" />
                            <span>{t.socialInstagram}</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleChange('socialInstagramEnabled', !enabled)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-indigo-600' : 'bg-[var(--border-color)]'}`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? (language === 'ar' ? 'right-0.5' : 'left-5') : (language === 'ar' ? 'right-5' : 'left-0.5')}`} />
                          </button>
                        </div>
                        <input
                          type="url"
                          value={formData.socialInstagram}
                          disabled={!enabled}
                          onChange={(e) => handleChange('socialInstagram', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:cursor-not-allowed"
                        />
                      </div>
                    );
                  })()}

                  {/* Twitter / X */}
                  {(() => {
                    const enabled = formData.socialTwitterEnabled;
                    return (
                      <div className={`rounded-xl border theme-border p-3 transition ${enabled ? 'bg-[var(--bg-surface)]' : 'bg-[var(--bg-primary)] opacity-60'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <FontAwesomeIcon icon={faTwitter} className="text-sky-500" />
                            <span>{t.socialTwitter}</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleChange('socialTwitterEnabled', !enabled)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-indigo-600' : 'bg-[var(--border-color)]'}`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? (language === 'ar' ? 'right-0.5' : 'left-5') : (language === 'ar' ? 'right-5' : 'left-0.5')}`} />
                          </button>
                        </div>
                        <input
                          type="url"
                          value={formData.socialTwitter}
                          disabled={!enabled}
                          onChange={(e) => handleChange('socialTwitter', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:cursor-not-allowed"
                        />
                      </div>
                    );
                  })()}

                  {/* TikTok */}
                  {(() => {
                    const enabled = formData.socialTikTokEnabled;
                    return (
                      <div className={`rounded-xl border theme-border p-3 transition ${enabled ? 'bg-[var(--bg-surface)]' : 'bg-[var(--bg-primary)] opacity-60'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <FontAwesomeIcon icon={faTiktok} className="text-slate-800 dark:text-slate-200" />
                            <span>{t.socialTikTok}</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleChange('socialTikTokEnabled', !enabled)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-indigo-600' : 'bg-[var(--border-color)]'}`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? (language === 'ar' ? 'right-0.5' : 'left-5') : (language === 'ar' ? 'right-5' : 'left-0.5')}`} />
                          </button>
                        </div>
                        <input
                          type="url"
                          value={formData.socialTikTok}
                          disabled={!enabled}
                          onChange={(e) => handleChange('socialTikTok', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:cursor-not-allowed"
                        />
                      </div>
                    );
                  })()}

                  {/* WhatsApp */}
                  {(() => {
                    const enabled = formData.socialWhatsAppEnabled;
                    return (
                      <div className={`rounded-xl border theme-border p-3 transition ${enabled ? 'bg-[var(--bg-surface)]' : 'bg-[var(--bg-primary)] opacity-60'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <FontAwesomeIcon icon={faWhatsapp} className="text-emerald-500" />
                            <span>{t.socialWhatsApp}</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleChange('socialWhatsAppEnabled', !enabled)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-indigo-600' : 'bg-[var(--border-color)]'}`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? (language === 'ar' ? 'right-0.5' : 'left-5') : (language === 'ar' ? 'right-5' : 'left-0.5')}`} />
                          </button>
                        </div>
                        <input
                          type="url"
                          value={formData.socialWhatsApp}
                          disabled={!enabled}
                          onChange={(e) => handleChange('socialWhatsApp', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:cursor-not-allowed"
                        />
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* TAB 7: Maintenance & Policies */}

            {activeTab === 'maintenance' && (
              <div className="space-y-6 animate-fade-in">
                <h2 className="text-sm font-extrabold text-[var(--text-primary)] border-b theme-border pb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faScrewdriverWrench} className="text-indigo-600" />
                  <span>{t.tabMaintenance}</span>
                </h2>

                <div className="flex items-center justify-between p-4 rounded-xl border theme-border bg-[var(--bg-surface)]">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-primary)]">{t.maintenanceEnable}</label>
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      {language === 'ar' ? 'إظهار شاشة الصيانة للعملاء وتأجيل عمليات الشراء.' : 'Display maintenance screen to general store visitors.'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.maintenanceMode}
                    onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">{t.maintenanceMessage}</label>
                  <textarea
                    rows={3}
                    value={formData.maintenanceMessage}
                    onChange={(e) => handleChange('maintenanceMessage', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t theme-border">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faTruck} className="text-indigo-600" />
                      <span>{t.shippingFee}</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.shippingFee}
                      onChange={(e) => handleChange('shippingFee', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faPercent} className="text-emerald-600" />
                      <span>{t.taxRate}</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.taxRate}
                      onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Right Side: Live Theme Preview Card (Desktop xl screens only) */}
        <div className="hidden xl:block xl:col-span-3 space-y-4 xl:sticky xl:top-24">
          {renderLivePreview()}
        </div>
      </div>

      {/* Floating Save Bar on Unsaved Changes */}
      {showSaveButton && (
        <div className="fixed bottom-20 md:bottom-6 inset-x-0 z-50 max-w-xl mx-auto px-3 sm:px-4 animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
          <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-2xl text-white border border-slate-700/60 dark:border-slate-800 shadow-2xl shadow-black/40 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-2.5 sm:gap-4 ring-1 ring-white/10">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-amber-500"></span>
              </span>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-black truncate text-white">
                  {isRTL ? 'تعديلات غير محفوظة!' : 'Unsaved changes!'}
                </p>
                <p className="text-[9px] sm:text-[10px] text-slate-300 dark:text-slate-400 truncate">
                  {isRTL ? 'اضغط حفظ لنشر التعديلات فوراً' : 'Save to apply changes to store'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (serverSettings) setFormData(serverSettings);
                }}
                disabled={saving}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title={isRTL ? 'إلغاء التعديلات' : 'Discard changes'}
              >
                <FontAwesomeIcon icon={faUndo} className="text-xs" />
                <span className="hidden sm:inline">{isRTL ? 'تراجع' : 'Discard'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs transition shadow-lg shadow-indigo-600/40 flex items-center gap-1.5 sm:gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {saving ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    <span>{t.saving}</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCheck} />
                    <span>{t.saveChanges}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSettings, useSettingsStore } from '@/store/useSettingsStore';
import { useDialog } from '@/store/useDialogStore';
import { useToastStore } from '@/store/useToastStore';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDatabase,
  faDownload,
  faUpload,
  faServer,
  faRotateRight,
  faFileCode,
  faImage,
  faTrash,
  faCheck,
  faTriangleExclamation,
  faSpinner,
  faPlay,
  faShieldHalved,
  faInfoCircle,
  faClock,
  faTable,
  faLayerGroup,
  faSliders,
  faArrowDown,
  faHardDrive,
} from '@fortawesome/free-solid-svg-icons';

interface BackupStats {
  totalRecords: number;
  totalFiles: number;
  totalFileSizeBytes: number;
  tableCounts: Record<string, number>;
  lastBackupAt?: string | null;
}

interface ServerSnapshotItem {
  filename: string;
  sizeBytes: number;
  formattedSize: string;
  createdAt: string;
  scope: 'full' | 'db' | 'media' | 'unknown';
  isAuto: boolean;
  ageDays: number;
  isExpired: boolean;
}

interface ValidationResult {
  valid: boolean;
  type: 'full' | 'db' | 'media' | 'unknown';
  manifest?: any;
  tableCounts: Record<string, number>;
  totalRecords: number;
  fileCount: number;
  totalFileSizeBytes: number;
  errors: string[];
  warnings: string[];
}

export default function AdminBackupClient() {
  const { language, serverSettings } = useSettings();
  const { setServerSettings } = useSettingsStore();
  const t = translations[language].adminBackup;
  const isRTL = language === 'ar';
  const dialog = useDialog();
  const toast = useToastStore();

  const [activeTab, setActiveTab] = useState<'export' | 'restore' | 'schedule' | 'snapshots'>('export');

  // Stats
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Snapshots
  const [snapshots, setSnapshots] = useState<ServerSnapshotItem[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);

  // Export State
  const [exportingScope, setExportingScope] = useState<string | null>(null);

  // Restore State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [autoSnapshot, setAutoSnapshot] = useState(true);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreProgressMsg, setRestoreProgressMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scheduled Auto-Backup Settings Form
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(serverSettings?.autoBackupEnabled || false);
  const [autoBackupFrequency, setAutoBackupFrequency] = useState(serverSettings?.autoBackupFrequency || 'daily');
  const [autoBackupScope, setAutoBackupScope] = useState(serverSettings?.autoBackupScope || 'full');
  const [autoBackupRetentionDays, setAutoBackupRetentionDays] = useState(serverSettings?.autoBackupRetentionDays || 7);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [runningAutoNow, setRunningAutoNow] = useState(false);

  // Fetch initial metrics & snapshots
  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await fetch('/api/admin/backup/export');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to load stats:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchSnapshots = async () => {
    try {
      setLoadingSnapshots(true);
      const res = await fetch('/api/admin/backup/snapshots');
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.snapshots || []);
      }
    } catch (e) {
      console.error('Failed to load snapshots:', e);
    } finally {
      setLoadingSnapshots(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchSnapshots();
  }, []);

  // Update schedule state when serverSettings change
  useEffect(() => {
    if (serverSettings) {
      setAutoBackupEnabled(serverSettings.autoBackupEnabled || false);
      setAutoBackupFrequency(serverSettings.autoBackupFrequency || 'daily');
      setAutoBackupScope(serverSettings.autoBackupScope || 'full');
      setAutoBackupRetentionDays(serverSettings.autoBackupRetentionDays || 7);
    }
  }, [serverSettings]);

  // Handle Export / Download
  const handleExport = async (scope: 'full' | 'db' | 'media', saveOnServer: boolean = false) => {
    try {
      setExportingScope(saveOnServer ? 'server' : scope);
      if (saveOnServer) {
        const res = await fetch('/api/admin/backup/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope, saveOnServer: true }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.add(
            language === 'ar' ? 'تم إنشاء وحفظ لقطة الخادم بنجاح!' : 'Server snapshot created successfully!',
            'success'
          );
          fetchSnapshots();
          fetchStats();
        } else {
          dialog.alert({
            title: language === 'ar' ? 'خطأ في النسخ الاحتياطي' : 'Backup Error',
            message: data.error || (language === 'ar' ? 'فشل إنشاء لقطة الخادم' : 'Failed to create snapshot'),
            variant: 'danger',
          });
        }
      } else {
        const res = await fetch('/api/admin/backup/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope, saveOnServer: false }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Export failed');
        }

        const blob = await res.blob();
        const contentDisp = res.headers.get('content-disposition') || '';
        let filename = `store-backup-${scope}.zip`;
        const match = contentDisp.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        toast.add(
          language === 'ar' ? 'تم تنزيل النسخة الاحتياطية بنجاح!' : 'Backup downloaded successfully!',
          'success'
        );
      }
    } catch (error: any) {
      dialog.alert({
        title: language === 'ar' ? 'خطأ في التصدير' : 'Export Failed',
        message: error.message || (language === 'ar' ? 'حدث خطأ أثناء تحميل النسخة' : 'Error generating download'),
        variant: 'danger',
      });
    } finally {
      setExportingScope(null);
    }
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSelectedSnapshot(null);
      setValidationResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSelectedSnapshot(null);
      setValidationResult(null);
    }
  };

  // Validate / Inspect Backup File
  const handleValidate = async () => {
    if (!selectedFile && !selectedSnapshot) {
      dialog.alert({
        title: language === 'ar' ? 'لم يتم تحديد ملف' : 'No File Selected',
        message: language === 'ar' ? 'يرجى اختيار ملف نسخة احتياطية أو لقطة أولاً للفحص.' : 'Please select a backup file or snapshot to inspect.',
        variant: 'warning',
      });
      return;
    }

    try {
      setValidating(true);
      let res: Response;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('validateOnly', 'true');
        res = await fetch('/api/admin/backup/restore', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/admin/backup/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ snapshotFilename: selectedSnapshot, validateOnly: true }),
        });
      }

      const data = await res.json();
      if (res.ok && data.valid) {
        setValidationResult(data);
        setShowPreviewModal(true);
      } else {
        dialog.alert({
          title: language === 'ar' ? 'ملف غير صالح' : 'Invalid Backup File',
          message: data.errors?.join('\n') || (language === 'ar' ? 'تعذر التحقق من محتويات الملف.' : 'Could not validate file contents.'),
          variant: 'danger',
        });
      }
    } catch (e: any) {
      dialog.alert({
        title: language === 'ar' ? 'خطأ في الفحص' : 'Validation Error',
        message: e.message || 'Error inspecting backup',
        variant: 'danger',
      });
    } finally {
      setValidating(false);
    }
  };

  // Execute Restore
  const handleExecuteRestore = async () => {
    setShowPreviewModal(false);

    const confirmed = await dialog.confirm({
      title: t.confirmRestoreTitle,
      message: t.confirmRestoreWarning,
      confirmText: language === 'ar' ? 'نعم، استعادة الآن' : 'Yes, Restore Now',
      cancelText: language === 'ar' ? 'إلغاء' : 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      setRestoring(true);
      setRestoreProgressMsg(language === 'ar' ? 'جاري قراءة الأرشيف وفحص المحتويات...' : 'Reading archive & inspecting...');

      let res: Response;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('mode', restoreMode);
        formData.append('autoSnapshot', autoSnapshot ? 'true' : 'false');
        setRestoreProgressMsg(language === 'ar' ? 'جاري استبدال البيانات وفك ضغط ملفات الوسائط...' : 'Restoring records and unzipping media...');

        res = await fetch('/api/admin/backup/restore', {
          method: 'POST',
          body: formData,
        });
      } else {
        setRestoreProgressMsg(language === 'ar' ? 'جاري تطبيق اللقطة المختارة من الخادم...' : 'Applying server snapshot...');
        res = await fetch('/api/admin/backup/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            snapshotFilename: selectedSnapshot,
            mode: restoreMode,
            autoSnapshot,
          }),
        });
      }

      const data = await res.json();

      if (res.ok && data.success) {
        toast.add(t.restoreSuccess, 'success');
        dialog.alert({
          title: language === 'ar' ? 'تمت الاستعادة بنجاح!' : 'Restore Complete!',
          message: `${language === 'ar' ? 'تمت استعادة' : 'Successfully restored'} ${data.result.totalRecordsRestored || 0} ${language === 'ar' ? 'سجل بقاعدة البيانات و' : 'records and'} ${data.result.filesRestored || 0} ${language === 'ar' ? 'ملف وسائط في' : 'media files in'} ${(data.result.durationMs / 1000).toFixed(1)}s.${data.result.snapshotCreated ? `\n(${language === 'ar' ? 'تم حفظ لقطة أمان مسبقة:' : 'Pre-restore safety snapshot:'} ${data.result.snapshotCreated})` : ''}`,
          variant: 'success',
        });
        fetchStats();
        fetchSnapshots();
        setSelectedFile(null);
        setSelectedSnapshot(null);
        setValidationResult(null);
      } else {
        throw new Error(data.error || (language === 'ar' ? 'فشلت الاستعادة' : 'Restore failed'));
      }
    } catch (e: any) {
      dialog.alert({
        title: language === 'ar' ? 'فشلت الاستعادة' : 'Restore Failed',
        message: e.message || t.restoreError,
        variant: 'danger',
      });
    } finally {
      setRestoring(false);
      setRestoreProgressMsg('');
    }
  };

  // Download Snapshot
  const handleDownloadSnapshot = async (filename: string) => {
    try {
      const res = await fetch('/api/admin/backup/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });

      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      dialog.alert({
        title: language === 'ar' ? 'خطأ في التنزيل' : 'Download Error',
        message: e.message,
        variant: 'danger',
      });
    }
  };

  // Delete Snapshot
  const handleDeleteSnapshot = async (filename: string) => {
    const confirmed = await dialog.confirm({
      title: t.deleteSnapshot,
      message: t.deleteConfirm,
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/backup/snapshots?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.add(
          language === 'ar' ? 'تم حذف اللقطة بنجاح.' : 'Snapshot deleted successfully.',
          'success'
        );
        fetchSnapshots();
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (e: any) {
      dialog.alert({
        title: language === 'ar' ? 'خطأ في الحذف' : 'Delete Failed',
        message: e.message,
        variant: 'danger',
      });
    }
  };

  // Save Scheduled Auto-Backup Settings
  const handleSaveSchedule = async () => {
    try {
      setSavingSchedule(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoBackupEnabled,
          autoBackupFrequency,
          autoBackupScope,
          autoBackupRetentionDays: Number(autoBackupRetentionDays),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setServerSettings(updated);
        toast.add(
          language === 'ar' ? 'تم حفظ إعدادات النسخ الاحتياطي التلقائي!' : 'Schedule settings saved successfully!',
          'success'
        );
      } else {
        const err = await res.json();
        throw new Error(err.error);
      }
    } catch (e: any) {
      dialog.alert({
        title: language === 'ar' ? 'خطأ في الحفظ' : 'Save Error',
        message: e.message,
        variant: 'danger',
      });
    } finally {
      setSavingSchedule(false);
    }
  };

  // Run Auto Backup & Retention Pruning Now
  const handleRunAutoNow = async () => {
    try {
      setRunningAutoNow(true);
      const res = await fetch('/api/admin/backup/auto', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.add(
          `${language === 'ar' ? 'تم تنفيذ الفحص بنجاح!' : 'Auto process ran!'} (${data.pruned?.prunedCount || 0} ${language === 'ar' ? 'نسخ منتهية تم حذفها' : 'expired backups pruned'})`,
          'success'
        );
        fetchSnapshots();
        fetchStats();
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      dialog.alert({
        title: language === 'ar' ? 'خطأ في التنفيذ' : 'Execution Error',
        message: e.message,
        variant: 'danger',
      });
    } finally {
      setRunningAutoNow(false);
    }
  };

  function formatBytesLocal(bytes: number) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 end-0 -mt-8 -me-8 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold tracking-wide">
              <FontAwesomeIcon icon={faShieldHalved} className="text-xs" />
              <span>{language === 'ar' ? 'أمان النظام واستمرارية الأعمال' : 'System Security & Continuity'}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">{t.title}</h1>
            <p className="text-xs md:text-sm text-indigo-200/90 max-w-3xl leading-relaxed">{t.subtitle}</p>
          </div>

          <button
            onClick={() => {
              fetchStats();
              fetchSnapshots();
            }}
            title={language === 'ar' ? 'تحديث البيانات' : 'Refresh Metrics'}
            className="self-start md:self-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold transition shadow-sm backdrop-blur-sm"
          >
            <FontAwesomeIcon icon={faRotateRight} className={loadingStats || loadingSnapshots ? 'animate-spin' : ''} />
            <span>{language === 'ar' ? 'تحديث الإحصائيات' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* System Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total DB Records */}
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border theme-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-xl flex-shrink-0">
            <FontAwesomeIcon icon={faTable} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[var(--text-muted)]">{t.totalRecords}</p>
            <p className="text-xl font-black text-[var(--text-primary)]">
              {loadingStats ? <FontAwesomeIcon icon={faSpinner} className="animate-spin text-sm" /> : stats?.totalRecords.toLocaleString() || '0'}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{language === 'ar' ? 'عبر 14 جدول بيانات' : 'Across 14 database models'}</p>
          </div>
        </div>

        {/* Total Uploads */}
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border theme-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-xl flex-shrink-0">
            <FontAwesomeIcon icon={faImage} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[var(--text-muted)]">{t.totalFiles}</p>
            <p className="text-xl font-black text-[var(--text-primary)]">
              {loadingStats ? <FontAwesomeIcon icon={faSpinner} className="animate-spin text-sm" /> : stats?.totalFiles.toLocaleString() || '0'}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{language === 'ar' ? 'صور المنتجات والإيصالات' : 'Product images & payment proofs'}</p>
          </div>
        </div>

        {/* Storage Size */}
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border theme-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xl flex-shrink-0">
            <FontAwesomeIcon icon={faHardDrive} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[var(--text-muted)]">{t.totalSize}</p>
            <p className="text-xl font-black text-[var(--text-primary)]">
              {loadingStats ? <FontAwesomeIcon icon={faSpinner} className="animate-spin text-sm" /> : formatBytesLocal(stats?.totalFileSizeBytes || 0)}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{language === 'ar' ? 'مجلد public/uploads' : 'public/uploads folder'}</p>
          </div>
        </div>

        {/* Last Auto Backup */}
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border theme-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center text-xl flex-shrink-0">
            <FontAwesomeIcon icon={faClock} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[var(--text-muted)]">{t.lastBackup}</p>
            <p className="text-sm font-bold text-[var(--text-primary)] truncate max-w-[170px]">
              {stats?.lastBackupAt ? new Date(stats.lastBackupAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : t.never}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              {autoBackupEnabled ? (
                <span className="text-emerald-600 font-semibold">{language === 'ar' ? 'الجدولة نشطة' : 'Schedule Active'}</span>
              ) : (
                <span className="text-amber-600 font-semibold">{language === 'ar' ? 'الجدولة معطلة' : 'Schedule Inactive'}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b theme-border pb-3">
        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
            activeTab === 'export'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
          }`}
        >
          <FontAwesomeIcon icon={faDownload} />
          <span>{t.exportSectionTitle}</span>
        </button>

        <button
          onClick={() => setActiveTab('restore')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
            activeTab === 'restore'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
          }`}
        >
          <FontAwesomeIcon icon={faUpload} />
          <span>{t.restoreSectionTitle}</span>
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
            activeTab === 'schedule'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
          }`}
        >
          <FontAwesomeIcon icon={faSliders} />
          <span>{t.autoScheduleTitle}</span>
        </button>

        <button
          onClick={() => setActiveTab('snapshots')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
            activeTab === 'snapshots'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
          }`}
        >
          <FontAwesomeIcon icon={faServer} />
          <span>{t.snapshotsTitle}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-bold">
            {snapshots.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXPORT / GENERATE BACKUP */}
      {/* ========================================================================= */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-extrabold text-[var(--text-primary)]">{t.exportSectionTitle}</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t.exportSectionDesc}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1. Full Backup */}
            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border-2 border-indigo-500/30 hover:border-indigo-500 shadow-sm transition flex flex-col justify-between relative group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl shadow-lg shadow-indigo-600/30">
                  <FontAwesomeIcon icon={faLayerGroup} />
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300">
                  {language === 'ar' ? 'موصى به للنسخ الكامل' : 'Recommended All-in-One'}
                </div>
                <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
                  {language === 'ar' ? 'النسخة الاحتياطية الشاملة' : 'Complete Full Backup'}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {language === 'ar'
                    ? 'أرشيف مضغوط ZIP يحتوي على ملف قاعدة البيانات JSON وكافة الصور والوسائط المرفوعة وبيان التحقق.'
                    : 'A ZIP archive containing complete database JSON export, all uploaded media images, and manifest.'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t theme-border space-y-2">
                <button
                  onClick={() => handleExport('full', false)}
                  disabled={exportingScope !== null}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {exportingScope === 'full' ? (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  ) : (
                    <FontAwesomeIcon icon={faDownload} />
                  )}
                  <span>{language === 'ar' ? 'تنزيل الأرشيف (.ZIP)' : 'Download Full ZIP'}</span>
                </button>
              </div>
            </div>

            {/* 2. Database Only */}
            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border theme-border hover:border-indigo-400 shadow-sm transition flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xl">
                  <FontAwesomeIcon icon={faFileCode} />
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300">
                  {language === 'ar' ? 'سريع وخفيف الحجم' : 'Fast & Lightweight'}
                </div>
                <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
                  {language === 'ar' ? 'قاعدة البيانات فقط' : 'Database Only'}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {language === 'ar'
                    ? 'ملف JSON نقي يضم كافة المنتجات، الطلبات، المستخدمين، التقييمات، والإعدادات.'
                    : 'Clean JSON export containing all tables, products, orders, users, reviews, and store settings.'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t theme-border">
                <button
                  onClick={() => handleExport('db', false)}
                  disabled={exportingScope !== null}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[var(--bg-primary)] hover:bg-emerald-600 hover:text-white border theme-border text-[var(--text-primary)] text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  {exportingScope === 'db' ? (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  ) : (
                    <FontAwesomeIcon icon={faDownload} />
                  )}
                  <span>{language === 'ar' ? 'تنزيل ملف البيانات (.JSON)' : 'Download Database (.JSON)'}</span>
                </button>
              </div>
            </div>

            {/* 3. Media Only */}
            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border theme-border hover:border-indigo-400 shadow-sm transition flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-xl">
                  <FontAwesomeIcon icon={faImage} />
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-300">
                  {language === 'ar' ? 'ملفات وصور' : 'Media Archive'}
                </div>
                <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
                  {language === 'ar' ? 'الصور والوسائط المرفوعة' : 'Media Uploads Only'}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {language === 'ar'
                    ? 'أرشيف ZIP يضم جميع صور المنتجات، الفئات، والشعارات، وإيصالات التحويل البنكي.'
                    : 'ZIP archive of all product images, category banners, store logos, and payment receipts.'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t theme-border">
                <button
                  onClick={() => handleExport('media', false)}
                  disabled={exportingScope !== null}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[var(--bg-primary)] hover:bg-amber-600 hover:text-white border theme-border text-[var(--text-primary)] text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  {exportingScope === 'media' ? (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  ) : (
                    <FontAwesomeIcon icon={faDownload} />
                  )}
                  <span>{language === 'ar' ? 'تنزيل الوسائط (.ZIP)' : 'Download Media (.ZIP)'}</span>
                </button>
              </div>
            </div>

            {/* 4. Instant Server Snapshot */}
            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border theme-border hover:border-purple-400 shadow-sm transition flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center text-xl">
                  <FontAwesomeIcon icon={faServer} />
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-300">
                  {language === 'ar' ? 'حفظ مباشر على الخادم' : '1-Click Server Snapshot'}
                </div>
                <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
                  {language === 'ar' ? 'لقطة فورية على الخادم' : 'Instant Server Snapshot'}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {language === 'ar'
                    ? 'يحفظ نسخة شاملة مباشرة في مجلد النسخ الاحتياطية على الخادم لاستعادتها وقت الحاجة.'
                    : 'Creates an instant snapshot saved directly on disk for quick one-click rollback anytime.'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t theme-border">
                <button
                  onClick={() => handleExport('full', true)}
                  disabled={exportingScope !== null}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-md shadow-purple-600/20 disabled:opacity-50"
                >
                  {exportingScope === 'server' ? (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  ) : (
                    <FontAwesomeIcon icon={faPlay} />
                  )}
                  <span>{language === 'ar' ? 'إنشاء لقطة الآن' : 'Create Snapshot Now'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RESTORE ENGINE */}
      {/* ========================================================================= */}
      {activeTab === 'restore' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-extrabold text-[var(--text-primary)]">{t.restoreSectionTitle}</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t.restoreSectionDesc}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Dropzone & File Selection */}
            <div className="lg:col-span-2 space-y-5">
              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                  selectedFile
                    ? 'border-indigo-500 bg-indigo-500/5'
                    : 'border-[var(--border-color)] hover:border-indigo-400 bg-[var(--bg-surface)]'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".zip,.json"
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-2xl">
                  <FontAwesomeIcon icon={faUpload} />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-[var(--text-primary)]">{t.dropzoneTitle}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{t.dropzoneHint}</p>
                </div>

                {selectedFile && (
                  <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md">
                    <FontAwesomeIcon icon={faCheck} />
                    <span>{selectedFile.name}</span>
                    <span className="opacity-80">({formatBytesLocal(selectedFile.size)})</span>
                  </div>
                )}
              </div>

              {/* Or Select from Saved Server Snapshots */}
              {snapshots.length > 0 && (
                <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border theme-border space-y-3">
                  <p className="text-xs font-extrabold text-[var(--text-primary)]">
                    {language === 'ar' ? 'أو اختر لقطة محفوظة مسبقاً على الخادم:' : 'Or choose a saved server snapshot:'}
                  </p>
                  <select
                    value={selectedSnapshot || ''}
                    onChange={(e) => {
                      setSelectedSnapshot(e.target.value || null);
                      setSelectedFile(null);
                      setValidationResult(null);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border theme-border bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">{language === 'ar' ? '-- اختر لقطة من القائمة --' : '-- Select a snapshot --'}</option>
                    {snapshots.map((snap) => (
                      <option key={snap.filename} value={snap.filename}>
                        {snap.filename} ({snap.formattedSize}) - {new Date(snap.createdAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Right Column: Restore Options & Execution */}
            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border theme-border shadow-sm space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                  <FontAwesomeIcon icon={faSliders} className="text-indigo-500" />
                  <span>{t.restoreMode}</span>
                </h3>

                {/* Mode Options */}
                <div className="space-y-2">
                  <label
                    onClick={() => setRestoreMode('replace')}
                    className={`block p-3.5 rounded-xl border cursor-pointer transition ${
                      restoreMode === 'replace'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-600'
                        : 'border-[var(--border-color)] hover:bg-[var(--bg-primary)]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="restoreMode"
                        checked={restoreMode === 'replace'}
                        onChange={() => setRestoreMode('replace')}
                        className="mt-0.5 text-indigo-600"
                      />
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)]">
                          {language === 'ar' ? 'استبدال كامل (Replace & Rebuild)' : 'Clean Replace & Rebuild'}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                          {language === 'ar'
                            ? 'يمسح البيانات الحالية ويبني قاعدة البيانات طبقاً للنسخة (موصى به لمنع التكرار).'
                            : 'Wipes current live tables and replaces with backup snapshot cleanly.'}
                        </p>
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => setRestoreMode('merge')}
                    className={`block p-3.5 rounded-xl border cursor-pointer transition ${
                      restoreMode === 'merge'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-600'
                        : 'border-[var(--border-color)] hover:bg-[var(--bg-primary)]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="restoreMode"
                        checked={restoreMode === 'merge'}
                        onChange={() => setRestoreMode('merge')}
                        className="mt-0.5 text-indigo-600"
                      />
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)]">
                          {language === 'ar' ? 'دمج وتحديث (Merge & Upsert)' : 'Merge & Update'}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                          {language === 'ar'
                            ? 'يحدث السجلات المتطابقة ويضيف المفقود دون حذف العناصر الأخرى.'
                            : 'Updates existing matching records and inserts missing data without wiping.'}
                        </p>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Auto Safety Snapshot checkbox */}
                <label className="flex items-center gap-2.5 pt-2 cursor-pointer text-xs font-semibold text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={autoSnapshot}
                    onChange={(e) => setAutoSnapshot(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>{t.autoSnapshotOption}</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t theme-border space-y-2">
                <button
                  onClick={handleValidate}
                  disabled={validating || restoring || (!selectedFile && !selectedSnapshot)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[var(--bg-primary)] hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border theme-border text-[var(--text-primary)] hover:text-indigo-600 text-xs font-bold transition disabled:opacity-50"
                >
                  {validating ? (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  ) : (
                    <FontAwesomeIcon icon={faInfoCircle} />
                  )}
                  <span>{t.validateBtn}</span>
                </button>

                <button
                  onClick={handleValidate}
                  disabled={restoring || (!selectedFile && !selectedSnapshot)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {restoring ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                      <span>{restoreProgressMsg || t.restoring}</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faUpload} />
                      <span>{t.startRestoreBtn}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SCHEDULED AUTO-BACKUP & RETENTION POLICY */}
      {/* ========================================================================= */}
      {activeTab === 'schedule' && (
        <div className="max-w-4xl space-y-6">
          <div>
            <h2 className="text-base font-extrabold text-[var(--text-primary)]">{t.autoScheduleTitle}</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t.autoScheduleDesc}</p>
          </div>

          <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border theme-border shadow-sm space-y-6">
            {/* Toggle Active */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-primary)] border theme-border">
              <div>
                <p className="text-xs font-extrabold text-[var(--text-primary)]">{t.autoBackupEnable}</p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  {language === 'ar'
                    ? 'إنشاء نسخ احتياطية دورية بالخلفية بدون تدخل يدوي'
                    : 'Create automatic recurring backups in the background'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoBackupEnabled}
                onClick={() => setAutoBackupEnabled(!autoBackupEnabled)}
                className={`w-12 h-6 rounded-full transition-colors duration-200 relative p-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                  autoBackupEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                    autoBackupEnabled
                      ? isRTL
                        ? '-translate-x-6'
                        : 'translate-x-6'
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Scope & Frequency Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Frequency */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-[var(--text-primary)]">{t.frequencyLabel}</label>
                <select
                  value={autoBackupFrequency}
                  onChange={(e) => setAutoBackupFrequency(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border theme-border bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="every_12_hours">{t.freqEvery12Hours}</option>
                  <option value="daily">{t.freqDaily}</option>
                  <option value="every_3_days">{t.freqEvery3Days}</option>
                  <option value="weekly">{t.freqWeekly}</option>
                </select>
              </div>

              {/* Scope */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-[var(--text-primary)]">{t.scopeLabel}</label>
                <select
                  value={autoBackupScope}
                  onChange={(e) => setAutoBackupScope(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border theme-border bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="full">{t.scopeFull}</option>
                  <option value="db">{t.scopeDb}</option>
                  <option value="media">{t.scopeMedia}</option>
                </select>
              </div>
            </div>

            {/* Retention Policy (Auto-delete older than 1 week / 7 days) */}
            <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
              <div className="flex items-center gap-2 text-amber-600 font-extrabold text-xs">
                <FontAwesomeIcon icon={faTrash} />
                <span>{t.retentionLabel}</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {language === 'ar'
                  ? 'سيتم فحص مجلد النسخ الاحتياطية دورياً، وحذف أي لقطات أقدم من المدة المحددة لتوفير مساحة التخزين تلقائياً.'
                  : 'Old backup snapshots exceeding the selected retention duration will be automatically pruned to save disk space.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {[
                  { days: 7, label: t.retention1Week },
                  { days: 14, label: t.retention2Weeks },
                  { days: 30, label: t.retention1Month },
                ].map((item) => (
                  <button
                    key={item.days}
                    type="button"
                    onClick={() => setAutoBackupRetentionDays(item.days)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition text-center ${
                      autoBackupRetentionDays === item.days
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-amber-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t theme-border">
              <button
                onClick={handleRunAutoNow}
                disabled={runningAutoNow}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] hover:bg-slate-200 dark:hover:bg-slate-800 border theme-border text-[var(--text-primary)] text-xs font-bold transition disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faRotateRight} className={runningAutoNow ? 'animate-spin' : ''} />
                <span>{t.runAutoNowBtn}</span>
              </button>

              <button
                onClick={handleSaveSchedule}
                disabled={savingSchedule}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {savingSchedule ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faCheck} />}
                <span>{t.saveScheduleBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SERVER SNAPSHOTS ARCHIVE */}
      {/* ========================================================================= */}
      {activeTab === 'snapshots' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-[var(--text-primary)]">{t.snapshotsTitle}</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t.snapshotsDesc}</p>
            </div>

            <button
              onClick={() => handleExport('full', true)}
              disabled={exportingScope !== null}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
            >
              <FontAwesomeIcon icon={faPlay} />
              <span>{t.serverSnapshotBtn}</span>
            </button>
          </div>

          <div className="rounded-2xl bg-[var(--bg-surface)] border theme-border shadow-sm overflow-hidden">
            {loadingSnapshots ? (
              <div className="p-12 text-center text-xs text-[var(--text-muted)]">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-lg mb-2 text-indigo-500" />
                <p>{language === 'ar' ? 'جاري تحميل لقطات الخادم...' : 'Loading snapshots...'}</p>
              </div>
            ) : snapshots.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-xl mx-auto">
                  <FontAwesomeIcon icon={faServer} />
                </div>
                <p className="text-xs text-[var(--text-muted)]">{t.noSnapshots}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs">
                  <thead className="bg-[var(--bg-primary)] border-b theme-border text-[var(--text-muted)] font-extrabold">
                    <tr>
                      <th className="py-3.5 px-4 text-start">{t.snapshotName}</th>
                      <th className="py-3.5 px-4 text-start">{t.snapshotScope}</th>
                      <th className="py-3.5 px-4 text-start">{t.snapshotSize}</th>
                      <th className="py-3.5 px-4 text-start">{t.snapshotDate}</th>
                      <th className="py-3.5 px-4 text-start">{t.snapshotAge}</th>
                      <th className="py-3.5 px-4 text-start">{t.snapshotStatus}</th>
                      <th className="py-3.5 px-4 text-end">{t.snapshotActions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y theme-border">
                    {snapshots.map((snap) => (
                      <tr key={snap.filename} className="hover:bg-[var(--bg-primary)]/50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-[var(--text-primary)]">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[240px]">{snap.filename}</span>
                            {snap.isAuto && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 font-bold">
                                {t.autoTag}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                              snap.scope === 'full'
                                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300'
                                : snap.scope === 'db'
                                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300'
                                : 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-300'
                            }`}
                          >
                            {snap.scope.toUpperCase()}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-[var(--text-secondary)] font-medium">
                          {snap.formattedSize}
                        </td>

                        <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                          {new Date(snap.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                          {snap.ageDays} {t.retentionDaysSuffix}
                        </td>

                        <td className="py-3.5 px-4">
                          {snap.isExpired ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                              <FontAwesomeIcon icon={faTriangleExclamation} />
                              <span>{t.statusExpired}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                              <FontAwesomeIcon icon={faCheck} />
                              <span>{t.statusValid}</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-end">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleDownloadSnapshot(snap.filename)}
                              title={t.download}
                              className="p-2 rounded-lg bg-[var(--bg-primary)] hover:bg-indigo-600 hover:text-white text-[var(--text-secondary)] transition shadow-sm"
                            >
                              <FontAwesomeIcon icon={faDownload} />
                            </button>

                            <button
                              onClick={() => {
                                setSelectedSnapshot(snap.filename);
                                setSelectedFile(null);
                                setActiveTab('restore');
                              }}
                              title={t.restoreSnapshot}
                              className="p-2 rounded-lg bg-[var(--bg-primary)] hover:bg-emerald-600 hover:text-white text-[var(--text-secondary)] transition shadow-sm"
                            >
                              <FontAwesomeIcon icon={faUpload} />
                            </button>

                            <button
                              onClick={() => handleDeleteSnapshot(snap.filename)}
                              title={t.deleteSnapshot}
                              className="p-2 rounded-lg bg-[var(--bg-primary)] hover:bg-red-600 hover:text-white text-[var(--text-secondary)] transition shadow-sm"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PREVIEW & VERIFICATION BREAKDOWN BEFORE RESTORE */}
      {/* ========================================================================= */}
      {showPreviewModal && validationResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border theme-border rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b theme-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg">
                  <FontAwesomeIcon icon={faShieldHalved} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[var(--text-primary)]">{t.previewTitle}</h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {selectedFile ? selectedFile.name : selectedSnapshot}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Validation Breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[var(--bg-primary)] border theme-border text-center">
                <p className="text-[10px] font-semibold text-[var(--text-muted)]">{t.previewType}</p>
                <p className="text-xs font-black text-indigo-600 uppercase mt-0.5">{validationResult.type}</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-primary)] border theme-border text-center">
                <p className="text-[10px] font-semibold text-[var(--text-muted)]">{t.previewRecords}</p>
                <p className="text-xs font-black text-[var(--text-primary)] mt-0.5">
                  {validationResult.totalRecords.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-primary)] border theme-border text-center">
                <p className="text-[10px] font-semibold text-[var(--text-muted)]">{t.previewFiles}</p>
                <p className="text-xs font-black text-[var(--text-primary)] mt-0.5">
                  {validationResult.fileCount.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Table Details */}
            {Object.keys(validationResult.tableCounts).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-extrabold text-[var(--text-primary)]">{t.previewTables}:</p>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 rounded-xl bg-[var(--bg-primary)] border theme-border text-xs">
                  {Object.entries(validationResult.tableCounts).map(([table, count]) => (
                    <div key={table} className="flex justify-between items-center py-1 px-2 rounded-lg bg-[var(--bg-surface)]">
                      <span className="text-[var(--text-secondary)] font-medium">{table}</span>
                      <span className="font-mono font-bold text-indigo-600">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {validationResult.warnings.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                {validationResult.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5 font-medium">
                    <FontAwesomeIcon icon={faTriangleExclamation} />
                    <span>{w}</span>
                  </p>
                ))}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t theme-border">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2.5 rounded-xl border theme-border text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>

              <button
                onClick={handleExecuteRestore}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition shadow-lg shadow-indigo-600/20"
              >
                {t.startRestoreBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

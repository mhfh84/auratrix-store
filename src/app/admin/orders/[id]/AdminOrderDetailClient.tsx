'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSettings } from '@/store/useSettingsStore';
import { useDialog } from '@/store/useDialogStore';
import { useToastStore } from '@/store/useToastStore';
import { translations } from '@/lib/translations';
import { formatPrice } from '@/lib/currencies';
import { getImageUrl } from '@/lib/images';
import { getProductUrl } from '@/lib/productUrl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
  faReceipt,
  faTrash,
  faSpinner,
  faTruck,
  faBox,
  faUser,
  faUserSecret,
  faPhone,
  faEnvelope,
  faMapMarkerAlt,
  faBolt,
  faCoins,
  faCreditCard,
  faMoneyBillWave,
  faEye,
  faDownload,
  faTimes,
  faSave,
  faCalendarAlt,
  faExternalLinkAlt,
  faLock,
  faTag,
  faCheck,
  faCircleCheck,
  faExclamationTriangle,
  faShieldHalved,
  faComments,
  faPaperPlane,
  faUserTie,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import InvoiceModal from '@/components/InvoiceModal';
import ShippingFlyerModal from '@/components/ShippingFlyerModal';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  colorName?: string | null;
  product: {
    id: string;
    title: string;
    images?: string;
  };
}

export interface TeamNote {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

interface OrderDetail {
  id: string;
  totalAmount: number;
  promoCode?: string | null;
  discountAmount?: number;
  pointsUsed?: number;
  pointsEarned?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentProof?: string | null;
  depositAmount?: number;
  depositStatus?: string;
  remainingAmount?: number;
  trackingNumber?: string | null;
  estimatedDelivery?: string | null;
  status: string;
  adminNotes?: string | null;
  createdAt: string;
  userId: string | null;
  guestInfo: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    state?: string | null;
    city?: string | null;
    address?: string | null;
  } | null;
  orderItems: OrderItem[];
}

const ALL_STATUSES = ['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
const ALL_PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const;

const STATUS_BADGES: Record<string, { bg: string; text: string; border: string; labelEn: string; labelAr: string }> = {
  PENDING: {
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-700/50',
    labelEn: 'Pending Verification',
    labelAr: 'قيد المراجعة والانتظار',
  },
  SHIPPED: {
    bg: 'bg-sky-50 dark:bg-sky-950/50',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-700/50',
    labelEn: 'Shipped with Courier',
    labelAr: 'تم الشحن مع المندوب',
  },
  DELIVERED: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-700/50',
    labelEn: 'Delivered Successfully',
    labelAr: 'تم التسليم بنجاح',
  },
  CANCELLED: {
    bg: 'bg-red-50 dark:bg-red-950/50',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-700/50',
    labelEn: 'Order Cancelled',
    labelAr: 'تم إلغاء الطلب',
  },
};

export default function AdminOrderDetailClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { language, currency, serverSettings } = useSettings();
  const isRTL = language === 'ar';
  const t = translations[language].adminOrderDetail;
  const tOrders = translations[language].adminOrders;
  const dialog = useDialog();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [isUpdatingDeposit, setIsUpdatingDeposit] = useState(false);

  // Tracking form
  const [trackingNumber, setTrackingNumber] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [isSavingTracking, setIsSavingTracking] = useState(false);

  // Team Notes state
  const [newNoteText, setNewNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // Proof Zoom
  const [zoomProofUrl, setZoomProofUrl] = useState<string | null>(null);

  // Invoice Modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Shipping Flyer Modal
  const [showShippingFlyerModal, setShowShippingFlyerModal] = useState(false);

  // Fetch Order Details
  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        setTrackingNumber(data.trackingNumber || '');
        setEstimatedDelivery(data.estimatedDelivery ? data.estimatedDelivery.slice(0, 10) : '');
      } else {
        useToastStore.getState().error(t.orderNotFound);
      }
    } catch (err) {
      useToastStore.getState().error(isRTL ? 'خطأ في الاتصال بالخادم' : 'Server connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // Notes Parsing Helper
  const getNotesList = (): TeamNote[] => {
    if (!order?.adminNotes) return [];
    try {
      const parsed = JSON.parse(order.adminNotes);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === 'string' && parsed.trim()) {
        return [{ id: 'legacy-1', author: isRTL ? 'فريق العمل' : 'Staff', text: parsed, createdAt: order.createdAt }];
      }
    } catch (e) {
      if (order.adminNotes.trim()) {
        return [{ id: 'legacy-1', author: isRTL ? 'فريق العمل' : 'Staff', text: order.adminNotes, createdAt: order.createdAt }];
      }
    }
    return [];
  };

  // Add Note Handler
  const handleAddNote = async (overrideText?: string) => {
    const textToSave = (overrideText || newNoteText).trim();
    if (!textToSave || !order) return;

    setIsAddingNote(true);
    const existingNotes = getNotesList();
    const newNote: TeamNote = {
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      author: session?.user?.name || (isRTL ? 'أحد المشرفين' : 'Staff Member'),
      text: textToSave,
      createdAt: new Date().toISOString(),
    };

    const updatedNotesList = [newNote, ...existingNotes];
    const notesJson = JSON.stringify(updatedNotesList);

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: notesJson }),
      });

      if (res.ok) {
        useToastStore.getState().success(t.noteAddedSuccess);
        setNewNoteText('');
        const updated = await res.json();
        setOrder(updated);
      } else {
        useToastStore.getState().error(isRTL ? 'تعذر حفظ الملاحظة' : 'Failed to save note');
      }
    } catch (err) {
      useToastStore.getState().error(isRTL ? 'خطأ أثناء حفظ الملاحظة' : 'Error saving note');
    } finally {
      setIsAddingNote(false);
    }
  };

  // Delete Note Handler
  const handleDeleteNote = async (noteId: string) => {
    if (!order) return;
    setDeletingNoteId(noteId);
    const existingNotes = getNotesList();
    const updatedNotesList = existingNotes.filter((n) => n.id !== noteId);
    const notesJson = updatedNotesList.length > 0 ? JSON.stringify(updatedNotesList) : null;

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: notesJson }),
      });

      if (res.ok) {
        useToastStore.getState().success(t.noteDeletedSuccess);
        const updated = await res.json();
        setOrder(updated);
      } else {
        useToastStore.getState().error(isRTL ? 'تعذر حذف الملاحظة' : 'Failed to delete note');
      }
    } catch (err) {
      useToastStore.getState().error(isRTL ? 'خطأ أثناء حذف الملاحظة' : 'Error deleting note');
    } finally {
      setDeletingNoteId(null);
    }
  };

  // Status Change
  const handleStatusChange = async (status: string) => {
    if (!order || order.status === status) return;
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        useToastStore.getState().success(t.statusUpdatedSuccess);
        const updated = await res.json();
        setOrder(updated);
      } else {
        useToastStore.getState().error(t.statusUpdateError);
      }
    } catch (err) {
      useToastStore.getState().error(t.statusUpdateError);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Payment Status Change
  const handlePaymentStatusChange = async (paymentStatus: string) => {
    if (!order || order.paymentStatus === paymentStatus) return;
    setIsUpdatingPayment(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus }),
      });
      if (res.ok) {
        useToastStore.getState().success(t.paymentStatusUpdatedSuccess);
        const updated = await res.json();
        setOrder(updated);
      } else {
        useToastStore.getState().error(t.paymentStatusUpdateError);
      }
    } catch (err) {
      useToastStore.getState().error(t.paymentStatusUpdateError);
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  // Deposit Status Change
  const handleDepositStatusChange = async (depositStatus: string) => {
    if (!order || order.depositStatus === depositStatus) return;
    setIsUpdatingDeposit(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depositStatus }),
      });
      if (res.ok) {
        useToastStore.getState().success(t.depositStatusUpdatedSuccess);
        const updated = await res.json();
        setOrder(updated);
      } else {
        useToastStore.getState().error(t.depositStatusUpdateError);
      }
    } catch (err) {
      useToastStore.getState().error(t.depositStatusUpdateError);
    } finally {
      setIsUpdatingDeposit(false);
    }
  };

  // Save Tracking Info
  const handleSaveTracking = async () => {
    if (!order) return;
    setIsSavingTracking(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingNumber: trackingNumber.trim() || null,
          estimatedDelivery: estimatedDelivery || null,
        }),
      });
      if (res.ok) {
        useToastStore.getState().success(t.trackingSavedSuccess);
        const updated = await res.json();
        setOrder(updated);
      } else {
        useToastStore.getState().error(t.trackingSaveError);
      }
    } catch (err) {
      useToastStore.getState().error(t.trackingSaveError);
    } finally {
      setIsSavingTracking(false);
    }
  };

  // Delete Order
  const handleDeleteOrder = async () => {
    const ok = await dialog.confirm({
      title: t.deleteConfirmTitle,
      message: t.deleteConfirmMsg,
      confirmText: t.deleteOrder,
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
      if (res.ok) {
        useToastStore.getState().success(isRTL ? 'تم حذف الطلب بنجاح' : 'Order deleted successfully');
        router.push('/admin/orders');
      } else {
        useToastStore.getState().error(isRTL ? 'تعذر حذف الطلب' : 'Failed to delete order');
      }
    } catch (err) {
      useToastStore.getState().error(isRTL ? 'خطأ أثناء حذف الطلب' : 'Error deleting order');
    }
  };

  // Payment Badge Helper
  const getPaymentBadge = (method?: string) => {
    switch (method) {
      case 'INSTAPAY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            <FontAwesomeIcon icon={faBolt} className="text-purple-500" />
            <span>InstaPay</span>
          </span>
        );
      case 'FAWRY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <FontAwesomeIcon icon={faCoins} className="text-amber-500" />
            <span>Fawry</span>
          </span>
        );
      case 'CARD':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
            <FontAwesomeIcon icon={faCreditCard} className="text-sky-500" />
            <span>Credit / Debit Card</span>
          </span>
        );
      case 'COD':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <FontAwesomeIcon icon={faMoneyBillWave} className="text-emerald-500" />
            <span>Cash on Delivery (COD)</span>
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-[var(--text-secondary)]">
          {isRTL ? 'جاري تحميل تفاصيل الطلب...' : 'Loading order details...'}
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="glass-panel rounded-3xl border theme-border p-12 text-center max-w-xl mx-auto space-y-4 my-12">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-amber-500 text-2xl">
          <FontAwesomeIcon icon={faExclamationTriangle} />
        </div>
        <h2 className="text-lg font-black text-[var(--text-primary)]">{t.orderNotFound}</h2>
        <p className="text-xs text-[var(--text-secondary)]">{t.orderNotFoundDesc}</p>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/20"
        >
          <FontAwesomeIcon icon={isRTL ? faArrowRight : faArrowLeft} />
          <span>{t.backToOrders}</span>
        </Link>
      </div>
    );
  }

  // Parse Guest Info if available
  let guestInfoObj: any = null;
  try {
    if (order.guestInfo) {
      guestInfoObj = typeof order.guestInfo === 'string' ? JSON.parse(order.guestInfo) : order.guestInfo;
    }
  } catch (e) {}

  const isGuest = !order.userId;
  const buyerName = guestInfoObj?.name || order.user?.name || '—';
  const buyerEmail = guestInfoObj?.email || order.user?.email || '—';
  const buyerPhone = guestInfoObj?.phone || order.user?.phone || '';
  const buyerGov = guestInfoObj?.state || order.user?.state || '';
  const buyerCity = guestInfoObj?.city || order.user?.city || '';
  const buyerStreet = guestInfoObj?.address || order.user?.address || '';
  const addrParts = [buyerStreet, buyerCity, buyerGov].filter(Boolean);
  const fullAddress = addrParts.length > 0 ? addrParts.join(' - ') : (buyerStreet || isRTL ? 'غير محدد' : 'Not specified');

  // Math
  const itemsSubtotal = order.orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const currentStatusBadge = STATUS_BADGES[order.status] || STATUS_BADGES.PENDING;
  const teamNotesList = getNotesList();

  // Courier template
  const trackingUrlTemplate = serverSettings?.courierTrackingUrlTemplate;
  const courierDirectUrl = trackingUrlTemplate && order.trackingNumber
    ? trackingUrlTemplate.replace('{trackingNumber}', encodeURIComponent(order.trackingNumber))
    : null;

  // Quick preset notes
  const quickNotePresets = isRTL
    ? [
        '📞 تم التواصل مع العميل وتأكيد تفاصيل الطلب والعنوان.',
        '🚚 العميل طلب التوصيل في الفترة المسائية.',
        '💬 تم إرسال رسالة تفاصيل الشحنة للعميل عبر واتساب.',
        '⚠️ يرجى معاينة الطرد والتأكد من اللون قبل التسليم.',
      ]
    : [
        '📞 Customer contacted and order details confirmed.',
        '🚚 Customer requested delivery during evening hours.',
        '💬 Shipment details shared with customer via WhatsApp.',
        '⚠️ Please ensure item color and package integrity before dispatch.',
      ];

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Breadcrumbs & Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] hover:text-indigo-600 transition"
          >
            <FontAwesomeIcon icon={isRTL ? faArrowRight : faArrowLeft} className="text-[11px]" />
            <span>{t.backToOrders}</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] font-mono tracking-tight">
              #{order.id.slice(-8).toUpperCase()}
            </h1>
            <span
              className={`px-3 py-1 rounded-xl text-xs font-extrabold border ${currentStatusBadge.border} ${currentStatusBadge.bg} ${currentStatusBadge.text}`}
            >
              {isRTL ? currentStatusBadge.labelAr : currentStatusBadge.labelEn}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-2">
            <span>{t.placedOn}:</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {new Date(order.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowShippingFlyerModal(true)}
            id="btn-open-shipping-flyer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 transition shadow-xs cursor-pointer"
          >
            <FontAwesomeIcon icon={faTruck} className="text-amber-600 dark:text-amber-400" />
            <span>{t.printShippingFlyer || (isRTL ? 'طباعة فلاير الشحن' : 'Shipping Flyer')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowInvoiceModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] border theme-border rounded-xl text-xs font-bold text-[var(--text-primary)] transition shadow-xs cursor-pointer"
          >
            <FontAwesomeIcon icon={faReceipt} className="text-indigo-500" />
            <span>{t.printInvoice}</span>
          </button>

          <button
            type="button"
            onClick={handleDeleteOrder}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <FontAwesomeIcon icon={faTrash} />
            <span>{t.deleteOrder}</span>
          </button>
        </div>
      </div>

      {/* ── Status Lifecycle Bar ── */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border theme-border space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b theme-border">
          <div>
            <h2 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              {t.timelineTitle}
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {isRTL ? 'قم بتحديث حالة الشحنة والطلب مباشرة' : 'Update the order and fulfillment state directly'}
            </p>
          </div>

          {/* Quick status selector */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[var(--bg-surface)] p-1 rounded-xl border theme-border">
            {ALL_STATUSES.map((statusKey) => {
              const isActive = order.status === statusKey;
              const badge = STATUS_BADGES[statusKey];
              return (
                <button
                  key={statusKey}
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusChange(statusKey)}
                  className={`text-xs font-extrabold px-3 py-1.5 rounded-lg border transition cursor-pointer disabled:opacity-50 ${
                    isActive
                      ? `${badge.bg} ${badge.text} ${badge.border} shadow-xs`
                      : 'bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
                  }`}
                >
                  {isUpdatingStatus && isActive ? (
                    <FontAwesomeIcon icon={faSpinner} spin className="me-1.5" />
                  ) : isActive ? (
                    <FontAwesomeIcon icon={faCheck} className="me-1.5 text-[10px]" />
                  ) : null}
                  <span>{tOrders.statuses[statusKey]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Visual Progress Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {[
            { key: 'PENDING', label: isRTL ? '1. تم استلام الطلب' : '1. Placed', icon: faBox },
            { key: 'SHIPPED', label: isRTL ? '2. خرج للشحن' : '2. Dispatched', icon: faTruck },
            { key: 'DELIVERED', label: isRTL ? '3. تم التسليم' : '3. Delivered', icon: faCircleCheck },
            { key: 'CANCELLED', label: isRTL ? 'ملغي' : 'Cancelled', icon: faTimes },
          ].map((step) => {
            const isCurrent = order.status === step.key;
            return (
              <div
                key={step.key}
                className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition ${
                  isCurrent
                    ? `${STATUS_BADGES[step.key].bg} ${STATUS_BADGES[step.key].text} ${STATUS_BADGES[step.key].border} ring-1 ring-indigo-400/20`
                    : 'bg-[var(--bg-surface)]/50 border-transparent text-[var(--text-muted)] opacity-60'
                }`}
              >
                <FontAwesomeIcon icon={step.icon} className="text-sm flex-shrink-0" />
                <span className="truncate">{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main 2-Column Dashboard Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Column (Items, Math & Team Notes) - 7 Cols ── */}
        <div className="lg:col-span-7 space-y-6">
          {/* Ordered Products Card */}
          <div className="glass-panel rounded-2xl border theme-border p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b theme-border">
              <h2 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <FontAwesomeIcon icon={faBox} />
                <span>{t.itemsOrdered}</span>
              </h2>
              <span className="text-[11px] font-bold text-[var(--text-secondary)] bg-[var(--bg-surface)] px-2.5 py-1 rounded-lg border theme-border">
                {order.orderItems.length} {t.itemsCount}
              </span>
            </div>

            <div className="divide-y theme-border">
              {order.orderItems.map((item) => (
                <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center gap-3.5 group">
                  {/* Thumbnail */}
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 border theme-border flex-shrink-0">
                    {item.product?.images ? (
                      <Image
                        src={getImageUrl(item.product.images)}
                        alt={item.product.title}
                        fill
                        className="object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        <FontAwesomeIcon icon={faBox} />
                      </div>
                    )}
                  </div>

                  {/* Title & Specs */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {item.product?.id ? (
                      <Link
                        href={getProductUrl(item.product)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-xs text-[var(--text-primary)] hover:text-indigo-600 dark:hover:text-indigo-400 transition inline-flex items-center gap-1.5 truncate max-w-full"
                      >
                        <span className="truncate">{item.product.title}</span>
                        <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px] text-[var(--text-muted)]" />
                      </Link>
                    ) : (
                      <p className="font-bold text-xs text-[var(--text-primary)] truncate">{item.product?.title || 'Product'}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                      {item.colorName && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800/40 text-[10px]">
                          <FontAwesomeIcon icon={faTag} className="text-[9px]" />
                          <span>{item.colorName}</span>
                        </span>
                      )}
                      <span>
                        {item.quantity} × {formatPrice(item.price, currency, language)}
                      </span>
                    </div>
                  </div>

                  {/* Total line price */}
                  <div className="text-end flex-shrink-0 font-mono font-black text-xs text-[var(--text-primary)]">
                    {formatPrice(item.price * item.quantity, currency, language)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown Card */}
          <div className="glass-panel rounded-2xl border theme-border p-5 space-y-3.5 shadow-sm">
            <h2 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider pb-3 border-b theme-border flex items-center gap-2">
              <FontAwesomeIcon icon={faMoneyBillWave} />
              <span>{t.financialSummary}</span>
            </h2>

            <div className="space-y-2.5 text-xs">
              {/* Items subtotal */}
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span>{t.subtotal}</span>
                <span className="font-mono font-semibold text-[var(--text-primary)]">
                  {formatPrice(itemsSubtotal, currency, language)}
                </span>
              </div>

              {/* Promo code discount */}
              {order.promoCode && (
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faTag} />
                    <span>{t.promoDiscount} ({order.promoCode})</span>
                  </span>
                  <span className="font-mono">
                    -{formatPrice(order.discountAmount || 0, currency, language)}
                  </span>
                </div>
              )}

              {/* Loyalty points discount */}
              {Boolean(order.pointsUsed && order.pointsUsed > 0) && (
                <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 font-bold">
                  <span>{t.pointsDiscount} ({order.pointsUsed} pts)</span>
                  <span className="font-mono">
                    -{formatPrice((order.pointsUsed || 0) / (serverSettings?.pointsRedemptionRate || 20), currency, language)}
                  </span>
                </div>
              )}

              {/* COD fee if applicable */}
              {order.paymentMethod === 'COD' && Boolean(serverSettings?.paymentCodExtraFee && serverSettings.paymentCodExtraFee > 0) && (
                <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 font-semibold">
                  <span>{t.codFee}</span>
                  <span className="font-mono">
                    +{formatPrice(serverSettings.paymentCodExtraFee || 0, currency, language)}
                  </span>
                </div>
              )}

              {/* Grand Total Row */}
              <div className="pt-3 border-t theme-border flex items-center justify-between text-sm font-black text-[var(--text-primary)]">
                <span>{t.grandTotal}</span>
                <span className="text-base text-indigo-600 dark:text-indigo-400 font-mono">
                  {formatPrice(order.totalAmount, currency, language)}
                </span>
              </div>

              {/* Deposit & Remaining Math if deposit configured */}
              {Boolean(order.depositAmount && order.depositAmount > 0) && (
                <div className="mt-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
                    <span className="flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faLock} className="text-amber-500" />
                      <span>{t.depositPaid}</span>
                    </span>
                    <span className="font-mono">
                      {formatPrice(order.depositAmount || 0, currency, language)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-black text-[var(--text-primary)] pt-1.5 border-t border-amber-500/20">
                    <span className="text-emerald-600 dark:text-emerald-400">{t.remainingToCollect}</span>
                    <span className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                      {formatPrice(order.remainingAmount || (order.totalAmount - (order.depositAmount || 0)), currency, language)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment & Deposit Verification Station */}
          <div className="glass-panel rounded-2xl border theme-border p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b theme-border">
              <h2 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <FontAwesomeIcon icon={faCreditCard} />
                <span>{t.paymentCard}</span>
              </h2>
              {getPaymentBadge(order.paymentMethod)}
            </div>

            {/* Payment Status Switcher */}
            <div className="space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block">
                {t.paymentStatusLabel}:
              </span>
              <div className="inline-flex flex-wrap items-center gap-1.5 bg-[var(--bg-surface)] p-1 rounded-xl border theme-border w-full">
                {ALL_PAYMENT_STATUSES.map((pStatus) => {
                  const isActive = (order.paymentStatus || 'PENDING') === pStatus;
                  const pColors: Record<string, string> = {
                    PENDING: 'bg-amber-500 text-white',
                    PAID: 'bg-emerald-600 text-white',
                    FAILED: 'bg-red-600 text-white',
                    REFUNDED: 'bg-purple-600 text-white',
                  };
                  return (
                    <button
                      key={pStatus}
                      type="button"
                      disabled={isUpdatingPayment}
                      onClick={() => handlePaymentStatusChange(pStatus)}
                      className={`text-[10px] font-extrabold px-3 py-1 rounded-lg transition cursor-pointer disabled:opacity-50 ${
                        isActive
                          ? `${pColors[pStatus]} shadow-sm`
                          : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
                      }`}
                    >
                      {pStatus}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Proof Preview if present */}
            {order.paymentProof ? (
              <div className="p-3.5 bg-[var(--bg-surface)] rounded-xl border theme-border space-y-2.5">
                <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block">
                  {t.paymentProofTitle}
                </span>

                <div className="flex items-center justify-between gap-3">
                  <div
                    onClick={() => setZoomProofUrl(order.paymentProof!)}
                    className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 border theme-border flex-shrink-0 cursor-pointer group shadow-sm"
                    title={t.viewProof}
                  >
                    <Image
                      src={getImageUrl(order.paymentProof)}
                      alt="Payment Proof"
                      fill
                      className="object-cover group-hover:scale-110 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs">
                      <FontAwesomeIcon icon={faEye} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setZoomProofUrl(order.paymentProof!)}
                      className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-700/50 text-indigo-600 dark:text-indigo-300 font-bold text-xs rounded-xl hover:bg-indigo-100 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <FontAwesomeIcon icon={faEye} />
                      <span>{t.viewProof}</span>
                    </button>
                    <a
                      href={order.paymentProof}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-[var(--bg-card)] border theme-border text-[var(--text-primary)] font-bold text-xs rounded-xl hover:bg-[var(--bg-surface)] transition flex items-center gap-1.5"
                    >
                      <FontAwesomeIcon icon={faDownload} />
                      <span>{t.downloadProof}</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (order.paymentMethod === 'INSTAPAY' || (order.depositAmount && order.depositAmount > 0)) ? (
              <p className="text-[11px] text-amber-600 font-semibold">
                {t.noProofAttached}
              </p>
            ) : null}

            {/* Deposit Status Manager */}
            {Boolean(order.depositAmount && order.depositAmount > 0) && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-black text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faShieldHalved} className="text-amber-500" />
                    <span>{t.depositSectionTitle}</span>
                  </div>
                  <span className="font-mono text-amber-700 dark:text-amber-300">
                    {formatPrice(order.depositAmount || 0, currency, language)}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block">
                    {t.depositStatusLabel}:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: 'PENDING_PROOF', label: isRTL ? 'معلق / قيد المراجعة' : 'Pending Review', bg: 'bg-amber-500 text-white' },
                      { id: 'VERIFIED', label: isRTL ? 'مؤكد ومستلم' : 'Deposit Verified', bg: 'bg-emerald-600 text-white' },
                      { id: 'WAIVED', label: isRTL ? 'معفى / تجاوز' : 'Waived', bg: 'bg-slate-600 text-white' },
                    ].map((dSt) => {
                      const isDepActive = (order.depositStatus || 'PENDING_PROOF') === dSt.id;
                      return (
                        <button
                          key={dSt.id}
                          type="button"
                          disabled={isUpdatingDeposit}
                          onClick={() => handleDepositStatusChange(dSt.id)}
                          className={`text-[10px] font-extrabold px-3 py-1 rounded-lg transition cursor-pointer disabled:opacity-50 ${
                            isDepActive
                              ? `${dSt.bg} shadow-sm`
                              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border theme-border hover:bg-[var(--bg-card)]'
                          }`}
                        >
                          {dSt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Internal Staff & Team Notes Card ── */}
          <div className="glass-panel rounded-2xl border theme-border p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b theme-border">
              <div>
                <h2 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                  <FontAwesomeIcon icon={faComments} />
                  <span>{t.teamNotesTitle}</span>
                </h2>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  {t.teamNotesSubtitle}
                </p>
              </div>
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/40 px-2.5 py-0.5 rounded-lg">
                {teamNotesList.length}
              </span>
            </div>

            {/* Quick Preset Note Chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                {isRTL ? 'إضافة سريعة لملاحظة متكررة:' : 'Quick Note Presets:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickNotePresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAddingNote}
                    onClick={() => handleAddNote(preset)}
                    className="text-[10px] font-bold text-start px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-[var(--text-secondary)] hover:text-indigo-600 dark:hover:text-indigo-300 border theme-border hover:border-indigo-300 transition cursor-pointer disabled:opacity-50"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* New Note Form */}
            <div className="space-y-2 pt-1">
              <textarea
                rows={3}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder={t.addNotePlaceholder}
                className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs rounded-xl p-3 border theme-border focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!newNoteText.trim() || isAddingNote}
                  onClick={() => handleAddNote()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isAddingNote ? (
                    <FontAwesomeIcon icon={faSpinner} spin />
                  ) : (
                    <FontAwesomeIcon icon={faPaperPlane} />
                  )}
                  <span>{isAddingNote ? t.addingNote : t.addNoteBtn}</span>
                </button>
              </div>
            </div>

            {/* Notes Stream List */}
            <div className="pt-2 border-t theme-border space-y-3">
              {teamNotesList.length === 0 ? (
                <div className="py-6 text-center text-xs text-[var(--text-muted)] font-semibold bg-[var(--bg-surface)]/50 rounded-xl border border-dashed theme-border">
                  {t.noNotes}
                </div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pe-1">
                  {teamNotesList.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-xl bg-[var(--bg-surface)] border theme-border space-y-1.5 transition hover:border-indigo-300"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px]">
                            <FontAwesomeIcon icon={faUserTie} />
                          </span>
                          <span className="font-bold text-[var(--text-primary)]">{note.author}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 font-mono">
                            <FontAwesomeIcon icon={faClock} className="text-[9px]" />
                            <span>
                              {new Date(note.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </span>
                          </span>
                          <button
                            type="button"
                            disabled={deletingNoteId === note.id}
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-[var(--text-muted)] hover:text-red-600 p-1 rounded-md transition"
                            title={t.deleteNote}
                          >
                            {deletingNoteId === note.id ? (
                              <FontAwesomeIcon icon={faSpinner} spin className="text-[10px]" />
                            ) : (
                              <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                            )}
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                        {note.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Column (Customer, Shipping, Tracking) - 5 Cols ── */}
        <div className="lg:col-span-5 space-y-6">
          {/* Customer Profile Card */}
          <div className="glass-panel rounded-2xl border theme-border p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b theme-border">
              <h2 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <FontAwesomeIcon icon={isGuest ? faUserSecret : faUser} />
                <span>{t.customerCard}</span>
              </h2>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-md font-bold ${
                  isGuest
                    ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                }`}
              >
                {isGuest ? t.guestCustomer : t.registeredUser}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">{t.fullName}</span>
                <p className="font-bold text-[var(--text-primary)] text-sm">{buyerName}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1">
                  <FontAwesomeIcon icon={faEnvelope} className="text-indigo-400" />
                  <span>{t.email}</span>
                </span>
                <p className="font-semibold text-[var(--text-primary)] truncate">{buyerEmail}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1">
                  <FontAwesomeIcon icon={faPhone} className="text-emerald-500" />
                  <span>{t.phone}</span>
                </span>
                <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                  {buyerPhone || '—'}
                </p>
              </div>

              {/* 1-Click WhatsApp & Direct Phone Actions */}
              {buyerPhone && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t theme-border">
                  <a
                    href={`tel:${buyerPhone}`}
                    className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition shadow-xs"
                    title={t.callCustomer}
                  >
                    <FontAwesomeIcon icon={faPhone} className="text-xs" />
                    <span>{t.callCustomer}</span>
                  </a>

                  <a
                    href={`https://wa.me/${buyerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                      isRTL
                        ? `مرحباً ${buyerName}، بخصوص طلبك رقم #${order.id.slice(-8).toUpperCase()} من متجر ${serverSettings?.storeName || 'المتجر'}.`
                        : `Hello ${buyerName}, regarding your order #${order.id.slice(-8).toUpperCase()} from ${serverSettings?.storeName || 'Store'}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs"
                    title={t.chatWhatsapp}
                  >
                    <FontAwesomeIcon icon={faWhatsapp} className="text-sm" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Delivery & Shipping Address Card */}
          <div className="glass-panel rounded-2xl border theme-border p-5 space-y-3.5 shadow-sm">
            <h2 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider pb-3 border-b theme-border flex items-center gap-2">
              <FontAwesomeIcon icon={faMapMarkerAlt} className="text-rose-500" />
              <span>{t.shippingCard}</span>
            </h2>

            <div className="space-y-2.5 text-xs">
              {(buyerGov || buyerCity) && (
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-[var(--bg-surface)] p-2.5 rounded-xl border theme-border">
                  {buyerGov && (
                    <div>
                      <span className="text-[var(--text-muted)] font-bold block">{t.governorate}:</span>
                      <span className="font-bold text-[var(--text-primary)]">{buyerGov}</span>
                    </div>
                  )}
                  {buyerCity && (
                    <div>
                      <span className="text-[var(--text-muted)] font-bold block">{t.cityArea}:</span>
                      <span className="font-bold text-[var(--text-primary)]">{buyerCity}</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
                  {t.streetAddress}
                </span>
                <p className="font-medium text-[var(--text-primary)] whitespace-pre-line leading-relaxed bg-[var(--bg-surface)] p-3 rounded-xl border theme-border text-xs">
                  {fullAddress}
                </p>
              </div>
            </div>
          </div>

          {/* Shipping & Tracking Manager Card */}
          <div className="glass-panel rounded-2xl border theme-border p-5 space-y-4 shadow-sm">
            <h2 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider pb-3 border-b theme-border flex items-center gap-2">
              <FontAwesomeIcon icon={faTruck} />
              <span>{t.trackingCard}</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-secondary)] mb-1">
                  {t.trackingNumberLabel}
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder={t.trackingPlaceholder}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs rounded-xl px-3.5 py-2.5 border theme-border focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-secondary)] mb-1 flex items-center gap-1">
                  <FontAwesomeIcon icon={faCalendarAlt} className="text-indigo-400" />
                  <span>{t.estimatedDeliveryLabel}</span>
                </label>
                <input
                  type="date"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs rounded-xl px-3.5 py-2.5 border theme-border focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between pt-1 gap-2 border-t theme-border pt-3">
                <button
                  type="button"
                  onClick={() => setShowShippingFlyerModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer"
                >
                  <FontAwesomeIcon icon={faTruck} />
                  <span>{isRTL ? 'معاينة وطباعة فلاير الشحن' : 'Print Shipping Flyer (AWB)'}</span>
                </button>

                {courierDirectUrl && (
                  <a
                    href={courierDirectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    <span>{t.trackWithCourier}</span>
                    <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[9px]" />
                  </a>
                )}

                <button
                  type="button"
                  disabled={isSavingTracking}
                  onClick={handleSaveTracking}
                  className="ms-auto inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-600/20"
                >
                  {isSavingTracking ? (
                    <FontAwesomeIcon icon={faSpinner} spin />
                  ) : (
                    <FontAwesomeIcon icon={faSave} />
                  )}
                  <span>{isSavingTracking ? t.savingTracking : t.saveTrackingBtn}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Proof Zoom Modal ── */}
      {zoomProofUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setZoomProofUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-[var(--bg-surface)] border theme-border rounded-3xl p-4 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b theme-border">
              <h3 className="font-extrabold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <FontAwesomeIcon icon={faShieldHalved} className="text-purple-600" />
                <span>{t.paymentProofTitle}</span>
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={zoomProofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 transition flex items-center gap-1.5"
                >
                  <FontAwesomeIcon icon={faExternalLinkAlt} />
                  <span>{isRTL ? 'فتح في نافذة جديدة' : 'Open in New Tab'}</span>
                </a>
                <button
                  type="button"
                  onClick={() => setZoomProofUrl(null)}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition cursor-pointer"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-base" />
                </button>
              </div>
            </div>

            <div className="relative w-full h-[70vh] rounded-2xl overflow-hidden bg-gray-950/20 flex items-center justify-center">
              <Image
                src={getImageUrl(zoomProofUrl)}
                alt="Proof Full"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice Modal ── */}
      {showInvoiceModal && (
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          order={order as any}
        />
      )}

      {/* ── Shipping Flyer Modal ── */}
      {showShippingFlyerModal && (
        <ShippingFlyerModal
          isOpen={showShippingFlyerModal}
          onClose={() => setShowShippingFlyerModal(false)}
          order={order as any}
        />
      )}
    </div>
  );
}

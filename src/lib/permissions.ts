export type PermissionId =
  | 'manage_dashboard'
  | 'manage_categories'
  | 'manage_products'
  | 'manage_orders'
  | 'manage_users'
  | 'manage_promocodes'
  | 'manage_reviews'
  | 'manage_returns'
  | 'manage_referrals'
  | 'manage_settings'
  | 'manage_backup';

export interface PermissionDefinition {
  id: PermissionId;
  key: string;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  path: string;
  category: 'core' | 'commerce' | 'engagement' | 'system';
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  {
    id: 'manage_dashboard',
    key: 'dashboard',
    nameEn: 'Dashboard & Metrics',
    nameAr: 'لوحة التحكم والمؤشرات',
    descEn: 'View sales analytics, revenue graphs, and store performance overview',
    descAr: 'عرض تحليلات المبيعات، ومخططات الأرباح، وملخص أداء المتجر',
    path: '/admin',
    category: 'core',
  },
  {
    id: 'manage_orders',
    key: 'orders',
    nameEn: 'Orders & Fulfillment',
    nameAr: 'الطلبات والشحن',
    descEn: 'Process customer orders, update statuses, assign courier tracking, and add internal notes',
    descAr: 'إدارة طلبات العملاء، وتعديل الحالات، وتعيين بيانات بوليصة الشحن، وإضافة ملاحظات الفريق',
    path: '/admin/orders',
    category: 'commerce',
  },
  {
    id: 'manage_products',
    key: 'products',
    nameEn: 'Products & Inventory',
    nameAr: 'المنتجات والمخزون',
    descEn: 'Create, update, delete products, manage color variants and stock counts',
    descAr: 'إضافة وتعديل وحذف المنتجات، وإدارة خيارات الألوان ومستويات المخزون',
    path: '/admin/products',
    category: 'commerce',
  },
  {
    id: 'manage_categories',
    key: 'categories',
    nameEn: 'Categories & Subcategories',
    nameAr: 'الأقسام والفئات',
    descEn: 'Organize catalog categories and hierarchy',
    descAr: 'تنظيم شجرة الأقسام والفئات الرئيسية والفرعية',
    path: '/admin/categories',
    category: 'commerce',
  },
  {
    id: 'manage_users',
    key: 'users',
    nameEn: 'Customers & User Directory',
    nameAr: 'المستخدمين وقاعدة العملاء',
    descEn: 'View registered users, guest buyers, and order history',
    descAr: 'عرض قائمة المستخدمين المسجلين، والعملاء الزوار، وسجل مشترياتهم',
    path: '/admin/users',
    category: 'core',
  },
  {
    id: 'manage_promocodes',
    key: 'promocodes',
    nameEn: 'Promo Codes & Discounts',
    nameAr: 'كوبونات الخصم والعروض',
    descEn: 'Create and configure promo codes, discounts, usage limits, and expiration dates',
    descAr: 'إنشاء وضبط أكواد الخصم، ونسب التخفيض، وحدود الاستخدام وتواريخ الصلاحية',
    path: '/admin/promocodes',
    category: 'engagement',
  },
  {
    id: 'manage_reviews',
    key: 'reviews',
    nameEn: 'Customer Reviews',
    nameAr: 'التقييمات والمراجعات',
    descEn: 'Moderate, approve, reject, and write official store replies to customer reviews',
    descAr: 'مراجعة وقبول أو رفض تقييمات المنتجات والرد عليها رسمياً',
    path: '/admin/reviews',
    category: 'engagement',
  },
  {
    id: 'manage_returns',
    key: 'returns',
    nameEn: 'Returns & Refunds',
    nameAr: 'طلبات الإرجاع والاسترداد',
    descEn: 'Review return requests, verify uploaded proof, approve/reject refunds',
    descAr: 'فحص طلبات الإرجاع، ومعاينة صور الإثبات، والموافقة على الاسترداد أو رفضه',
    path: '/admin/returns',
    category: 'commerce',
  },
  {
    id: 'manage_referrals',
    key: 'referrals',
    nameEn: 'Referral Program',
    nameAr: 'برنامج الإحالة والعمولات',
    descEn: 'View referral performance and affiliate activity',
    descAr: 'متابعة أداء برنامج الإحالة، وعمليات الشراء الناتجة ونقاط المكافآت',
    path: '/admin/referrals',
    category: 'engagement',
  },
  {
    id: 'manage_settings',
    key: 'settings',
    nameEn: 'Store Settings & Brand',
    nameAr: 'إعدادات المتجر والتخصيص',
    descEn: 'Modify store branding, payment gateways, announcements, theme colors, and policies',
    descAr: 'تعديل هوية المتجر، بوابات الدفع، شريط الإعلانات، ألوان الثيم وسياسات المتجر',
    path: '/admin/settings',
    category: 'system',
  },
  {
    id: 'manage_backup',
    key: 'backup',
    nameEn: 'Backups & Snapshots',
    nameAr: 'النسخ الاحتياطي وقاعدة البيانات',
    descEn: 'Export store data snapshots and create backups',
    descAr: 'تصدير نسخ احتياطية للبيانات وإنشاء لقطات الحفظ',
    path: '/admin/backup',
    category: 'system',
  },
];

export interface PermissionPreset {
  id: string;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  permissions: PermissionId[];
}

export const PERMISSION_PRESETS: PermissionPreset[] = [
  {
    id: 'orders_support',
    nameEn: 'Orders & Fulfillment',
    nameAr: 'إدارة الطلبات والشحن',
    descEn: 'Handles orders, fulfillment, tracking numbers, and returns',
    descAr: 'معالجة الطلبات، تحديث حالات الشحن، وإدارة طلبات الإرجاع',
    permissions: ['manage_dashboard', 'manage_orders', 'manage_returns', 'manage_users'],
  },
  {
    id: 'catalog_inventory',
    nameEn: 'Catalog & Inventory',
    nameAr: 'إدارة المنتجات والمخزون',
    descEn: 'Manages products, variants, stock, and categories',
    descAr: 'إدارة المنتجات وتفاصيلها، وتحديث المخزون والأقسام',
    permissions: ['manage_dashboard', 'manage_products', 'manage_categories'],
  },
  {
    id: 'marketing_reviews',
    nameEn: 'Marketing & Support',
    nameAr: 'التسويق وخدمة العملاء',
    descEn: 'Manages promo codes, customer reviews, and referral stats',
    descAr: 'إدارة كوبونات الخصم، وتقييمات العملاء، وبرنامج الإحالة',
    permissions: ['manage_dashboard', 'manage_promocodes', 'manage_reviews', 'manage_referrals', 'manage_users'],
  },
  {
    id: 'store_manager',
    nameEn: 'Store Operations Manager',
    nameAr: 'مدير عمليات المتجر',
    descEn: 'Access to all business operations except system backup and critical store settings',
    descAr: 'صلاحيات كاملة للعمليات التجارية مع استثناء الإعدادات الحساسة والنسخ الاحتياطي',
    permissions: [
      'manage_dashboard',
      'manage_orders',
      'manage_products',
      'manage_categories',
      'manage_users',
      'manage_promocodes',
      'manage_reviews',
      'manage_returns',
      'manage_referrals',
    ],
  },
  {
    id: 'full_moderator',
    nameEn: 'Full Moderator (All Modules)',
    nameAr: 'مشرف عام (جميع الصلاحيات)',
    descEn: 'Full access to all admin console sections',
    descAr: 'وصول شامل لجميع أقسام لوحة الإدارة',
    permissions: ALL_PERMISSIONS.map((p) => p.id),
  },
];

/**
 * Safely parse a user's permissions field which may be an array, a JSON string, or null
 */
export function parseUserPermissions(permissions: any): PermissionId[] {
  if (!permissions) return [];
  if (Array.isArray(permissions)) {
    return permissions.filter((p) => typeof p === 'string') as PermissionId[];
  }
  if (typeof permissions === 'string') {
    try {
      const parsed = JSON.parse(permissions);
      if (Array.isArray(parsed)) {
        return parsed as PermissionId[];
      }
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Check if a user (from session or database) has a specific permission
 */
export function hasPermission(
  user: any,
  permission: PermissionId
): boolean {
  if (!user || !user.role) return false;
  if (user.role === 'ADMIN') return true; // Full Admins always have access to everything
  if (user.role !== 'MODERATOR') return false; // Regular users have no admin access

  const perms = parseUserPermissions(user.permissions);
  return perms.includes(permission);
}

/**
 * Get the matching permission for a given admin URL pathname
 */
export function getPermissionForPath(pathname: string): PermissionId | null {
  if (pathname === '/admin') return 'manage_dashboard';
  if (pathname.startsWith('/admin/orders')) return 'manage_orders';
  if (pathname.startsWith('/admin/products')) return 'manage_products';
  if (pathname.startsWith('/admin/categories')) return 'manage_categories';
  if (pathname.startsWith('/admin/users')) return 'manage_users';
  if (pathname.startsWith('/admin/promocodes')) return 'manage_promocodes';
  if (pathname.startsWith('/admin/reviews')) return 'manage_reviews';
  if (pathname.startsWith('/admin/returns')) return 'manage_returns';
  if (pathname.startsWith('/admin/referrals')) return 'manage_referrals';
  if (pathname.startsWith('/admin/settings')) return 'manage_settings';
  if (pathname.startsWith('/admin/backup')) return 'manage_backup';
  return null;
}

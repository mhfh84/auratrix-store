/**
 * Shared TypeScript interfaces used across pages, components, and API routes.
 * Import from this file instead of using `any`.
 */

// ─── User ────────────────────────────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'MODERATOR' | 'USER';

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  loyaltyPoints: number;
  phone?: string | null;
  state?: string | null;
  city?: string | null;
  address?: string | null;
  referralCode?: string | null;
  createdAt: string;
  _count?: {
    orders: number;
    reviews: number;
  };
}

// ─── Address ─────────────────────────────────────────────────────────────────

export type AddressType = 'HOME' | 'WORK' | 'OTHER';

export interface AddressData {
  id: string;
  userId: string;
  title: string;
  addressType: AddressType;
  recipientName?: string | null;
  phone: string;
  state?: string | null;
  city: string;
  streetAddress: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Referral ─────────────────────────────────────────────────────────────────

export interface ReferralFriend {
  id: string;
  status: 'PENDING' | 'CONVERTED' | 'REWARDED';
  referredUser?: { name: string } | null;
  createdAt: string;
}

export interface ReferralData {
  referralCode: string;
  referralLink: string;
  totalReferred: number;
  totalConverted: number;
  totalPointsEarned: number;
  friends: ReferralFriend[];
}

// ─── Product ──────────────────────────────────────────────────────────────────

export interface ProductVariantData {
  id: string;
  colorName: string;
  colorHex: string;
  stockQuantity: number;
  image?: string | null;
}

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  parentId?: string | null;
  parent?: CategoryData | null;
  children?: CategoryData[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
  _count?: { products?: number; children?: number };
}

export interface ProductSummary {
  id: string;
  title: string;
  description: string;
  price: number;
  discountPercent: number;
  stockQuantity: number;
  images: string; // JSON string of URL array
  averageRating: number;
  ratingCount: number;
  saleEndsAt?: string | Date | null;
  categories?: any[];
  variants?: ProductVariantData[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
  _count?: { products?: number; children?: number };
}

export type ProductData = ProductSummary;

// ─── Order ────────────────────────────────────────────────────────────────────

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'COD' | 'CARD' | 'INSTAPAY' | 'FAWRY' | 'WALLETS';

export interface OrderItemData {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  colorName?: string | null;
  product?: {
    id: string;
    title: string;
    images: string;
  };
}

export interface OrderSummary {
  id: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  discountAmount: number;
  pointsUsed: number;
  pointsEarned: number;
  promoCode?: string | null;
  trackingNumber?: string | null;
  estimatedDelivery?: string | null;
  createdAt: string;
  updatedAt: string;
  orderItems: OrderItemData[];
}

// ─── Store Settings (subset used client-side) ─────────────────────────────────

export interface ClientStoreSettings {
  storeName: string;
  storeLogo: string;
  defaultCurrency: string;
  defaultLanguage: string;
  defaultTheme: string;
  loyaltyEnabled: boolean;
  pointsPerDollar: number;
  pointsRedemptionRate: number;
  minPointsToRedeem: number;
  referralEnabled: boolean;
  referralReferrerPoints: number;
  referralRefereeDiscount: number;
  returnWindowDays: number;
  shippingFee: number;
  taxRate: number;
  // Payment methods
  paymentCodEnabled: boolean;
  paymentInstapayEnabled: boolean;
  paymentFawryEnabled: boolean;
  paymentCardEnabled: boolean;
  paymentWalletsEnabled: boolean;
  // Social
  socialWhatsApp: string;
  socialWhatsAppEnabled: boolean;
  socialFacebook: string;
  socialFacebookEnabled: boolean;
  socialInstagram: string;
  socialInstagramEnabled: boolean;
}

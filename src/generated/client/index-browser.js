
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  password: 'password',
  role: 'role',
  permissions: 'permissions',
  loyaltyPoints: 'loyaltyPoints',
  phone: 'phone',
  state: 'state',
  city: 'city',
  address: 'address',
  referralCode: 'referralCode',
  referredById: 'referredById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AddressScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  addressType: 'addressType',
  recipientName: 'recipientName',
  phone: 'phone',
  state: 'state',
  city: 'city',
  streetAddress: 'streetAddress',
  isDefault: 'isDefault',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  description: 'description',
  image: 'image',
  parentId: 'parentId',
  createdAt: 'createdAt'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  price: 'price',
  discountPercent: 'discountPercent',
  stockQuantity: 'stockQuantity',
  images: 'images',
  averageRating: 'averageRating',
  ratingCount: 'ratingCount',
  saleEndsAt: 'saleEndsAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProductVariantScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  colorName: 'colorName',
  colorHex: 'colorHex',
  stockQuantity: 'stockQuantity',
  image: 'image',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReviewScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  userId: 'userId',
  authorName: 'authorName',
  authorEmail: 'authorEmail',
  rating: 'rating',
  comment: 'comment',
  isVerified: 'isVerified',
  status: 'status',
  adminReply: 'adminReply',
  adminRepliedAt: 'adminRepliedAt',
  createdAt: 'createdAt'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  guestInfo: 'guestInfo',
  totalAmount: 'totalAmount',
  promoCode: 'promoCode',
  discountAmount: 'discountAmount',
  pointsUsed: 'pointsUsed',
  pointsEarned: 'pointsEarned',
  paymentMethod: 'paymentMethod',
  paymentStatus: 'paymentStatus',
  paymentProof: 'paymentProof',
  depositAmount: 'depositAmount',
  depositStatus: 'depositStatus',
  remainingAmount: 'remainingAmount',
  trackingNumber: 'trackingNumber',
  estimatedDelivery: 'estimatedDelivery',
  status: 'status',
  referralCode: 'referralCode',
  adminNotes: 'adminNotes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PromoCodeScalarFieldEnum = {
  id: 'id',
  code: 'code',
  discountType: 'discountType',
  discountValue: 'discountValue',
  description: 'description',
  minOrderAmount: 'minOrderAmount',
  maxUses: 'maxUses',
  maxUsesPerUser: 'maxUsesPerUser',
  usedCount: 'usedCount',
  expiresAt: 'expiresAt',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  productId: 'productId',
  variantId: 'variantId',
  colorName: 'colorName',
  quantity: 'quantity',
  price: 'price'
};

exports.Prisma.PromoCodeIpUsageScalarFieldEnum = {
  id: 'id',
  code: 'code',
  ip: 'ip',
  fingerprintId: 'fingerprintId',
  usedAt: 'usedAt'
};

exports.Prisma.ReturnRequestScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  userId: 'userId',
  reason: 'reason',
  reasonDetails: 'reasonDetails',
  refundMethod: 'refundMethod',
  refundDetails: 'refundDetails',
  images: 'images',
  status: 'status',
  adminNotes: 'adminNotes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReferralRecordScalarFieldEnum = {
  id: 'id',
  referrerId: 'referrerId',
  referredUserId: 'referredUserId',
  orderId: 'orderId',
  status: 'status',
  rewardPoints: 'rewardPoints',
  discountGiven: 'discountGiven',
  createdAt: 'createdAt'
};

exports.Prisma.StoreSettingsScalarFieldEnum = {
  id: 'id',
  storeName: 'storeName',
  storeLogo: 'storeLogo',
  defaultCurrency: 'defaultCurrency',
  defaultLanguage: 'defaultLanguage',
  defaultTheme: 'defaultTheme',
  lightBgPrimary: 'lightBgPrimary',
  lightBgSurface: 'lightBgSurface',
  lightTextPrimary: 'lightTextPrimary',
  lightTextSecondary: 'lightTextSecondary',
  lightAccentColor: 'lightAccentColor',
  darkBgPrimary: 'darkBgPrimary',
  darkBgSurface: 'darkBgSurface',
  darkTextPrimary: 'darkTextPrimary',
  darkTextSecondary: 'darkTextSecondary',
  darkAccentColor: 'darkAccentColor',
  fontFamily: 'fontFamily',
  fontSize: 'fontSize',
  announcementEnabled: 'announcementEnabled',
  announcementText: 'announcementText',
  contactEmail: 'contactEmail',
  contactPhone: 'contactPhone',
  socialFacebook: 'socialFacebook',
  socialFacebookEnabled: 'socialFacebookEnabled',
  socialInstagram: 'socialInstagram',
  socialInstagramEnabled: 'socialInstagramEnabled',
  socialTwitter: 'socialTwitter',
  socialTwitterEnabled: 'socialTwitterEnabled',
  socialTikTok: 'socialTikTok',
  socialTikTokEnabled: 'socialTikTokEnabled',
  socialWhatsApp: 'socialWhatsApp',
  socialWhatsAppEnabled: 'socialWhatsAppEnabled',
  maintenanceMode: 'maintenanceMode',
  maintenanceMessage: 'maintenanceMessage',
  shippingFee: 'shippingFee',
  taxRate: 'taxRate',
  loyaltyEnabled: 'loyaltyEnabled',
  pointsPerDollar: 'pointsPerDollar',
  pointsRedemptionRate: 'pointsRedemptionRate',
  minPointsToRedeem: 'minPointsToRedeem',
  lowStockThreshold: 'lowStockThreshold',
  popupEnabled: 'popupEnabled',
  popupTitle: 'popupTitle',
  popupText: 'popupText',
  popupDiscountCode: 'popupDiscountCode',
  courierTrackingEnabled: 'courierTrackingEnabled',
  courierProvider: 'courierProvider',
  courierTrackingUrlTemplate: 'courierTrackingUrlTemplate',
  emailNotificationsEnabled: 'emailNotificationsEnabled',
  emailProvider: 'emailProvider',
  resendApiKey: 'resendApiKey',
  fromEmail: 'fromEmail',
  adminNotifyEmail: 'adminNotifyEmail',
  notifyOnNewOrder: 'notifyOnNewOrder',
  notifyOnStatusChange: 'notifyOnStatusChange',
  referralEnabled: 'referralEnabled',
  referralRefereeDiscount: 'referralRefereeDiscount',
  referralReferrerPoints: 'referralReferrerPoints',
  returnWindowDays: 'returnWindowDays',
  autoBackupEnabled: 'autoBackupEnabled',
  autoBackupFrequency: 'autoBackupFrequency',
  autoBackupScope: 'autoBackupScope',
  autoBackupRetentionDays: 'autoBackupRetentionDays',
  autoBackupTime: 'autoBackupTime',
  lastAutoBackupAt: 'lastAutoBackupAt',
  paymentCodEnabled: 'paymentCodEnabled',
  paymentCodExtraFee: 'paymentCodExtraFee',
  paymentCodInstructions: 'paymentCodInstructions',
  paymentInstapayEnabled: 'paymentInstapayEnabled',
  paymentInstapayAddress: 'paymentInstapayAddress',
  paymentInstapayPhone: 'paymentInstapayPhone',
  paymentInstapayInstructions: 'paymentInstapayInstructions',
  paymentFawryEnabled: 'paymentFawryEnabled',
  paymentFawryMerchantCode: 'paymentFawryMerchantCode',
  paymentFawrySecurityKey: 'paymentFawrySecurityKey',
  paymentFawryTestMode: 'paymentFawryTestMode',
  paymentFawryInstructions: 'paymentFawryInstructions',
  paymentCardEnabled: 'paymentCardEnabled',
  paymentCardGateway: 'paymentCardGateway',
  paymentCardPublishableKey: 'paymentCardPublishableKey',
  paymentCardSecretKey: 'paymentCardSecretKey',
  paymentCardTestMode: 'paymentCardTestMode',
  paymentCardInstructions: 'paymentCardInstructions',
  paymentWalletsEnabled: 'paymentWalletsEnabled',
  paymentWalletsNumber: 'paymentWalletsNumber',
  paymentWalletsInstructions: 'paymentWalletsInstructions',
  depositEnabled: 'depositEnabled',
  depositType: 'depositType',
  depositValue: 'depositValue',
  depositAppliesTo: 'depositAppliesTo',
  depositMinOrderTotal: 'depositMinOrderTotal',
  depositInstructions: 'depositInstructions',
  depositPolicyText: 'depositPolicyText',
  updatedAt: 'updatedAt'
};

exports.Prisma.PageViewScalarFieldEnum = {
  id: 'id',
  path: 'path',
  referrer: 'referrer',
  ip: 'ip',
  userAgent: 'userAgent',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  User: 'User',
  Address: 'Address',
  Category: 'Category',
  Product: 'Product',
  ProductVariant: 'ProductVariant',
  Review: 'Review',
  Order: 'Order',
  PromoCode: 'PromoCode',
  OrderItem: 'OrderItem',
  PromoCodeIpUsage: 'PromoCodeIpUsage',
  ReturnRequest: 'ReturnRequest',
  ReferralRecord: 'ReferralRecord',
  StoreSettings: 'StoreSettings',
  PageView: 'PageView'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)

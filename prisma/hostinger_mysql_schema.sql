-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'USER',
    `permissions` TEXT NOT NULL DEFAULT '[]',
    `loyaltyPoints` INTEGER NOT NULL DEFAULT 0,
    `phone` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `referralCode` VARCHAR(191) NULL,
    `referredById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_referralCode_key`(`referralCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Address` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL DEFAULT 'المنزل',
    `addressType` VARCHAR(191) NOT NULL DEFAULT 'HOME',
    `recipientName` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `streetAddress` TEXT NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Address_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `image` TEXT NULL,
    `parentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Category_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `price` DOUBLE NOT NULL,
    `discountPercent` DOUBLE NOT NULL DEFAULT 0,
    `stockQuantity` INTEGER NOT NULL DEFAULT 0,
    `images` TEXT NOT NULL DEFAULT '[]',
    `averageRating` DOUBLE NOT NULL DEFAULT 0,
    `ratingCount` INTEGER NOT NULL DEFAULT 0,
    `saleEndsAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductVariant` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `colorName` VARCHAR(191) NOT NULL,
    `colorHex` VARCHAR(191) NOT NULL DEFAULT '#6366f1',
    `stockQuantity` INTEGER NOT NULL DEFAULT 0,
    `image` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProductVariant_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Review` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `authorName` VARCHAR(191) NOT NULL,
    `authorEmail` VARCHAR(191) NULL,
    `rating` INTEGER NOT NULL DEFAULT 5,
    `comment` TEXT NOT NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'APPROVED',
    `adminReply` TEXT NULL,
    `adminRepliedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Review_productId_idx`(`productId`),
    INDEX `Review_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `guestInfo` TEXT NULL,
    `totalAmount` DOUBLE NOT NULL,
    `promoCode` VARCHAR(191) NULL,
    `discountAmount` DOUBLE NOT NULL DEFAULT 0,
    `pointsUsed` INTEGER NOT NULL DEFAULT 0,
    `pointsEarned` INTEGER NOT NULL DEFAULT 0,
    `paymentMethod` VARCHAR(191) NOT NULL DEFAULT 'COD',
    `paymentStatus` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `paymentProof` TEXT NULL,
    `depositAmount` DOUBLE NOT NULL DEFAULT 0,
    `depositStatus` VARCHAR(191) NOT NULL DEFAULT 'NONE',
    `remainingAmount` DOUBLE NOT NULL DEFAULT 0,
    `trackingNumber` VARCHAR(191) NULL,
    `estimatedDelivery` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `referralCode` VARCHAR(191) NULL,
    `adminNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Order_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PromoCode` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `discountType` VARCHAR(191) NOT NULL DEFAULT 'PERCENTAGE',
    `discountValue` DOUBLE NOT NULL,
    `description` TEXT NULL DEFAULT '',
    `minOrderAmount` DOUBLE NOT NULL DEFAULT 0,
    `maxUses` INTEGER NULL,
    `maxUsesPerUser` INTEGER NULL,
    `usedCount` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PromoCode_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NULL,
    `colorName` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL,
    `price` DOUBLE NOT NULL,

    INDEX `OrderItem_orderId_idx`(`orderId`),
    INDEX `OrderItem_productId_idx`(`productId`),
    INDEX `OrderItem_variantId_idx`(`variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PromoCodeIpUsage` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `ip` VARCHAR(191) NOT NULL,
    `fingerprintId` VARCHAR(191) NOT NULL DEFAULT '',
    `usedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PromoCodeIpUsage_code_ip_idx`(`code`, `ip`),
    INDEX `PromoCodeIpUsage_code_fingerprintId_idx`(`code`, `fingerprintId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReturnRequest` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NOT NULL,
    `reasonDetails` TEXT NULL,
    `refundMethod` VARCHAR(191) NOT NULL DEFAULT 'ORIGINAL',
    `refundDetails` TEXT NULL,
    `images` TEXT NOT NULL DEFAULT '[]',
    `status` VARCHAR(191) NOT NULL DEFAULT 'REQUESTED',
    `adminNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ReturnRequest_orderId_idx`(`orderId`),
    INDEX `ReturnRequest_userId_idx`(`userId`),
    INDEX `ReturnRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReferralRecord` (
    `id` VARCHAR(191) NOT NULL,
    `referrerId` VARCHAR(191) NOT NULL,
    `referredUserId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `rewardPoints` INTEGER NOT NULL DEFAULT 0,
    `discountGiven` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ReferralRecord_referredUserId_key`(`referredUserId`),
    INDEX `ReferralRecord_referrerId_idx`(`referrerId`),
    INDEX `ReferralRecord_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreSettings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `storeName` VARCHAR(191) NOT NULL DEFAULT 'Store',
    `storeLogo` TEXT NOT NULL DEFAULT '',
    `defaultCurrency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `defaultLanguage` VARCHAR(191) NOT NULL DEFAULT 'ar',
    `defaultTheme` VARCHAR(191) NOT NULL DEFAULT 'light',
    `lightBgPrimary` VARCHAR(191) NOT NULL DEFAULT '#f8fafc',
    `lightBgSurface` VARCHAR(191) NOT NULL DEFAULT '#ffffff',
    `lightTextPrimary` VARCHAR(191) NOT NULL DEFAULT '#0f172a',
    `lightTextSecondary` VARCHAR(191) NOT NULL DEFAULT '#475569',
    `lightAccentColor` VARCHAR(191) NOT NULL DEFAULT '#6366f1',
    `darkBgPrimary` VARCHAR(191) NOT NULL DEFAULT '#0b0f19',
    `darkBgSurface` VARCHAR(191) NOT NULL DEFAULT '#111827',
    `darkTextPrimary` VARCHAR(191) NOT NULL DEFAULT '#ffffff',
    `darkTextSecondary` VARCHAR(191) NOT NULL DEFAULT '#9ca3af',
    `darkAccentColor` VARCHAR(191) NOT NULL DEFAULT '#6366f1',
    `fontFamily` VARCHAR(191) NOT NULL DEFAULT 'sans-serif',
    `fontSize` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `announcementEnabled` BOOLEAN NOT NULL DEFAULT false,
    `announcementText` TEXT NOT NULL DEFAULT '🎉 خصم مميز على جميع المنتجات!',
    `contactEmail` VARCHAR(191) NOT NULL DEFAULT 'support@store.com',
    `contactPhone` VARCHAR(191) NOT NULL DEFAULT '+20 10 0000 0000',
    `socialFacebook` VARCHAR(191) NOT NULL DEFAULT 'https://facebook.com',
    `socialFacebookEnabled` BOOLEAN NOT NULL DEFAULT true,
    `socialInstagram` VARCHAR(191) NOT NULL DEFAULT 'https://instagram.com',
    `socialInstagramEnabled` BOOLEAN NOT NULL DEFAULT true,
    `socialTwitter` VARCHAR(191) NOT NULL DEFAULT 'https://twitter.com',
    `socialTwitterEnabled` BOOLEAN NOT NULL DEFAULT true,
    `socialTikTok` VARCHAR(191) NOT NULL DEFAULT 'https://tiktok.com',
    `socialTikTokEnabled` BOOLEAN NOT NULL DEFAULT true,
    `socialWhatsApp` VARCHAR(191) NOT NULL DEFAULT 'https://wa.me/201000000000',
    `socialWhatsAppEnabled` BOOLEAN NOT NULL DEFAULT true,
    `maintenanceMode` BOOLEAN NOT NULL DEFAULT false,
    `maintenanceMessage` TEXT NOT NULL DEFAULT 'المتجر تحت الصيانة حالياً وسنعود قريباً',
    `shippingFee` DOUBLE NOT NULL DEFAULT 0,
    `taxRate` DOUBLE NOT NULL DEFAULT 0,
    `loyaltyEnabled` BOOLEAN NOT NULL DEFAULT true,
    `pointsPerDollar` DOUBLE NOT NULL DEFAULT 1.0,
    `pointsRedemptionRate` DOUBLE NOT NULL DEFAULT 20.0,
    `minPointsToRedeem` INTEGER NOT NULL DEFAULT 20,
    `lowStockThreshold` INTEGER NOT NULL DEFAULT 5,
    `popupEnabled` BOOLEAN NOT NULL DEFAULT true,
    `popupTitle` TEXT NOT NULL DEFAULT '🎉 عرض خاص لزوارنا! | Special Offer for You!',
    `popupText` TEXT NOT NULL DEFAULT 'استمتع بخصم إضافي 10% على طلبك القادم | Enjoy an extra 10% off your next order',
    `popupDiscountCode` VARCHAR(191) NOT NULL DEFAULT 'WELCOME10',
    `courierTrackingEnabled` BOOLEAN NOT NULL DEFAULT false,
    `courierProvider` VARCHAR(191) NOT NULL DEFAULT 'aramex',
    `courierTrackingUrlTemplate` TEXT NOT NULL DEFAULT '',
    `emailNotificationsEnabled` BOOLEAN NOT NULL DEFAULT false,
    `emailProvider` VARCHAR(191) NOT NULL DEFAULT 'resend',
    `resendApiKey` VARCHAR(191) NOT NULL DEFAULT '',
    `fromEmail` VARCHAR(191) NOT NULL DEFAULT 'orders@store.com',
    `adminNotifyEmail` VARCHAR(191) NOT NULL DEFAULT 'admin@store.com',
    `notifyOnNewOrder` BOOLEAN NOT NULL DEFAULT true,
    `notifyOnStatusChange` BOOLEAN NOT NULL DEFAULT true,
    `referralEnabled` BOOLEAN NOT NULL DEFAULT true,
    `referralRefereeDiscount` DOUBLE NOT NULL DEFAULT 10.0,
    `referralReferrerPoints` INTEGER NOT NULL DEFAULT 50,
    `returnWindowDays` INTEGER NOT NULL DEFAULT 14,
    `autoBackupEnabled` BOOLEAN NOT NULL DEFAULT false,
    `autoBackupFrequency` VARCHAR(191) NOT NULL DEFAULT 'daily',
    `autoBackupScope` VARCHAR(191) NOT NULL DEFAULT 'full',
    `autoBackupRetentionDays` INTEGER NOT NULL DEFAULT 7,
    `autoBackupTime` VARCHAR(191) NOT NULL DEFAULT '02:00',
    `lastAutoBackupAt` DATETIME(3) NULL,
    `paymentCodEnabled` BOOLEAN NOT NULL DEFAULT true,
    `paymentCodExtraFee` DOUBLE NOT NULL DEFAULT 0,
    `paymentCodInstructions` TEXT NOT NULL DEFAULT '',
    `paymentInstapayEnabled` BOOLEAN NOT NULL DEFAULT true,
    `paymentInstapayAddress` VARCHAR(191) NOT NULL DEFAULT 'store@instapay',
    `paymentInstapayPhone` VARCHAR(191) NOT NULL DEFAULT '',
    `paymentInstapayInstructions` TEXT NOT NULL DEFAULT '',
    `paymentFawryEnabled` BOOLEAN NOT NULL DEFAULT true,
    `paymentFawryMerchantCode` VARCHAR(191) NOT NULL DEFAULT '',
    `paymentFawrySecurityKey` VARCHAR(191) NOT NULL DEFAULT '',
    `paymentFawryTestMode` BOOLEAN NOT NULL DEFAULT true,
    `paymentFawryInstructions` TEXT NOT NULL DEFAULT '',
    `paymentCardEnabled` BOOLEAN NOT NULL DEFAULT true,
    `paymentCardGateway` VARCHAR(191) NOT NULL DEFAULT 'stripe',
    `paymentCardPublishableKey` VARCHAR(191) NOT NULL DEFAULT '',
    `paymentCardSecretKey` VARCHAR(191) NOT NULL DEFAULT '',
    `paymentCardTestMode` BOOLEAN NOT NULL DEFAULT true,
    `paymentCardInstructions` TEXT NOT NULL DEFAULT '',
    `paymentWalletsEnabled` BOOLEAN NOT NULL DEFAULT false,
    `paymentWalletsNumber` VARCHAR(191) NOT NULL DEFAULT '',
    `paymentWalletsInstructions` TEXT NOT NULL DEFAULT '',
    `depositEnabled` BOOLEAN NOT NULL DEFAULT false,
    `depositType` VARCHAR(191) NOT NULL DEFAULT 'FIXED',
    `depositValue` DOUBLE NOT NULL DEFAULT 50.0,
    `depositAppliesTo` VARCHAR(191) NOT NULL DEFAULT 'COD',
    `depositMinOrderTotal` DOUBLE NOT NULL DEFAULT 0.0,
    `depositInstructions` TEXT NOT NULL DEFAULT '',
    `depositPolicyText` TEXT NOT NULL DEFAULT '',
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PageView` (
    `id` VARCHAR(191) NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `referrer` VARCHAR(191) NULL,
    `ip` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CategoryToProduct` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_CategoryToProduct_AB_unique`(`A`, `B`),
    INDEX `_CategoryToProduct_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_referredById_fkey` FOREIGN KEY (`referredById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Address` ADD CONSTRAINT `Address_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnRequest` ADD CONSTRAINT `ReturnRequest_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnRequest` ADD CONSTRAINT `ReturnRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralRecord` ADD CONSTRAINT `ReferralRecord_referrerId_fkey` FOREIGN KEY (`referrerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralRecord` ADD CONSTRAINT `ReferralRecord_referredUserId_fkey` FOREIGN KEY (`referredUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CategoryToProduct` ADD CONSTRAINT `_CategoryToProduct_A_fkey` FOREIGN KEY (`A`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CategoryToProduct` ADD CONSTRAINT `_CategoryToProduct_B_fkey` FOREIGN KEY (`B`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


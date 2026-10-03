import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ensureDefaultPromoCode } from '@/lib/promoHelper';
import { hasPermission } from '@/lib/permissions';
import { getLiveExchangeRates } from '@/lib/exchangeRates';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to get or initialize default settings
async function getOrCreateSettings() {
  let settings = await prisma.storeSettings.findUnique({
    where: { id: 'default' },
  });

  if (!settings) {
    settings = await prisma.storeSettings.create({
      data: {
        id: 'default',
        storeName: 'أوراتريكس ستور | AURATRIX STORE',
        storeLogo: '',
        defaultCurrency: 'USD',
        defaultLanguage: 'ar',
        defaultTheme: 'light',
        lightBgPrimary: '#f8fafc',
        lightBgSurface: '#ffffff',
        lightTextPrimary: '#0f172a',
        lightTextSecondary: '#475569',
        lightAccentColor: '#6366f1',
        darkBgPrimary: '#0b0f19',
        darkBgSurface: '#111827',
        darkTextPrimary: '#ffffff',
        darkTextSecondary: '#9ca3af',
        darkAccentColor: '#6366f1',
        fontFamily: 'sans-serif',
        fontSize: 'medium',
        announcementEnabled: false,
        announcementText: '🎉 خصم مميز 20% على جميع المنتجات! | Special 20% OFF on all items!',
        contactEmail: 'support@auratrix.com',
        contactPhone: '+20 10 0000 0000',
        socialFacebook: 'https://facebook.com',
        socialFacebookEnabled: true,
        socialInstagram: 'https://instagram.com',
        socialInstagramEnabled: true,
        socialTwitter: 'https://twitter.com',
        socialTwitterEnabled: true,
        socialTikTok: 'https://tiktok.com',
        socialTikTokEnabled: true,
        socialWhatsApp: 'https://wa.me/201000000000',
        socialWhatsAppEnabled: true,
        maintenanceMode: false,
        maintenanceMessage: 'المتجر تحت الصيانة حالياً وسنعود قريباً | Store is under maintenance, back soon!',
        shippingFee: 0,
        taxRate: 0,
        popupDiscountCode: 'WELCOME10',
      },
    });
  }

  // Ensure default promo code exists in database
  await ensureDefaultPromoCode(prisma, settings?.popupDiscountCode || 'WELCOME10');

  return settings;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const hasSettingsPerm = userRole === 'ADMIN' || hasPermission(session?.user, 'manage_settings');

    const [settings, exchangeRates] = await Promise.all([
      getOrCreateSettings(),
      getLiveExchangeRates(),
    ]);

    // Non-admin/unauthorized requests receive a filtered view — sensitive fields are omitted
    if (!hasSettingsPerm) {
      const {
        // Strip internal/sensitive fields
        resendApiKey: _resendApiKey,
        adminNotifyEmail: _adminNotifyEmail,
        autoBackupEnabled: _autoBackupEnabled,
        autoBackupFrequency: _autoBackupFrequency,
        autoBackupScope: _autoBackupScope,
        autoBackupRetentionDays: _autoBackupRetentionDays,
        autoBackupTime: _autoBackupTime,
        lastAutoBackupAt: _lastAutoBackupAt,
        paymentCardSecretKey: _paymentCardSecretKey,
        paymentFawrySecurityKey: _paymentFawrySecurityKey,
        ...publicSettings
      } = settings as any;
      return NextResponse.json(
        { ...publicSettings, exchangeRates },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'CDN-Cache-Control': 'no-store',
            'Vercel-CDN-Cache-Control': 'no-store',
          },
        }
      );
    }

    return NextResponse.json(
      { ...settings, exchangeRates },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'CDN-Cache-Control': 'no-store',
          'Vercel-CDN-Cache-Control': 'no-store',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching store settings:', error);
    return NextResponse.json({ error: 'Failed to fetch store settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (!hasPermission(session.user, 'manage_settings') && userRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to store settings required' }, { status: 403 });
    }

    const body = await request.json();

    // Ensure default settings exist first
    await getOrCreateSettings();

    const updated = await prisma.storeSettings.update({
      where: { id: 'default' },
      data: {
        storeName: body.storeName !== undefined ? body.storeName : undefined,
        storeLogo: body.storeLogo !== undefined ? body.storeLogo : undefined,
        defaultCurrency: body.defaultCurrency !== undefined ? body.defaultCurrency : undefined,
        defaultLanguage: body.defaultLanguage !== undefined ? body.defaultLanguage : undefined,
        defaultTheme: body.defaultTheme !== undefined ? body.defaultTheme : undefined,

        lightBgPrimary: body.lightBgPrimary !== undefined ? body.lightBgPrimary : undefined,
        lightBgSurface: body.lightBgSurface !== undefined ? body.lightBgSurface : undefined,
        lightTextPrimary: body.lightTextPrimary !== undefined ? body.lightTextPrimary : undefined,
        lightTextSecondary: body.lightTextSecondary !== undefined ? body.lightTextSecondary : undefined,
        lightAccentColor: body.lightAccentColor !== undefined ? body.lightAccentColor : undefined,

        darkBgPrimary: body.darkBgPrimary !== undefined ? body.darkBgPrimary : undefined,
        darkBgSurface: body.darkBgSurface !== undefined ? body.darkBgSurface : undefined,
        darkTextPrimary: body.darkTextPrimary !== undefined ? body.darkTextPrimary : undefined,
        darkTextSecondary: body.darkTextSecondary !== undefined ? body.darkTextSecondary : undefined,
        darkAccentColor: body.darkAccentColor !== undefined ? body.darkAccentColor : undefined,

        fontFamily: body.fontFamily !== undefined ? body.fontFamily : undefined,
        fontSize: body.fontSize !== undefined ? body.fontSize : undefined,

        announcementEnabled: body.announcementEnabled !== undefined ? Boolean(body.announcementEnabled) : undefined,
        announcementText: body.announcementText !== undefined ? body.announcementText : undefined,

        contactEmail: body.contactEmail !== undefined ? body.contactEmail : undefined,
        contactPhone: body.contactPhone !== undefined ? body.contactPhone : undefined,

        socialFacebook: body.socialFacebook !== undefined ? body.socialFacebook : undefined,
        socialFacebookEnabled: body.socialFacebookEnabled !== undefined ? Boolean(body.socialFacebookEnabled) : undefined,
        socialInstagram: body.socialInstagram !== undefined ? body.socialInstagram : undefined,
        socialInstagramEnabled: body.socialInstagramEnabled !== undefined ? Boolean(body.socialInstagramEnabled) : undefined,
        socialTwitter: body.socialTwitter !== undefined ? body.socialTwitter : undefined,
        socialTwitterEnabled: body.socialTwitterEnabled !== undefined ? Boolean(body.socialTwitterEnabled) : undefined,
        socialTikTok: body.socialTikTok !== undefined ? body.socialTikTok : undefined,
        socialTikTokEnabled: body.socialTikTokEnabled !== undefined ? Boolean(body.socialTikTokEnabled) : undefined,
        socialWhatsApp: body.socialWhatsApp !== undefined ? body.socialWhatsApp : undefined,
        socialWhatsAppEnabled: body.socialWhatsAppEnabled !== undefined ? Boolean(body.socialWhatsAppEnabled) : undefined,

        maintenanceMode: body.maintenanceMode !== undefined ? Boolean(body.maintenanceMode) : undefined,
        maintenanceMessage: body.maintenanceMessage !== undefined ? body.maintenanceMessage : undefined,

        shippingFee: body.shippingFee !== undefined && !isNaN(Number(body.shippingFee)) ? Number(body.shippingFee) : undefined,
        taxRate: body.taxRate !== undefined && !isNaN(Number(body.taxRate)) ? Number(body.taxRate) : undefined,

        loyaltyEnabled: body.loyaltyEnabled !== undefined ? Boolean(body.loyaltyEnabled) : undefined,
        pointsPerDollar: body.pointsPerDollar !== undefined && !isNaN(Number(body.pointsPerDollar)) ? Number(body.pointsPerDollar) : undefined,
        pointsRedemptionRate: body.pointsRedemptionRate !== undefined && !isNaN(Number(body.pointsRedemptionRate)) ? Number(body.pointsRedemptionRate) : undefined,
        minPointsToRedeem: body.minPointsToRedeem !== undefined && !isNaN(Number(body.minPointsToRedeem)) ? Number(body.minPointsToRedeem) : undefined,
        lowStockThreshold: body.lowStockThreshold !== undefined && !isNaN(Number(body.lowStockThreshold)) ? Number(body.lowStockThreshold) : undefined,
        popupEnabled: body.popupEnabled !== undefined ? Boolean(body.popupEnabled) : undefined,
        popupTitle: body.popupTitle !== undefined ? body.popupTitle : undefined,
        popupText: body.popupText !== undefined ? body.popupText : undefined,
        popupDiscountCode: body.popupDiscountCode !== undefined ? body.popupDiscountCode : undefined,

        // Courier tracking (Phase 2)
        courierTrackingEnabled: body.courierTrackingEnabled !== undefined ? Boolean(body.courierTrackingEnabled) : undefined,
        courierProvider: body.courierProvider !== undefined ? body.courierProvider : undefined,
        courierTrackingUrlTemplate: body.courierTrackingUrlTemplate !== undefined ? body.courierTrackingUrlTemplate : undefined,

        // Email Notifications (Phase 5)
        emailNotificationsEnabled: body.emailNotificationsEnabled !== undefined ? Boolean(body.emailNotificationsEnabled) : undefined,
        emailProvider: body.emailProvider !== undefined ? body.emailProvider : undefined,
        resendApiKey: body.resendApiKey !== undefined ? body.resendApiKey : undefined,
        fromEmail: body.fromEmail !== undefined ? body.fromEmail : undefined,
        adminNotifyEmail: body.adminNotifyEmail !== undefined ? body.adminNotifyEmail : undefined,
        notifyOnNewOrder: body.notifyOnNewOrder !== undefined ? Boolean(body.notifyOnNewOrder) : undefined,
        notifyOnStatusChange: body.notifyOnStatusChange !== undefined ? Boolean(body.notifyOnStatusChange) : undefined,

        // Referral Program
        referralEnabled: body.referralEnabled !== undefined ? Boolean(body.referralEnabled) : undefined,
        referralRefereeDiscount: body.referralRefereeDiscount !== undefined && !isNaN(Number(body.referralRefereeDiscount)) ? Number(body.referralRefereeDiscount) : undefined,
        referralReferrerPoints: body.referralReferrerPoints !== undefined && !isNaN(Number(body.referralReferrerPoints)) ? Number(body.referralReferrerPoints) : undefined,

        // Return / Refund Policy
        returnWindowDays: body.returnWindowDays !== undefined && !isNaN(Number(body.returnWindowDays)) ? Number(body.returnWindowDays) : undefined,

        // Automated Scheduled Backup & Retention
        autoBackupEnabled: body.autoBackupEnabled !== undefined ? Boolean(body.autoBackupEnabled) : undefined,
        autoBackupFrequency: body.autoBackupFrequency !== undefined ? body.autoBackupFrequency : undefined,
        autoBackupScope: body.autoBackupScope !== undefined ? body.autoBackupScope : undefined,
        autoBackupRetentionDays: body.autoBackupRetentionDays !== undefined && !isNaN(Number(body.autoBackupRetentionDays)) ? Number(body.autoBackupRetentionDays) : undefined,
        autoBackupTime: body.autoBackupTime !== undefined ? body.autoBackupTime : undefined,
        lastAutoBackupAt: body.lastAutoBackupAt !== undefined ? (body.lastAutoBackupAt ? new Date(body.lastAutoBackupAt) : null) : undefined,

        // Payment Methods & Gateway Settings
        paymentCodEnabled: body.paymentCodEnabled !== undefined ? Boolean(body.paymentCodEnabled) : undefined,
        paymentCodExtraFee: body.paymentCodExtraFee !== undefined && !isNaN(Number(body.paymentCodExtraFee)) ? Number(body.paymentCodExtraFee) : undefined,
        paymentCodInstructions: body.paymentCodInstructions !== undefined ? body.paymentCodInstructions : undefined,
        paymentInstapayEnabled: body.paymentInstapayEnabled !== undefined ? Boolean(body.paymentInstapayEnabled) : undefined,
        paymentInstapayAddress: body.paymentInstapayAddress !== undefined ? body.paymentInstapayAddress : undefined,
        paymentInstapayPhone: body.paymentInstapayPhone !== undefined ? body.paymentInstapayPhone : undefined,
        paymentInstapayInstructions: body.paymentInstapayInstructions !== undefined ? body.paymentInstapayInstructions : undefined,
        paymentFawryEnabled: body.paymentFawryEnabled !== undefined ? Boolean(body.paymentFawryEnabled) : undefined,
        paymentFawryMerchantCode: body.paymentFawryMerchantCode !== undefined ? body.paymentFawryMerchantCode : undefined,
        paymentFawrySecurityKey: body.paymentFawrySecurityKey !== undefined ? body.paymentFawrySecurityKey : undefined,
        paymentFawryTestMode: body.paymentFawryTestMode !== undefined ? Boolean(body.paymentFawryTestMode) : undefined,
        paymentFawryInstructions: body.paymentFawryInstructions !== undefined ? body.paymentFawryInstructions : undefined,
        paymentCardEnabled: body.paymentCardEnabled !== undefined ? Boolean(body.paymentCardEnabled) : undefined,
        paymentCardGateway: body.paymentCardGateway !== undefined ? body.paymentCardGateway : undefined,
        paymentCardPublishableKey: body.paymentCardPublishableKey !== undefined ? body.paymentCardPublishableKey : undefined,
        paymentCardSecretKey: body.paymentCardSecretKey !== undefined ? body.paymentCardSecretKey : undefined,
        paymentCardTestMode: body.paymentCardTestMode !== undefined ? Boolean(body.paymentCardTestMode) : undefined,
        paymentCardInstructions: body.paymentCardInstructions !== undefined ? body.paymentCardInstructions : undefined,
        paymentWalletsEnabled: body.paymentWalletsEnabled !== undefined ? Boolean(body.paymentWalletsEnabled) : undefined,
        paymentWalletsNumber: body.paymentWalletsNumber !== undefined ? body.paymentWalletsNumber : undefined,
        paymentWalletsInstructions: body.paymentWalletsInstructions !== undefined ? body.paymentWalletsInstructions : undefined,

        // Order Deposit & Anti-Cancellation Settings
        depositEnabled: body.depositEnabled !== undefined ? Boolean(body.depositEnabled) : undefined,
        depositType: body.depositType !== undefined ? body.depositType : undefined,
        depositValue: body.depositValue !== undefined && !isNaN(Number(body.depositValue)) ? Number(body.depositValue) : undefined,
        depositAppliesTo: body.depositAppliesTo !== undefined ? body.depositAppliesTo : undefined,
        depositMinOrderTotal: body.depositMinOrderTotal !== undefined && !isNaN(Number(body.depositMinOrderTotal)) ? Number(body.depositMinOrderTotal) : undefined,
        depositInstructions: body.depositInstructions !== undefined ? body.depositInstructions : undefined,
        depositPolicyText: body.depositPolicyText !== undefined ? body.depositPolicyText : undefined,
      },
    });

    try {
      revalidatePath('/', 'layout');
    } catch (revalErr) {
      // Ignore background revalidation errors
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating store settings:', error);
    return NextResponse.json({ error: error.message || 'Failed to update store settings' }, { status: 500 });
  }
}

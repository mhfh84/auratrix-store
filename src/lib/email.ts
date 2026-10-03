import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';

/**
 * Sends a clean, responsive HTML email for order events.
 * Gracefully no-ops if email notifications are disabled or API key is missing.
 */
export async function sendOrderConfirmationEmail(order: any) {
  try {
    const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    if (!settings?.emailNotificationsEnabled || !settings?.resendApiKey || !settings?.notifyOnNewOrder) {
      return { success: false, reason: 'Email notifications disabled or unconfigured' };
    }

    let guestInfo: any = null;
    try {
      if (order.guestInfo) guestInfo = typeof order.guestInfo === 'string' ? JSON.parse(order.guestInfo) : order.guestInfo;
    } catch (e) {}

    const recipientEmail = order.user?.email || guestInfo?.email;
    const recipientName = order.user?.name || guestInfo?.name || 'Customer';

    if (!recipientEmail) {
      return { success: false, reason: 'No recipient email found on order' };
    }

    const resend = new Resend(settings.resendApiKey);

    const itemsHtml = (order.orderItems || [])
      .map(
        (item: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${item.product?.title || 'Product'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right; font-weight: bold;">$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>`
      )
      .join('');

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const logoHeaderHtml = settings.storeLogo
      ? `<img src="${settings.storeLogo}" alt="${settings.storeName}" style="max-height: 48px; max-width: 180px; margin-bottom: 8px; object-fit: contain;" /><br/>`
      : '';

    const emailHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head><meta charset="utf-8"/></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <div style="background: #6366f1; padding: 24px; text-align: center; color: #ffffff;">
          ${logoHeaderHtml}
          <h1 style="margin: 0; font-size: 20px;">${settings.storeName}</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">تأكيد استلام الطلب | Order Confirmation</p>
        </div>

        <div style="padding: 24px;">
          <p style="font-size: 14px;">مرحباً <strong>${recipientName}</strong>،</p>
          <p style="font-size: 13px; color: #475569; line-height: 1.6;">
            شكراً لتسوقك معنا! تم استلام طلبك بنجاح وجاري مراجعته وتجهيزه.
          </p>

          <div style="background: #f1f5f9; padding: 14px; rounded: 12px; margin: 18px 0; font-size: 12px;">
            <p style="margin: 2px 0;"><strong>رقم الطلب:</strong> #${order.id.slice(0, 8).toUpperCase()}</p>
            <p style="margin: 2px 0;"><strong>طريقة الدفع:</strong> ${order.paymentMethod || 'COD'}</p>
            <p style="margin: 2px 0;"><strong>حالة الدفع:</strong> ${order.paymentStatus || 'PENDING'}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="padding: 8px 10px; text-align: right; font-size: 12px; color: #64748b;">المنتج</th>
                <th style="padding: 8px 10px; text-align: center; font-size: 12px; color: #64748b;">الكمية</th>
                <th style="padding: 8px 10px; text-align: right; font-size: 12px; color: #64748b;">السعر</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 12px 10px; font-weight: bold; font-size: 14px;">الإجمالي:</td>
                <td style="padding: 12px 10px; font-weight: 900; font-size: 16px; color: #6366f1; text-align: right;">$${order.totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div style="text-align: center; margin-top: 28px;">
            <a href="${siteUrl}/track-order" style="background: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block;">
              تتبع حالة طلبك
            </a>
          </div>
        </div>

        <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0;">${settings.storeName} — ${settings.contactEmail}</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const data = await resend.emails.send({
      from: `${settings.storeName} <${settings.fromEmail || 'onboarding@resend.dev'}>`,
      to: [recipientEmail],
      subject: `🎉 تم استلام طلبك بنجاح #${order.id.slice(0, 8).toUpperCase()}`,
      html: emailHtml,
    });

    return { success: true, data };
  } catch (error: any) {
    console.error('Error sending order confirmation email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sends order status update notification to customer.
 */
export async function sendOrderStatusUpdateEmail(order: any, newStatus: string) {
  try {
    const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    if (!settings?.emailNotificationsEnabled || !settings?.resendApiKey || !settings?.notifyOnStatusChange) {
      return { success: false, reason: 'Status update emails disabled' };
    }

    let guestInfo: any = null;
    try {
      if (order.guestInfo) guestInfo = typeof order.guestInfo === 'string' ? JSON.parse(order.guestInfo) : order.guestInfo;
    } catch (e) {}

    const recipientEmail = order.user?.email || guestInfo?.email;
    const recipientName = order.user?.name || guestInfo?.name || 'Customer';

    if (!recipientEmail) return { success: false };

    const statusTranslations: Record<string, string> = {
      PENDING: 'قيد المراجعة (Pending)',
      PROCESSING: 'جاري التجهيز والتعبئة (Processing)',
      SHIPPED: 'تم الشحن ومع مندوب التوصيل (Shipped)',
      DELIVERED: 'تم التوصيل بنجاح (Delivered)',
      CANCELLED: 'تم الإلغاء (Cancelled)',
    };

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const logoHeaderHtml = settings.storeLogo
      ? `<img src="${settings.storeLogo}" alt="${settings.storeName}" style="max-height: 40px; max-width: 160px; margin-bottom: 8px; object-fit: contain;" /><br/>`
      : '';

    const resend = new Resend(settings.resendApiKey);

    const emailHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head><meta charset="utf-8"/></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: #6366f1; padding: 20px; text-align: center; color: #ffffff;">
          ${logoHeaderHtml}
          <h2 style="margin: 0;">تحديث حالة الطلب #${order.id.slice(0, 8).toUpperCase()}</h2>
        </div>
        <div style="padding: 24px;">
          <p>مرحباً <strong>${recipientName}</strong>،</p>
          <p>نود إعلامك بأنه تم تحديث حالة طلبك إلى:</p>
          <div style="background: #eef2ff; border: 1px solid #c7d2fe; color: #4338ca; padding: 14px; border-radius: 12px; text-align: center; font-weight: bold; font-size: 16px; margin: 16px 0;">
            ${statusTranslations[newStatus] || newStatus}
          </div>
          ${
            order.trackingNumber
              ? `<p style="font-size: 13px;">رقم التتبع: <strong style="font-family: monospace; color: #6366f1;">${order.trackingNumber}</strong></p>`
              : ''
          }
          <div style="text-align: center; margin-top: 24px;">
            <a href="${siteUrl}/track-order" style="background: #6366f1; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block;">
              تتبع شحنتك
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    const data = await resend.emails.send({
      from: `${settings.storeName} <${settings.fromEmail || 'onboarding@resend.dev'}>`,
      to: [recipientEmail],
      subject: `📦 تحديث حالة طلبك #${order.id.slice(0, 8).toUpperCase()}: ${statusTranslations[newStatus] || newStatus}`,
      html: emailHtml,
    });

    return { success: true, data };
  } catch (error: any) {
    console.error('Error sending order status email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sends return/refund request status update email to customer.
 */
export async function sendReturnStatusEmail(returnRequest: any, order: any, newStatus: string) {
  try {
    const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    if (!settings?.emailNotificationsEnabled || !settings?.resendApiKey) {
      return { success: false, reason: 'Email notifications disabled or unconfigured' };
    }

    let guestInfo: any = null;
    try {
      if (order.guestInfo) guestInfo = typeof order.guestInfo === 'string' ? JSON.parse(order.guestInfo) : order.guestInfo;
    } catch (e) {}

    const recipientEmail = returnRequest.user?.email || order.user?.email || guestInfo?.email;
    const recipientName = returnRequest.user?.name || order.user?.name || guestInfo?.name || 'Customer';

    if (!recipientEmail) return { success: false, reason: 'No recipient email' };

    const statusInfo: Record<string, { labelAr: string; labelEn: string; color: string; icon: string }> = {
      REQUESTED:  { labelAr: 'تم استلام طلب الإرجاع',     labelEn: 'Return Request Received',   color: '#6366f1', icon: '📩' },
      APPROVED:   { labelAr: 'تم الموافقة على الإرجاع',    labelEn: 'Return Request Approved',   color: '#059669', icon: '✅' },
      REFUNDED:   { labelAr: 'تم استرداد المبلغ بنجاح',   labelEn: 'Refund Completed',          color: '#0284c7', icon: '💰' },
      REJECTED:   { labelAr: 'تم رفض طلب الإرجاع',        labelEn: 'Return Request Rejected',   color: '#dc2626', icon: '❌' },
    };

    const info = statusInfo[newStatus] || { labelAr: newStatus, labelEn: newStatus, color: '#6366f1', icon: '📋' };
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const logoHeaderHtml = settings.storeLogo
      ? `<img src="${settings.storeLogo}" alt="${settings.storeName}" style="max-height: 48px; max-width: 180px; margin-bottom: 8px; object-fit: contain;" /><br/>`
      : '';

    const { Resend } = await import('resend');
    const resend = new Resend(settings.resendApiKey);

    const emailHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head><meta charset="utf-8"/></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background: ${info.color}; padding: 24px; text-align: center; color: #ffffff;">
          ${logoHeaderHtml}
          <div style="font-size: 36px; margin-bottom: 8px;">${info.icon}</div>
          <h1 style="margin: 0; font-size: 20px;">${settings.storeName}</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">تحديث طلب الإرجاع | Return Request Update</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 14px;">مرحباً <strong>${recipientName}</strong>،</p>
          <p style="font-size: 13px; color: #475569; line-height: 1.6;">
            نود إعلامك بأنه تم تحديث حالة طلب الإرجاع الخاص بك:
          </p>
          <div style="background: #f1f5f9; border: 2px solid ${info.color}; color: ${info.color}; padding: 16px; border-radius: 12px; text-align: center; font-weight: bold; font-size: 18px; margin: 20px 0;">
            ${info.labelAr}<br/>
            <span style="font-size: 13px; font-weight: normal; color: #475569; display: block; margin-top: 4px;">${info.labelEn}</span>
          </div>
          <div style="background: #f8fafc; padding: 14px; border-radius: 12px; margin: 18px 0; font-size: 12px; border: 1px solid #e2e8f0;">
            <p style="margin: 2px 0;"><strong>رقم الطلب الأصلي:</strong> #${order.id.slice(0, 8).toUpperCase()}</p>
            <p style="margin: 2px 0;"><strong>سبب الإرجاع:</strong> ${returnRequest.reason}</p>
            ${returnRequest.adminNotes ? `<p style="margin: 2px 0; margin-top: 8px;"><strong>ملاحظة من المتجر:</strong> ${returnRequest.adminNotes}</p>` : ''}
          </div>
          ${newStatus === 'REFUNDED' ? `
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 14px; border-radius: 10px; color: #065f46; font-size: 13px; text-align: center;">
            <strong>💰 تم استرداد المبلغ بنجاح!</strong><br/>
            سيتم تحويل المبلغ وفقاً لطريقة الاسترداد التي اخترتها.
          </div>` : ''}
          <div style="text-align: center; margin-top: 28px;">
            <a href="${siteUrl}/account/orders" style="background: ${info.color}; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block;">
              عرض حالة الطلبات
            </a>
          </div>
        </div>
        <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0;">${settings.storeName} — ${settings.contactEmail}</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const data = await resend.emails.send({
      from: `${settings.storeName} <${settings.fromEmail || 'onboarding@resend.dev'}>`,
      to: [recipientEmail],
      subject: `${info.icon} تحديث طلب الإرجاع #${order.id.slice(0, 8).toUpperCase()}: ${info.labelAr}`,
      html: emailHtml,
    });

    return { success: true, data };
  } catch (error: any) {
    console.error('Error sending return status email:', error);
    return { success: false, error: error.message };
  }
}

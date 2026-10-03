import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    // Rate limit: max 5 messages per IP per 15 minutes to prevent spam
    const ip = getClientIp(req);
    const rl = checkRateLimit(`contact:${ip}`, { limit: 5, windowMs: 15 * 60_000 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const body = await req.json();
    const { name, email, phone, orderId, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      );
    }

    // In a production store, you could send an email via Resend/SendGrid or store in DB
    console.log('[Contact Message Received]', {
      name,
      email,
      phone,
      orderId,
      subject,
      message,
      receivedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Your message has been received successfully.',
    });
  } catch (error: any) {
    console.error('Error handling contact form submission:', error);
    return NextResponse.json(
      { error: 'Failed to process message. Please try again.' },
      { status: 500 }
    );
  }
}

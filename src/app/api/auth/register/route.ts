import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { processReferralAtRegistration, ensureUserReferralCode } from '@/lib/referralHelper';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    // Rate limit: max 5 registration attempts per IP per 15 minutes
    const ip = getClientIp(request);
    const rl = checkRateLimit(`register:${ip}`, { limit: 5, windowMs: 15 * 60_000 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const { name, email, password, referralCode } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'USER',
        permissions: JSON.stringify([]),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // Generate referral code for new user
    try {
      await ensureUserReferralCode(prisma as any, newUser.id);
    } catch (e) { /* non-fatal */ }

    // Process referral code if provided (non-fatal)
    if (referralCode?.trim()) {
      try {
        await processReferralAtRegistration(prisma as any, newUser.id, referralCode.trim());
      } catch (e) { /* non-fatal */ }
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
  }
}

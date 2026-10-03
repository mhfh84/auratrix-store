import { PrismaClient } from '@/generated/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Only log errors in production — query/warn logs add CPU and I/O overhead
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Persist the singleton across Hot Module Replacement in dev only
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

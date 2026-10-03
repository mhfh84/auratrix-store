import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  // Check what tables exist
  const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type="table" ORDER BY name`;
  console.log("Tables:", JSON.stringify(tables));
  
  // Check if join table exists and what's in it
  const joinRows = await prisma.$queryRaw`SELECT * FROM "_CategoryToProduct" LIMIT 20`;
  console.log("Join table rows:", JSON.stringify(joinRows));

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });

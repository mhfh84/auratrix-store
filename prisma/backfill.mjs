import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  // The implicit many-to-many join table is _CategoryToProduct
  // A = Category id, B = Product id (Prisma sorts alphabetically: Category < Product)
  const count = await prisma.$executeRaw`
    INSERT OR IGNORE INTO "_CategoryToProduct" ("A", "B")
    SELECT p.categoryId, p.id
    FROM "Product_old" p
    WHERE p.categoryId IS NOT NULL
  `;
  console.log("Backfill rows inserted:", count);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });

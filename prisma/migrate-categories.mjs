/**
 * migrate-categories.mjs - Run ONCE to migrate from single categoryId to many-to-many
 * Usage: node prisma/migrate-categories.mjs
 */
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const prisma = new PrismaClient();

async function main() {
  console.log("Step 1: Reading existing categoryId values...");
  let existing = [];
  try {
    existing = await prisma.$queryRaw`SELECT id, categoryId FROM Product WHERE categoryId IS NOT NULL`;
    console.log("Found " + existing.length + " product(s) with a category.");
  } catch (e) {
    console.warn("Could not read categoryId (column may already be gone):", e.message);
  }
  await prisma.$disconnect();

  console.log("Step 2: Pushing new schema...");
  execSync("npx prisma db push --accept-data-loss", { stdio: "inherit", cwd: process.cwd() });

  console.log("Step 3: Restoring category associations...");
  const prisma2 = new PrismaClient();
  for (const row of existing) {
    try {
      await prisma2.product.update({
        where: { id: row.id },
        data: { categories: { connect: { id: row.categoryId } } },
      });
      console.log("  Connected product " + row.id + " to category " + row.categoryId);
    } catch (e) {
      console.warn("  Could not connect product " + row.id + ":", e.message);
    }
  }
  await prisma2.$disconnect();
  console.log("Migration complete!");
}

main().catch((e) => { console.error(e); process.exit(1); });

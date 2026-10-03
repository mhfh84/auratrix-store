import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Captured from the first migration run output
const pairs = [
  { productId: "1ec8774a-afa5-4f63-a657-a3ca6ab53864", categoryId: "61aa29f7-9898-42ba-9cbd-351f9a0cb621" },
  { productId: "d7134687-ad71-469e-b7d4-a95b62c94ee7", categoryId: "1389bde7-8c47-4943-ade1-7f4e937d1cae" },
  { productId: "978489a2-7c7d-413e-84cc-7062a77eb1e3", categoryId: "63d56fc6-1a09-4a08-ac1e-cdcc4632b47a" },
  { productId: "c8d8b169-3211-4c92-b08c-998fc26216dc", categoryId: "63d56fc6-1a09-4a08-ac1e-cdcc4632b47a" },
  { productId: "4a4cbdcc-5973-407c-be02-00d8a007267d", categoryId: "c4ea5a77-2d1e-4c19-8b1a-a11bc08a0792" },
  { productId: "0b951153-8ef0-47be-8f43-68baee8004f2", categoryId: "e5182683-7072-4284-a202-4f6b796cc9bc" },
  { productId: "244c5e6f-9ba7-446f-85a1-0ec1272bdb56", categoryId: "1389bde7-8c47-4943-ade1-7f4e937d1cae" },
];

async function main() {
  for (const { productId, categoryId } of pairs) {
    try {
      await prisma.product.update({
        where: { id: productId },
        data: { categories: { connect: { id: categoryId } } },
      });
      console.log("Connected product " + productId + " -> category " + categoryId);
    } catch (e) {
      console.warn("Failed for product " + productId + ":", e.message);
    }
  }
  await prisma.$disconnect();
  console.log("Done.");
}
main().catch(e => { console.error(e); process.exit(1); });

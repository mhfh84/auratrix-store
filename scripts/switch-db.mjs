import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const prismaDir = path.join(rootDir, 'prisma');

const targetDb = process.argv[2]?.toLowerCase();

const validProviders = {
  postgres: 'schema.postgresql.prisma',
  postgresql: 'schema.postgresql.prisma',
  mysql: 'schema.mysql.prisma',
  sqlite: 'schema.sqlite.prisma',
};

if (!targetDb || !validProviders[targetDb]) {
  console.error(`❌ Please specify a valid database target: postgres, mysql, or sqlite`);
  console.log(`Example: node scripts/switch-db.mjs postgres`);
  process.exit(1);
}

const sourceFileName = validProviders[targetDb];
const sourcePath = path.join(prismaDir, sourceFileName);
const targetPath = path.join(prismaDir, 'schema.prisma');

if (!fs.existsSync(sourcePath)) {
  console.error(`❌ Source schema file not found: ${sourcePath}`);
  process.exit(1);
}

const content = fs.readFileSync(sourcePath, 'utf8');
fs.writeFileSync(targetPath, content, 'utf8');

console.log(`✅ Successfully switched schema.prisma to provider: ${targetDb.toUpperCase()}`);
console.log(`🔄 Generating Prisma Client...`);

try {
  execSync('npx prisma generate', { cwd: rootDir, stdio: 'inherit' });
  console.log(`\n🎉 Prisma Client regenerated successfully for ${targetDb.toUpperCase()}!`);
} catch (err) {
  console.warn(`⚠️ Prisma generate encountered a warning or error. Please verify your DATABASE_URL in .env`);
}

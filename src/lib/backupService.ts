import { prisma } from '@/lib/prisma';
import JSZip from 'jszip';
import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';

export interface BackupStats {
  totalRecords: number;
  totalFiles: number;
  totalFileSizeBytes: number;
  tableCounts: Record<string, number>;
  lastBackupAt?: string | null;
}

export interface BackupManifest {
  version: string;
  appName: string;
  createdAt: string;
  scope: 'full' | 'db' | 'media';
  isAuto: boolean;
  totalRecords: number;
  tableCounts: Record<string, number>;
  totalFiles: number;
  totalFileSizeBytes: number;
  schemaVersion: string;
}

export interface ValidationResult {
  valid: boolean;
  type: 'full' | 'db' | 'media' | 'unknown';
  manifest?: BackupManifest;
  tableCounts: Record<string, number>;
  totalRecords: number;
  fileCount: number;
  totalFileSizeBytes: number;
  errors: string[];
  warnings: string[];
  databaseData?: any;
}

export interface RestoreResult {
  success: boolean;
  mode: 'replace' | 'merge';
  tablesRestored: Record<string, number>;
  totalRecordsRestored: number;
  filesRestored: number;
  durationMs: number;
  snapshotCreated?: string;
  errors?: string[];
}

const BACKUPS_DIR = path.join(process.cwd(), 'backups');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

async function ensureDir(dirPath: string) {
  try {
    await fsp.mkdir(dirPath, { recursive: true });
  } catch (e) {
    // Ignore if exists
  }
}

// ----------------------------------------------------
// 1. STATS & SYSTEM METRICS
// ----------------------------------------------------
export async function getSystemBackupStats(): Promise<BackupStats> {
  const [
    storeSettingsCount,
    usersCount,
    addressesCount,
    categoriesCount,
    productsCount,
    variantsCount,
    reviewsCount,
    ordersCount,
    orderItemsCount,
    promocodesCount,
    promoIpUsageCount,
    returnRequestsCount,
    referralsCount,
    pageViewsCount,
  ] = await Promise.all([
    prisma.storeSettings.count(),
    prisma.user.count(),
    prisma.address.count(),
    prisma.category.count(),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.review.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.promoCode.count(),
    prisma.promoCodeIpUsage.count(),
    prisma.returnRequest.count(),
    prisma.referralRecord.count(),
    prisma.pageView.count(),
  ]);

  const tableCounts: Record<string, number> = {
    storeSettings: storeSettingsCount,
    users: usersCount,
    addresses: addressesCount,
    categories: categoriesCount,
    products: productsCount,
    productVariants: variantsCount,
    reviews: reviewsCount,
    orders: ordersCount,
    orderItems: orderItemsCount,
    promoCodes: promocodesCount,
    promoCodeIpUsages: promoIpUsageCount,
    returnRequests: returnRequestsCount,
    referralRecords: referralsCount,
    pageViews: pageViewsCount,
  };

  const totalRecords = Object.values(tableCounts).reduce((a, b) => a + b, 0);

  // Measure uploads folder
  let totalFiles = 0;
  let totalFileSizeBytes = 0;

  try {
    if (fs.existsSync(UPLOADS_DIR)) {
      const files = await fsp.readdir(UPLOADS_DIR);
      for (const file of files) {
        const fullPath = path.join(UPLOADS_DIR, file);
        const stat = await fsp.stat(fullPath);
        if (stat.isFile()) {
          totalFiles++;
          totalFileSizeBytes += stat.size;
        }
      }
    }
  } catch (e) {
    console.error('Error reading uploads directory:', e);
  }

  // Get last backup time from store settings
  const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });

  return {
    totalRecords,
    totalFiles,
    totalFileSizeBytes,
    tableCounts,
    lastBackupAt: settings?.lastAutoBackupAt ? settings.lastAutoBackupAt.toISOString() : null,
  };
}

// ----------------------------------------------------
// 2. DATABASE EXPORT
// ----------------------------------------------------
export async function exportDatabaseData() {
  const [
    storeSettings,
    users,
    addresses,
    categories,
    products,
    productVariants,
    reviews,
    orders,
    orderItems,
    promoCodes,
    promoCodeIpUsages,
    returnRequests,
    referralRecords,
    pageViews,
  ] = await Promise.all([
    prisma.storeSettings.findMany(),
    prisma.user.findMany(),
    prisma.address.findMany(),
    prisma.category.findMany(),
    prisma.product.findMany({
      include: {
        categories: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.productVariant.findMany(),
    prisma.review.findMany(),
    prisma.order.findMany(),
    prisma.orderItem.findMany(),
    prisma.promoCode.findMany(),
    prisma.promoCodeIpUsage.findMany(),
    prisma.returnRequest.findMany(),
    prisma.referralRecord.findMany(),
    prisma.pageView.findMany(),
  ]);

  const databaseData = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    storeSettings,
    users,
    addresses,
    categories,
    products,
    productVariants,
    reviews,
    orders,
    orderItems,
    promoCodes,
    promoCodeIpUsages,
    returnRequests,
    referralRecords,
    pageViews,
  };

  const tableCounts = {
    storeSettings: storeSettings.length,
    users: users.length,
    addresses: addresses.length,
    categories: categories.length,
    products: products.length,
    productVariants: productVariants.length,
    reviews: reviews.length,
    orders: orders.length,
    orderItems: orderItems.length,
    promoCodes: promoCodes.length,
    promoCodeIpUsages: promoCodeIpUsages.length,
    returnRequests: returnRequests.length,
    referralRecords: referralRecords.length,
    pageViews: pageViews.length,
  };

  const totalRecords = Object.values(tableCounts).reduce((a, b) => a + b, 0);

  return { databaseData, tableCounts, totalRecords };
}

// ----------------------------------------------------
// 3. MEDIA FILES HELPER
// ----------------------------------------------------
async function getUploadFilesList(): Promise<Array<{ relativePath: string; absolutePath: string; size: number }>> {
  const fileList: Array<{ relativePath: string; absolutePath: string; size: number }> = [];
  if (!fs.existsSync(UPLOADS_DIR)) return fileList;

  async function scan(currentDir: string, relativeToUploads: string = '') {
    const entries = await fsp.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = relativeToUploads ? path.join(relativeToUploads, entry.name) : entry.name;
      if (entry.isDirectory()) {
        await scan(fullPath, relPath);
      } else if (entry.isFile()) {
        const stat = await fsp.stat(fullPath);
        fileList.push({
          relativePath: relPath.replace(/\\/g, '/'),
          absolutePath: fullPath,
          size: stat.size,
        });
      }
    }
  }

  await scan(UPLOADS_DIR);
  return fileList;
}

// ----------------------------------------------------
// 4. ARCHIVE CREATION (ZIP / JSON)
// ----------------------------------------------------
export async function createBackupArchive(options: {
  scope: 'full' | 'db' | 'media';
  isAuto?: boolean;
}): Promise<{ buffer: Buffer; filename: string; manifest: BackupManifest }> {
  const { scope, isAuto = false } = options;
  const now = new Date();
  const timestampStr = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);

  if (scope === 'db') {
    const { databaseData, tableCounts, totalRecords } = await exportDatabaseData();
    const manifest: BackupManifest = {
      version: '1.0',
      appName: 'Store',
      createdAt: now.toISOString(),
      scope: 'db',
      isAuto,
      totalRecords,
      tableCounts,
      totalFiles: 0,
      totalFileSizeBytes: 0,
      schemaVersion: 'prisma-5.x',
    };

    const fullExport = {
      manifest,
      database: databaseData,
    };

    const jsonString = JSON.stringify(fullExport, null, 2);
    const buffer = Buffer.from(jsonString, 'utf-8');
    const filename = `store-backup-${isAuto ? 'auto-' : ''}db-${timestampStr}.json`;

    return { buffer, filename, manifest };
  }

  // ZIP for 'full' and 'media'
  const zip = new JSZip();
  let tableCounts: Record<string, number> = {};
  let totalRecords = 0;

  if (scope === 'full') {
    const dbExport = await exportDatabaseData();
    tableCounts = dbExport.tableCounts;
    totalRecords = dbExport.totalRecords;
    zip.file('database_backup.json', JSON.stringify(dbExport.databaseData, null, 2));
  }

  const uploadFiles = await getUploadFilesList();
  let totalFileSizeBytes = 0;
  const uploadsFolder = zip.folder('uploads');

  for (const file of uploadFiles) {
    totalFileSizeBytes += file.size;
    const content = await fsp.readFile(file.absolutePath);
    if (uploadsFolder) {
      uploadsFolder.file(file.relativePath, content);
    }
  }

  const manifest: BackupManifest = {
    version: '1.0',
    appName: 'Store',
    createdAt: now.toISOString(),
    scope,
    isAuto,
    totalRecords,
    tableCounts,
    totalFiles: uploadFiles.length,
    totalFileSizeBytes,
    schemaVersion: 'prisma-5.x',
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const filename = `store-backup-${isAuto ? 'auto-' : ''}${scope}-${timestampStr}.zip`;

  return { buffer, filename, manifest };
}

// ----------------------------------------------------
// 5. SERVER SNAPSHOTS MANAGEMENT & RETENTION PRUNING
// ----------------------------------------------------
export async function createServerSnapshot(scope: 'full' | 'db' | 'media' = 'full', isAuto: boolean = false) {
  await ensureDir(BACKUPS_DIR);
  const { buffer, filename, manifest } = await createBackupArchive({ scope, isAuto });
  const filePath = path.join(BACKUPS_DIR, filename);
  await fsp.writeFile(filePath, buffer);

  // Update StoreSettings lastAutoBackupAt if isAuto
  if (isAuto) {
    try {
      await prisma.storeSettings.update({
        where: { id: 'default' },
        data: { lastAutoBackupAt: new Date() },
      });
    } catch (e) {
      console.error('Error updating lastAutoBackupAt:', e);
    }
  }

  return { filename, filePath, size: buffer.length, manifest };
}

export interface ServerSnapshotItem {
  filename: string;
  sizeBytes: number;
  formattedSize: string;
  createdAt: string;
  scope: 'full' | 'db' | 'media' | 'unknown';
  isAuto: boolean;
  ageDays: number;
  isExpired: boolean;
}

export async function listServerSnapshots(retentionDays: number = 7): Promise<ServerSnapshotItem[]> {
  await ensureDir(BACKUPS_DIR);
  if (!fs.existsSync(BACKUPS_DIR)) return [];

  const files = await fsp.readdir(BACKUPS_DIR);
  const snapshots: ServerSnapshotItem[] = [];
  const now = Date.now();

  for (const filename of files) {
    if (!filename.endsWith('.zip') && !filename.endsWith('.json')) continue;
    const fullPath = path.join(BACKUPS_DIR, filename);
    try {
      const stat = await fsp.stat(fullPath);
      if (!stat.isFile()) continue;

      const ageMs = now - stat.mtimeMs;
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
      const isExpired = ageDays >= retentionDays;

      let scope: 'full' | 'db' | 'media' | 'unknown' = 'unknown';
      if (filename.includes('full')) scope = 'full';
      else if (filename.includes('db')) scope = 'db';
      else if (filename.includes('media')) scope = 'media';

      const isAuto = filename.includes('auto-');

      snapshots.push({
        filename,
        sizeBytes: stat.size,
        formattedSize: formatBytes(stat.size),
        createdAt: stat.mtime.toISOString(),
        scope,
        isAuto,
        ageDays,
        isExpired,
      });
    } catch (e) {
      // Ignore unreadable file
    }
  }

  // Sort latest first
  snapshots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return snapshots;
}

export async function deleteServerSnapshot(filename: string): Promise<boolean> {
  const safeName = path.basename(filename);
  const fullPath = path.join(BACKUPS_DIR, safeName);
  if (fs.existsSync(fullPath)) {
    await fsp.unlink(fullPath);
    return true;
  }
  return false;
}

export async function pruneExpiredBackups(retentionDays: number = 7): Promise<{ prunedCount: number; deletedFiles: string[] }> {
  await ensureDir(BACKUPS_DIR);
  if (!fs.existsSync(BACKUPS_DIR)) return { prunedCount: 0, deletedFiles: [] };

  const snapshots = await listServerSnapshots(retentionDays);
  const deletedFiles: string[] = [];

  for (const snap of snapshots) {
    if (snap.isExpired) {
      try {
        const fullPath = path.join(BACKUPS_DIR, snap.filename);
        if (fs.existsSync(fullPath)) {
          await fsp.unlink(fullPath);
          deletedFiles.push(snap.filename);
        }
      } catch (e) {
        console.error(`Failed to prune backup ${snap.filename}:`, e);
      }
    }
  }

  return { prunedCount: deletedFiles.length, deletedFiles };
}

// ----------------------------------------------------
// 6. BACKUP VALIDATION (PREVIEW & DRY RUN)
// ----------------------------------------------------
export async function validateBackup(buffer: Buffer, filename: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isZip = filename.toLowerCase().endsWith('.zip') || buffer.slice(0, 4).toString('hex') === '504b0304';
  const isJson = filename.toLowerCase().endsWith('.json') || buffer.slice(0, 1).toString() === '{';

  if (!isZip && !isJson) {
    return {
      valid: false,
      type: 'unknown',
      tableCounts: {},
      totalRecords: 0,
      fileCount: 0,
      totalFileSizeBytes: 0,
      errors: ['الملف غير مدعوم. يجب أن يكون ملف ZIP أو JSON صالح | Unsupported file format. Must be a valid ZIP or JSON file.'],
      warnings: [],
    };
  }

  if (isJson) {
    try {
      const parsed = JSON.parse(buffer.toString('utf-8'));
      const dbData = parsed.database || parsed;
      const manifest = parsed.manifest as BackupManifest | undefined;

      const tableCounts: Record<string, number> = {
        storeSettings: Array.isArray(dbData.storeSettings) ? dbData.storeSettings.length : 0,
        users: Array.isArray(dbData.users) ? dbData.users.length : 0,
        addresses: Array.isArray(dbData.addresses) ? dbData.addresses.length : 0,
        categories: Array.isArray(dbData.categories) ? dbData.categories.length : 0,
        products: Array.isArray(dbData.products) ? dbData.products.length : 0,
        productVariants: Array.isArray(dbData.productVariants) ? dbData.productVariants.length : 0,
        reviews: Array.isArray(dbData.reviews) ? dbData.reviews.length : 0,
        orders: Array.isArray(dbData.orders) ? dbData.orders.length : 0,
        orderItems: Array.isArray(dbData.orderItems) ? dbData.orderItems.length : 0,
        promoCodes: Array.isArray(dbData.promoCodes) ? dbData.promoCodes.length : 0,
        promoCodeIpUsages: Array.isArray(dbData.promoCodeIpUsages) ? dbData.promoCodeIpUsages.length : 0,
        returnRequests: Array.isArray(dbData.returnRequests) ? dbData.returnRequests.length : 0,
        referralRecords: Array.isArray(dbData.referralRecords) ? dbData.referralRecords.length : 0,
        pageViews: Array.isArray(dbData.pageViews) ? dbData.pageViews.length : 0,
      };

      const totalRecords = Object.values(tableCounts).reduce((a, b) => a + b, 0);

      if (totalRecords === 0) {
        warnings.push('ملف النسخة الاحتياطية لا يحتوي على أي سجلات بيانات | The backup file contains 0 database records.');
      }

      return {
        valid: errors.length === 0,
        type: 'db',
        manifest,
        tableCounts,
        totalRecords,
        fileCount: 0,
        totalFileSizeBytes: 0,
        errors,
        warnings,
        databaseData: dbData,
      };
    } catch (e: any) {
      return {
        valid: false,
        type: 'db',
        tableCounts: {},
        totalRecords: 0,
        fileCount: 0,
        totalFileSizeBytes: 0,
        errors: [`ملف JSON تالف أو غير صالح: ${e.message} | Invalid JSON backup file.`],
        warnings: [],
      };
    }
  }

  // Process ZIP
  try {
    const zip = await JSZip.loadAsync(buffer);
    let manifest: BackupManifest | undefined;
    let databaseData: any = null;
    let fileCount = 0;
    let totalFileSizeBytes = 0;

    // Check manifest
    const manifestFile = zip.file('manifest.json');
    if (manifestFile) {
      try {
        const manifestText = await manifestFile.async('text');
        manifest = JSON.parse(manifestText);
      } catch (e) {
        warnings.push('تعذر قراءة ملف البيان manifest.json في الأرشيف | Could not parse manifest.json.');
      }
    }

    // Check database
    const dbFile = zip.file('database_backup.json');
    const tableCounts: Record<string, number> = {};

    if (dbFile) {
      try {
        const dbText = await dbFile.async('text');
        databaseData = JSON.parse(dbText);

        tableCounts.storeSettings = Array.isArray(databaseData.storeSettings) ? databaseData.storeSettings.length : 0;
        tableCounts.users = Array.isArray(databaseData.users) ? databaseData.users.length : 0;
        tableCounts.addresses = Array.isArray(databaseData.addresses) ? databaseData.addresses.length : 0;
        tableCounts.categories = Array.isArray(databaseData.categories) ? databaseData.categories.length : 0;
        tableCounts.products = Array.isArray(databaseData.products) ? databaseData.products.length : 0;
        tableCounts.productVariants = Array.isArray(databaseData.productVariants) ? databaseData.productVariants.length : 0;
        tableCounts.reviews = Array.isArray(databaseData.reviews) ? databaseData.reviews.length : 0;
        tableCounts.orders = Array.isArray(databaseData.orders) ? databaseData.orders.length : 0;
        tableCounts.orderItems = Array.isArray(databaseData.orderItems) ? databaseData.orderItems.length : 0;
        tableCounts.promoCodes = Array.isArray(databaseData.promoCodes) ? databaseData.promoCodes.length : 0;
        tableCounts.promoCodeIpUsages = Array.isArray(databaseData.promoCodeIpUsages) ? databaseData.promoCodeIpUsages.length : 0;
        tableCounts.returnRequests = Array.isArray(databaseData.returnRequests) ? databaseData.returnRequests.length : 0;
        tableCounts.referralRecords = Array.isArray(databaseData.referralRecords) ? databaseData.referralRecords.length : 0;
        tableCounts.pageViews = Array.isArray(databaseData.pageViews) ? databaseData.pageViews.length : 0;
      } catch (e: any) {
        errors.push(`فشل قراءة ملف قاعدة البيانات database_backup.json داخل الأرشيف: ${e.message}`);
      }
    }

    // Count uploads files in ZIP
    zip.forEach((relPath, file) => {
      if (!file.dir && relPath.startsWith('uploads/')) {
        fileCount++;
      }
    });

    const totalRecords = Object.values(tableCounts).reduce((a, b) => a + b, 0);

    let type: 'full' | 'db' | 'media' | 'unknown' = 'unknown';
    if (dbFile && fileCount > 0) type = 'full';
    else if (dbFile) type = 'db';
    else if (fileCount > 0) type = 'media';

    if (!dbFile && fileCount === 0) {
      errors.push('الأرشيف لا يحتوي على ملف قاعدة بيانات أو ملفات وسائط صالحة | Archive contains neither database nor media uploads.');
    }

    return {
      valid: errors.length === 0,
      type,
      manifest,
      tableCounts,
      totalRecords,
      fileCount,
      totalFileSizeBytes: manifest?.totalFileSizeBytes || totalFileSizeBytes,
      errors,
      warnings,
      databaseData,
    };
  } catch (e: any) {
    return {
      valid: false,
      type: 'unknown',
      tableCounts: {},
      totalRecords: 0,
      fileCount: 0,
      totalFileSizeBytes: 0,
      errors: [`أرشيف ZIP غير صالح أو تالف: ${e.message} | Corrupt ZIP file.`],
      warnings: [],
    };
  }
}

// ----------------------------------------------------
// 7. RESTORE EXECUTION ENGINE
// ----------------------------------------------------
export async function restoreBackup(
  buffer: Buffer,
  filename: string,
  options: {
    mode?: 'replace' | 'merge';
    autoSnapshot?: boolean;
  } = {}
): Promise<RestoreResult> {
  const startTime = Date.now();
  const { mode = 'replace', autoSnapshot = true } = options;

  // 1. Validate the backup first
  const validation = await validateBackup(buffer, filename);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  // 2. Take automatic safety snapshot before restore if requested
  let snapshotCreated: string | undefined;
  if (autoSnapshot) {
    try {
      const snap = await createServerSnapshot('full', false);
      snapshotCreated = snap.filename;
    } catch (e) {
      console.warn('Could not create pre-restore snapshot:', e);
    }
  }

  let filesRestored = 0;
  const isZip = filename.toLowerCase().endsWith('.zip') || buffer.slice(0, 4).toString('hex') === '504b0304';

  // 3. Restore media files if ZIP
  if (isZip) {
    const zip = await JSZip.loadAsync(buffer);
    await ensureDir(UPLOADS_DIR);

    for (const [relPath, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir || !relPath.startsWith('uploads/')) continue;

      const subPath = relPath.replace(/^uploads\//, '');
      const targetFilePath = path.join(UPLOADS_DIR, subPath);
      const targetDirPath = path.dirname(targetFilePath);

      await ensureDir(targetDirPath);
      const fileData = await zipEntry.async('nodebuffer');
      await fsp.writeFile(targetFilePath, fileData);
      filesRestored++;
    }
  }

  // 4. Restore Database Data if present
  const dbData = validation.databaseData;
  const tablesRestored: Record<string, number> = {};

  if (dbData) {
    // If Replace mode: Clean existing data in reverse relational dependency order
    if (mode === 'replace') {
      await prisma.$transaction(async (tx) => {
        await tx.pageView.deleteMany();
        await tx.promoCodeIpUsage.deleteMany();
        await tx.referralRecord.deleteMany();
        await tx.returnRequest.deleteMany();
        await tx.orderItem.deleteMany();
        await tx.review.deleteMany();
        await tx.order.deleteMany();
        await tx.productVariant.deleteMany();
        await tx.product.deleteMany();
        await tx.address.deleteMany();
        // Break self references before delete
        await tx.category.updateMany({ data: { parentId: null } });
        await tx.category.deleteMany();
        await tx.user.updateMany({ data: { referredById: null } });
        await tx.user.deleteMany();
        await tx.promoCode.deleteMany();
        await tx.storeSettings.deleteMany();
      });
    }

    // Insert records in forward dependency order with error resilience

    // 1. StoreSettings
    if (Array.isArray(dbData.storeSettings) && dbData.storeSettings.length > 0) {
      let count = 0;
      for (const item of dbData.storeSettings) {
        const { updatedAt, ...settingsFields } = item;
        await prisma.storeSettings.upsert({
          where: { id: item.id || 'default' },
          create: {
            ...settingsFields,
            lastAutoBackupAt: settingsFields.lastAutoBackupAt ? new Date(settingsFields.lastAutoBackupAt) : null,
          },
          update: {
            ...settingsFields,
            lastAutoBackupAt: settingsFields.lastAutoBackupAt ? new Date(settingsFields.lastAutoBackupAt) : null,
          },
        });
        count++;
      }
      tablesRestored.storeSettings = count;
    }

    // 2. Categories (2-pass for parent-child hierarchy)
    if (Array.isArray(dbData.categories) && dbData.categories.length > 0) {
      let count = 0;
      // Pass 1: create with parentId = null
      for (const cat of dbData.categories) {
        await prisma.category.upsert({
          where: { id: cat.id },
          create: {
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description || null,
            image: cat.image || null,
            parentId: null,
            createdAt: cat.createdAt ? new Date(cat.createdAt) : new Date(),
          },
          update: {
            name: cat.name,
            slug: cat.slug,
            description: cat.description || null,
            image: cat.image || null,
          },
        });
        count++;
      }
      // Pass 2: connect parentId
      for (const cat of dbData.categories) {
        if (cat.parentId) {
          try {
            await prisma.category.update({
              where: { id: cat.id },
              data: { parentId: cat.parentId },
            });
          } catch (e) {
            // Ignore if parent not found
          }
        }
      }
      tablesRestored.categories = count;
    }

    // 3. Users (2-pass for referrer self-reference)
    if (Array.isArray(dbData.users) && dbData.users.length > 0) {
      let count = 0;
      // Pass 1: create without referredById
      for (const user of dbData.users) {
        await prisma.user.upsert({
          where: { id: user.id },
          create: {
            id: user.id,
            name: user.name,
            email: user.email,
            password: user.password,
            role: user.role || 'USER',
            permissions: user.permissions || '[]',
            loyaltyPoints: user.loyaltyPoints || 0,
            phone: user.phone || null,
            state: user.state || null,
            city: user.city || null,
            address: user.address || null,
            referralCode: user.referralCode || null,
            referredById: null,
            createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
            updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
          },
          update: {
            name: user.name,
            email: user.email,
            password: user.password,
            role: user.role || 'USER',
            permissions: user.permissions || '[]',
            loyaltyPoints: user.loyaltyPoints || 0,
            phone: user.phone || null,
            state: user.state || null,
            city: user.city || null,
            address: user.address || null,
            referralCode: user.referralCode || null,
          },
        });
        count++;
      }
      // Pass 2: update referredById
      for (const user of dbData.users) {
        if (user.referredById) {
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { referredById: user.referredById },
            });
          } catch (e) {
            // Ignore if referrer not found
          }
        }
      }
      tablesRestored.users = count;
    }

    // 4. Addresses
    if (Array.isArray(dbData.addresses) && dbData.addresses.length > 0) {
      let count = 0;
      for (const addr of dbData.addresses) {
        try {
          await prisma.address.upsert({
            where: { id: addr.id },
            create: {
              id: addr.id,
              userId: addr.userId,
              title: addr.title || 'المنزل',
              recipientName: addr.recipientName || null,
              phone: addr.phone || '',
              state: addr.state || null,
              city: addr.city || '',
              streetAddress: addr.streetAddress || '',
              isDefault: Boolean(addr.isDefault),
              createdAt: addr.createdAt ? new Date(addr.createdAt) : new Date(),
              updatedAt: addr.updatedAt ? new Date(addr.updatedAt) : new Date(),
            },
            update: {
              title: addr.title || 'المنزل',
              recipientName: addr.recipientName || null,
              phone: addr.phone || '',
              state: addr.state || null,
              city: addr.city || '',
              streetAddress: addr.streetAddress || '',
              isDefault: Boolean(addr.isDefault),
            },
          });
          count++;
        } catch (e) {
          // User might not exist if merging
        }
      }
      tablesRestored.addresses = count;
    }

    // 5. Products & Product Category Links
    if (Array.isArray(dbData.products) && dbData.products.length > 0) {
      let count = 0;
      for (const prod of dbData.products) {
        const categoryConnect = Array.isArray(prod.categories)
          ? prod.categories.map((c: any) => ({ id: c.id }))
          : [];

        await prisma.product.upsert({
          where: { id: prod.id },
          create: {
            id: prod.id,
            title: prod.title,
            description: prod.description || '',
            price: Number(prod.price) || 0,
            discountPercent: Number(prod.discountPercent) || 0,
            stockQuantity: Number(prod.stockQuantity) || 0,
            images: prod.images || '[]',
            averageRating: Number(prod.averageRating) || 0,
            ratingCount: Number(prod.ratingCount) || 0,
            saleEndsAt: prod.saleEndsAt ? new Date(prod.saleEndsAt) : null,
            createdAt: prod.createdAt ? new Date(prod.createdAt) : new Date(),
            updatedAt: prod.updatedAt ? new Date(prod.updatedAt) : new Date(),
            categories: {
              connect: categoryConnect,
            },
          },
          update: {
            title: prod.title,
            description: prod.description || '',
            price: Number(prod.price) || 0,
            discountPercent: Number(prod.discountPercent) || 0,
            stockQuantity: Number(prod.stockQuantity) || 0,
            images: prod.images || '[]',
            averageRating: Number(prod.averageRating) || 0,
            ratingCount: Number(prod.ratingCount) || 0,
            saleEndsAt: prod.saleEndsAt ? new Date(prod.saleEndsAt) : null,
            categories: {
              set: categoryConnect,
            },
          },
        });
        count++;
      }
      tablesRestored.products = count;
    }

    // 6. Product Variants
    if (Array.isArray(dbData.productVariants) && dbData.productVariants.length > 0) {
      let count = 0;
      for (const v of dbData.productVariants) {
        try {
          await prisma.productVariant.upsert({
            where: { id: v.id },
            create: {
              id: v.id,
              productId: v.productId,
              colorName: v.colorName,
              colorHex: v.colorHex || '#6366f1',
              stockQuantity: Number(v.stockQuantity) || 0,
              image: v.image || null,
              createdAt: v.createdAt ? new Date(v.createdAt) : new Date(),
              updatedAt: v.updatedAt ? new Date(v.updatedAt) : new Date(),
            },
            update: {
              colorName: v.colorName,
              colorHex: v.colorHex || '#6366f1',
              stockQuantity: Number(v.stockQuantity) || 0,
              image: v.image || null,
            },
          });
          count++;
        } catch (e) {
          // Product might not exist
        }
      }
      tablesRestored.productVariants = count;
    }

    // 7. Promo Codes
    if (Array.isArray(dbData.promoCodes) && dbData.promoCodes.length > 0) {
      let count = 0;
      for (const promo of dbData.promoCodes) {
        await prisma.promoCode.upsert({
          where: { code: promo.code },
          create: {
            id: promo.id,
            code: promo.code,
            discountType: promo.discountType || 'PERCENTAGE',
            discountValue: Number(promo.discountValue) || 0,
            description: promo.description || '',
            minOrderAmount: Number(promo.minOrderAmount) || 0,
            maxUses: promo.maxUses ? Number(promo.maxUses) : null,
            maxUsesPerUser: promo.maxUsesPerUser ? Number(promo.maxUsesPerUser) : null,
            usedCount: Number(promo.usedCount) || 0,
            expiresAt: promo.expiresAt ? new Date(promo.expiresAt) : null,
            isActive: Boolean(promo.isActive),
            createdAt: promo.createdAt ? new Date(promo.createdAt) : new Date(),
            updatedAt: promo.updatedAt ? new Date(promo.updatedAt) : new Date(),
          },
          update: {
            discountType: promo.discountType || 'PERCENTAGE',
            discountValue: Number(promo.discountValue) || 0,
            description: promo.description || '',
            minOrderAmount: Number(promo.minOrderAmount) || 0,
            maxUses: promo.maxUses ? Number(promo.maxUses) : null,
            maxUsesPerUser: promo.maxUsesPerUser ? Number(promo.maxUsesPerUser) : null,
            usedCount: Number(promo.usedCount) || 0,
            expiresAt: promo.expiresAt ? new Date(promo.expiresAt) : null,
            isActive: Boolean(promo.isActive),
          },
        });
        count++;
      }
      tablesRestored.promoCodes = count;
    }

    // 8. Orders
    if (Array.isArray(dbData.orders) && dbData.orders.length > 0) {
      let count = 0;
      for (const ord of dbData.orders) {
        try {
          await prisma.order.upsert({
            where: { id: ord.id },
            create: {
              id: ord.id,
              userId: ord.userId || null,
              guestInfo: ord.guestInfo || null,
              totalAmount: Number(ord.totalAmount) || 0,
              promoCode: ord.promoCode || null,
              discountAmount: Number(ord.discountAmount) || 0,
              pointsUsed: Number(ord.pointsUsed) || 0,
              pointsEarned: Number(ord.pointsEarned) || 0,
              paymentMethod: ord.paymentMethod || 'COD',
              paymentStatus: ord.paymentStatus || 'PENDING',
              paymentProof: ord.paymentProof || null,
              trackingNumber: ord.trackingNumber || null,
              estimatedDelivery: ord.estimatedDelivery ? new Date(ord.estimatedDelivery) : null,
              status: ord.status || 'PENDING',
              referralCode: ord.referralCode || null,
              createdAt: ord.createdAt ? new Date(ord.createdAt) : new Date(),
              updatedAt: ord.updatedAt ? new Date(ord.updatedAt) : new Date(),
            },
            update: {
              totalAmount: Number(ord.totalAmount) || 0,
              promoCode: ord.promoCode || null,
              discountAmount: Number(ord.discountAmount) || 0,
              pointsUsed: Number(ord.pointsUsed) || 0,
              pointsEarned: Number(ord.pointsEarned) || 0,
              paymentMethod: ord.paymentMethod || 'COD',
              paymentStatus: ord.paymentStatus || 'PENDING',
              paymentProof: ord.paymentProof || null,
              trackingNumber: ord.trackingNumber || null,
              estimatedDelivery: ord.estimatedDelivery ? new Date(ord.estimatedDelivery) : null,
              status: ord.status || 'PENDING',
            },
          });
          count++;
        } catch (e) {
          // User might not exist
        }
      }
      tablesRestored.orders = count;
    }

    // 9. Order Items
    if (Array.isArray(dbData.orderItems) && dbData.orderItems.length > 0) {
      let count = 0;
      for (const item of dbData.orderItems) {
        try {
          await prisma.orderItem.upsert({
            where: { id: item.id },
            create: {
              id: item.id,
              orderId: item.orderId,
              productId: item.productId,
              variantId: item.variantId || null,
              colorName: item.colorName || null,
              quantity: Number(item.quantity) || 1,
              price: Number(item.price) || 0,
            },
            update: {
              variantId: item.variantId || null,
              colorName: item.colorName || null,
              quantity: Number(item.quantity) || 1,
              price: Number(item.price) || 0,
            },
          });
          count++;
        } catch (e) {
          // Order or product might not exist
        }
      }
      tablesRestored.orderItems = count;
    }

    // 10. Reviews
    if (Array.isArray(dbData.reviews) && dbData.reviews.length > 0) {
      let count = 0;
      for (const rev of dbData.reviews) {
        try {
          await prisma.review.upsert({
            where: { id: rev.id },
            create: {
              id: rev.id,
              productId: rev.productId,
              userId: rev.userId || null,
              authorName: rev.authorName || 'عميل',
              authorEmail: rev.authorEmail || null,
              rating: Number(rev.rating) || 5,
              comment: rev.comment || '',
              isVerified: Boolean(rev.isVerified),
              status: rev.status || 'APPROVED',
              adminReply: rev.adminReply || null,
              adminRepliedAt: rev.adminRepliedAt ? new Date(rev.adminRepliedAt) : null,
              createdAt: rev.createdAt ? new Date(rev.createdAt) : new Date(),
            },
            update: {
              authorName: rev.authorName || 'عميل',
              authorEmail: rev.authorEmail || null,
              rating: Number(rev.rating) || 5,
              comment: rev.comment || '',
              isVerified: Boolean(rev.isVerified),
              status: rev.status || 'APPROVED',
              adminReply: rev.adminReply || null,
              adminRepliedAt: rev.adminRepliedAt ? new Date(rev.adminRepliedAt) : null,
            },
          });
          count++;
        } catch (e) {
          // Product might not exist
        }
      }
      tablesRestored.reviews = count;
    }

    // 11. Return Requests
    if (Array.isArray(dbData.returnRequests) && dbData.returnRequests.length > 0) {
      let count = 0;
      for (const ret of dbData.returnRequests) {
        try {
          await prisma.returnRequest.upsert({
            where: { id: ret.id },
            create: {
              id: ret.id,
              orderId: ret.orderId,
              userId: ret.userId || null,
              reason: ret.reason || 'DEFECTIVE',
              reasonDetails: ret.reasonDetails || null,
              refundMethod: ret.refundMethod || 'ORIGINAL',
              refundDetails: ret.refundDetails || null,
              images: ret.images || '[]',
              status: ret.status || 'REQUESTED',
              adminNotes: ret.adminNotes || null,
              createdAt: ret.createdAt ? new Date(ret.createdAt) : new Date(),
              updatedAt: ret.updatedAt ? new Date(ret.updatedAt) : new Date(),
            },
            update: {
              reason: ret.reason || 'DEFECTIVE',
              reasonDetails: ret.reasonDetails || null,
              refundMethod: ret.refundMethod || 'ORIGINAL',
              refundDetails: ret.refundDetails || null,
              images: ret.images || '[]',
              status: ret.status || 'REQUESTED',
              adminNotes: ret.adminNotes || null,
            },
          });
          count++;
        } catch (e) {
          // Order might not exist
        }
      }
      tablesRestored.returnRequests = count;
    }

    // 12. Referral Records
    if (Array.isArray(dbData.referralRecords) && dbData.referralRecords.length > 0) {
      let count = 0;
      for (const ref of dbData.referralRecords) {
        try {
          await prisma.referralRecord.upsert({
            where: { referredUserId: ref.referredUserId },
            create: {
              id: ref.id,
              referrerId: ref.referrerId,
              referredUserId: ref.referredUserId,
              orderId: ref.orderId || null,
              status: ref.status || 'PENDING',
              rewardPoints: Number(ref.rewardPoints) || 0,
              discountGiven: Number(ref.discountGiven) || 0,
              createdAt: ref.createdAt ? new Date(ref.createdAt) : new Date(),
            },
            update: {
              referrerId: ref.referrerId,
              orderId: ref.orderId || null,
              status: ref.status || 'PENDING',
              rewardPoints: Number(ref.rewardPoints) || 0,
              discountGiven: Number(ref.discountGiven) || 0,
            },
          });
          count++;
        } catch (e) {
          // Referrer or referred user might not exist
        }
      }
      tablesRestored.referralRecords = count;
    }

    // 13. PromoCode IP Usage
    if (Array.isArray(dbData.promoCodeIpUsages) && dbData.promoCodeIpUsages.length > 0) {
      let count = 0;
      for (const ipu of dbData.promoCodeIpUsages) {
        try {
          await prisma.promoCodeIpUsage.create({
            data: {
              id: ipu.id,
              code: ipu.code,
              ip: ipu.ip,
              fingerprintId: ipu.fingerprintId || '',
              usedAt: ipu.usedAt ? new Date(ipu.usedAt) : new Date(),
            },
          });
          count++;
        } catch (e) {
          // Ignore duplicate
        }
      }
      tablesRestored.promoCodeIpUsages = count;
    }

    // 14. PageViews
    if (Array.isArray(dbData.pageViews) && dbData.pageViews.length > 0) {
      let count = 0;
      for (const pv of dbData.pageViews) {
        try {
          await prisma.pageView.create({
            data: {
              id: pv.id,
              path: pv.path,
              referrer: pv.referrer || null,
              ip: pv.ip || null,
              userAgent: pv.userAgent || null,
              createdAt: pv.createdAt ? new Date(pv.createdAt) : new Date(),
            },
          });
          count++;
        } catch (e) {
          // Ignore duplicate
        }
      }
      tablesRestored.pageViews = count;
    }
  }

  const totalRecordsRestored = Object.values(tablesRestored).reduce((a, b) => a + b, 0);
  const durationMs = Date.now() - startTime;

  return {
    success: true,
    mode,
    tablesRestored,
    totalRecordsRestored,
    filesRestored,
    durationMs,
    snapshotCreated,
  };
}

// ----------------------------------------------------
// 8. SCHEDULED AUTO-BACKUP & RETENTION ENGINE
// ----------------------------------------------------
export async function checkAndRunScheduledAutoBackup(): Promise<{
  ran: boolean;
  reason?: string;
  snapshot?: any;
  pruned?: { prunedCount: number; deletedFiles: string[] };
}> {
  const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
  if (!settings) return { ran: false, reason: 'Settings not found' };

  const retentionDays = settings.autoBackupRetentionDays || 7;
  const pruned = await pruneExpiredBackups(retentionDays);

  if (!settings.autoBackupEnabled) {
    return { ran: false, reason: 'Auto-backup is disabled in store settings', pruned };
  }

  const now = Date.now();
  const lastRun = settings.lastAutoBackupAt ? new Date(settings.lastAutoBackupAt).getTime() : 0;
  const frequency = settings.autoBackupFrequency || 'daily';

  let intervalMs = 24 * 60 * 60 * 1000; // 1 day default
  if (frequency === 'every_12_hours') intervalMs = 12 * 60 * 60 * 1000;
  else if (frequency === 'every_3_days') intervalMs = 3 * 24 * 60 * 60 * 1000;
  else if (frequency === 'weekly') intervalMs = 7 * 24 * 60 * 60 * 1000;

  const timeElapsed = now - lastRun;
  if (timeElapsed >= intervalMs || lastRun === 0) {
    const scope = (settings.autoBackupScope as 'full' | 'db' | 'media') || 'full';
    const snapshot = await createServerSnapshot(scope, true);
    return { ran: true, snapshot, pruned };
  }

  return {
    ran: false,
    reason: `Interval (${frequency}) not reached yet. ${Math.round((intervalMs - timeElapsed) / 60000)} minutes remaining.`,
    pruned,
  };
}

// Helper formatting function
export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

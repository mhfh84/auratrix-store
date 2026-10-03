# 🗄️ Database Cloud Deployment & Production Readiness Guide

This guide explains how to deploy and configure **Auratrix Store** with cloud PostgreSQL, MySQL, or local SQLite.

---

## ⚡ Quick Database Switch Commands

Switch between database engines in 1 command:

```bash
# Switch to PostgreSQL (Supabase, Neon, AWS RDS, Railway, Render)
npm run db:use:postgres

# Switch to MySQL (PlanetScale, AWS Aurora, TiDB, Docker MySQL)
npm run db:use:mysql

# Switch back to SQLite (Local Development)
npm run db:use:sqlite
```

---

## 🚀 Deploying to Cloud PostgreSQL (Recommended)

### 1. Supabase / Neon / Railway / AWS RDS

1. **Create your cloud database**:
   - [Supabase](https://supabase.com) (Create new project -> Get Connection String in Transaction Pooler / Direct mode)
   - [Neon](https://neon.tech) (Create serverless Postgres branch -> Copy connection string)
   - [Railway](https://railway.app) / [Render](https://render.com) (Provision PostgreSQL service)

2. **Configure your `.env`**:
   ```env
   # Transaction pooled connection (Port 6543 / PgBouncer for serverless)
   DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

   # Direct connection for migrations (Port 5432)
   DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
   ```

3. **Activate PostgreSQL Schema & Push/Migrate**:
   ```bash
   npm run db:use:postgres
   npm run db:push
   # Or create tracked migration:
   # npm run db:migrate
   ```

4. **Seed initial store data (Products, Categories, Admin account)**:
   ```bash
   npm run db:seed
   ```

---

## 🐬 Deploying to Cloud MySQL / PlanetScale

1. **Configure your `.env`**:
   ```env
   DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/auratrix?sslaccept=strict"
   ```

2. **Activate MySQL Schema & Push**:
   ```bash
   npm run db:use:mysql
   npm run db:push
   npm run db:seed
   ```

---

## 🛡️ Production Optimizations Included

1. **Composite & Foreign Key Indexes (`@@index`)**:
   - `Product` indexes on `price`, `averageRating`, `stockQuantity`, `createdAt` for high-throughput filtering and sorting.
   - `Order` indexes on `userId`, `status`, `paymentStatus`, `trackingNumber`.
   - `Review` indexes on `productId`, `userId`, `rating`.
   - `Category` hierarchy indexes on `parentId`.
2. **Text / JSON Compatibility (`@db.Text`)**:
   - Automatic mapping of JSON columns (`images`, `permissions`, `guestInfo`) to long text types preventing truncation across SQL variants.
3. **Connection Pooling**:
   - Support for `directUrl` to handle serverless connection pooling (PgBouncer/Supavisor) on Vercel/Netlify.

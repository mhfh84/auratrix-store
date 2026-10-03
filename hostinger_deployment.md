# 🚀 Hostinger Deployment Guide — Auratrix Store

## What Was Optimized (CPU & RAM)

| Area | Change | Impact |
|------|--------|--------|
| **Next.js output** | `output: 'standalone'` | Reduces deployed size ~90% (~50 MB vs ~500 MB) |
| **Home page** | ISR `revalidate = 60` instead of `0` | DB queries run once/min, not once/visitor |
| **Images** | WebP-only, skip AVIF, 7-day cache | Eliminates CPU-heavy AVIF encoding |
| **HTTP Cache** | Cache-Control on `/api/settings`, `/api/categories`, `/api/products` | Browser reuses responses, fewer API hits |
| **Prisma pool** | `connection_limit=1` for SQLite | No wasted idle DB threads |
| **SSE listeners** | Capped at 50 (was 200) | 4× fewer event listener objects in RAM |
| **Node.js heap** | `--max-old-space-size=350` via PM2 | Hard cap prevents OOM crash |
| **PM2 memory guard** | Restart at 400 MB | Auto-recovers from memory leaks |
| **Gzip** | `compress: true` in next.config.js | Smaller response payload → less bandwidth |
| **Log silencing** | Prisma only logs `error` in production | No I/O overhead from `query` logs |

---

## Step 1 — Hostinger VPS Setup

Log into your VPS via SSH, then install Node.js 20 and PM2:

```bash
# Install Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Verify
node -v   # should be v20.x.x
pm2 -v    # should be 5.x.x
```

---

## Step 2 — Upload Your Code

From your **local machine** (in the project folder):

```bash
# Build the standalone production bundle locally first
npm run build:prod

# Upload ONLY what's needed (not node_modules or .next cache)
rsync -avz --exclude='node_modules' --exclude='.next/cache' \
  ./ user@your-server-ip:/var/www/auratrix-store/
```

Or use **Git** on the server:
```bash
git clone https://github.com/yourrepo/auratrix-store.git /var/www/auratrix-store
```

---

## Step 3 — Configure Environment on the Server

```bash
cd /var/www/auratrix-store
cp .env.production.example .env.production.local

# Edit with your real values
nano .env.production.local
```

Fill in:
- `NEXTAUTH_SECRET` → run `openssl rand -hex 32` to generate
- `NEXTAUTH_URL` → your actual domain e.g. `https://store.yourdomain.com`
- `NEXT_PUBLIC_SITE_URL` → same as above
- `DATABASE_URL` → `file:./prisma/prod.db`

---

## Step 4 — Install Dependencies & Build

```bash
cd /var/www/auratrix-store

# Install production dependencies only (skip devDependencies)
npm install --omit=dev

# Generate Prisma client and build Next.js
npm run build:prod

# Run database migrations
npx prisma migrate deploy

# (First time only) Seed the database
npm run db:seed
```

---

## Step 5 — Start with PM2

```bash
# Start the app
npm run start:prod

# Verify it's running
pm2 list
pm2 monit    # live memory/CPU dashboard

# Save PM2 process list so it survives server reboots
pm2 save

# Auto-start PM2 on system boot
pm2 startup
# ↑ Copy and run the command it prints
```

---

## Step 6 — Nginx Reverse Proxy (Required)

Install Nginx and configure it to forward port 80/443 → 3000:

```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/auratrix-store
```

Paste this config:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Gzip compression
    gzip on;
    gzip_proxied any;
    gzip_comp_level 4;
    gzip_types text/css application/javascript image/svg+xml;

    # Upload size limit (match our 8MB upload cap)
    client_max_body_size 10M;

    # Static assets — served directly by Nginx (zero Node.js involvement)
    location /_next/static/ {
        alias /var/www/auratrix-store/.next/static/;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /uploads/ {
        alias /var/www/auratrix-store/public/uploads/;
        add_header Cache-Control "public, max-age=604800";
    }

    location /icons/ {
        alias /var/www/auratrix-store/public/icons/;
        add_header Cache-Control "public, max-age=86400";
    }

    # Everything else → Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # SSE (realtime admin dashboard): disable buffering
        proxy_buffering off;
        proxy_read_timeout 86400s;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/auratrix-store /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## Step 7 — SSL with Let's Encrypt (Free HTTPS)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (runs every 90 days)
sudo systemctl enable certbot.timer
```

---

## Day-to-Day Operations

```bash
# Update & redeploy (zero-downtime)
git pull && npm run deploy

# View live logs
npm run logs

# Monitor memory & CPU
pm2 monit

# Restart app
pm2 restart auratrix-store

# Check app status
pm2 list
```

---

## Hostinger VPS Recommendation

| Plan | RAM | Recommended? |
|------|-----|--------------|
| KVM 1 | 1 GB | ⚠️ Tight — set `max-old-space-size=250` |
| KVM 2 | 2 GB | ✅ Comfortable for this app |
| KVM 4 | 4 GB | ✅ Plenty of headroom |

> **Note**: With all optimizations applied, typical idle RAM usage is ~120–180 MB.
> Under normal traffic it stays under 250 MB.

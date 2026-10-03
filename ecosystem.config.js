/**
 * PM2 Ecosystem Config — Hostinger VPS Deployment
 * ------------------------------------------------
 * Install PM2 globally: npm install -g pm2
 * Deploy:  pm2 start ecosystem.config.js --env production
 * Save:    pm2 save && pm2 startup
 * Monitor: pm2 monit
 */

module.exports = {
  apps: [
    {
      name: 'auratrix-store',
      script: 'node_modules/.bin/next',
      args: 'start',

      // ─── Process count ────────────────────────────────────────────────
      // Use 1 instance — SQLite cannot handle concurrent writers from
      // multiple processes (it's a single file). If you upgrade to
      // PostgreSQL later, change this to 'max' for cluster mode.
      instances: 1,
      exec_mode: 'fork',

      // ─── Environment ──────────────────────────────────────────────────
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },

      // ─── Memory guard ─────────────────────────────────────────────────
      // Restart the process automatically if it exceeds 400 MB.
      // This prevents a runaway memory leak from taking down the server.
      // Increase to 512 if you have the headroom; lower to 300 for 1 GB VPS.
      max_memory_restart: '400M',

      // ─── Auto-restart on crash ────────────────────────────────────────
      autorestart: true,
      max_restarts: 10,       // Stop restarting after 10 crashes in a row
      min_uptime: '10s',      // Must run 10 s before a restart is counted

      // ─── Logging ──────────────────────────────────────────────────────
      // Redirect stdout/stderr to log files instead of the terminal.
      // Rotate logs to avoid filling the disk.
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // ─── Node.js flags ────────────────────────────────────────────────
      // --max-old-space-size: Hard cap Node's V8 heap at 350 MB.
      //   Default is ~1.5 GB, which on a 1 GB VPS would OOM-kill the process.
      // --expose-gc: Allow manual GC calls if needed later.
      node_args: '--max-old-space-size=350',

      // ─── Watch (disabled in production) ───────────────────────────────
      watch: false,
      ignore_watch: ['node_modules', '.next', 'public/uploads', 'logs', 'backups'],

      // ─── Graceful shutdown ────────────────────────────────────────────
      // Give the process 5 s to finish in-flight requests before SIGKILL.
      kill_timeout: 5000,
      listen_timeout: 8000,
    },
  ],
};

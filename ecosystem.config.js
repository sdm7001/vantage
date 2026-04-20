// PM2 process manager config — run with: pm2 start ecosystem.config.js --env production
module.exports = {
  apps: [
    {
      name: 'vantage-web',
      cwd: './apps/web',
      script: 'node_modules/.bin/next',
      args: 'start --port 3000',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '1G',
      restart_delay: 3000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'vantage-worker',
      cwd: './apps/worker',
      script: 'node',
      args: '--require ./register-aliases.cjs dist/apps/worker/src/index.js',
      env_production: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '2G', // Playwright + Puppeteer are memory-heavy
      restart_delay: 5000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};

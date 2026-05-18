// PM2 Ecosystem Configuration for Hospital Survey System
// Usage: pm2 start ecosystem.config.js
//        pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [
    {
      name: 'hospital-survey',
      script: '.next/standalone/server.js',
      args: '--port 3000',
      cwd: '/var/www/hospital-survey',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Logging
      error_file: '/var/log/hospital-survey/error.log',
      out_file: '/var/log/hospital-survey/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Restart policy
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],

  deploy: {
    production: {
      user: 'root',
      host: 'YOUR_VPS_IP',
      ref: 'origin/main',
      repo: 'git@github.com:yourorg/hospital-survey.git',
      path: '/var/www/hospital-survey',
      'pre-deploy-local': '',
      'post-deploy':
        'npm install && npx prisma generate && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
    },
  },
}

/**
 * PM2 Configuration для KamHub
 * Документация: https://pm2.keymetrics.io/docs/usage/application-declaration/
 */

module.exports = {
  apps: [
    {
      name: 'kamhub-production',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/var/www/kamhub',
      instances: 'max', // Использовать все CPU cores
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Автоматический перезапуск
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Логирование
      error_file: '/var/log/pm2/kamhub-error.log',
      out_file: '/var/log/pm2/kamhub-out.log',
      log_file: '/var/log/pm2/kamhub-combined.log',
      time: true,
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Monitoring
      instance_var: 'INSTANCE_ID',
    },
    
    // Development configuration
    {
      name: 'kamhub-dev',
      script: 'node_modules/next/dist/bin/next',
      args: 'dev',
      cwd: '/var/www/kamhub',
      instances: 1,
      exec_mode: 'fork',
      watch: ['app', 'components', 'lib', 'contexts'],
      ignore_watch: ['node_modules', '.next', 'tests'],
      
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      
      error_file: '/var/log/pm2/kamhub-dev-error.log',
      out_file: '/var/log/pm2/kamhub-dev-out.log',
      time: true,
    },
  ],
  
  // Deploy configuration
  deploy: {
    production: {
      user: 'root',
      host: '5.129.248.224',
      ref: 'origin/main',
      repo: 'https://github.com/PosPk/kamhub.git',
      path: '/var/www/kamhub',
      
      'pre-deploy-local': '',
      
      'post-deploy': `
        npm install &&
        npm run build &&
        pm2 reload ecosystem.config.js --env production &&
        pm2 save
      `,
      
      'pre-setup': '',
    },
  },
};

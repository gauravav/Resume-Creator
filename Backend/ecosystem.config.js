/**
 * PM2 Ecosystem Configuration
 *
 * This configuration enables PM2 clustering for handling multiple users concurrently
 * Run with: pm2 start ecosystem.config.js
 *
 * Benefits:
 * - Automatic load balancing across CPU cores
 * - Zero-downtime reloads
 * - Automatic restart on crashes
 * - Process monitoring and logs
 */

module.exports = {
  apps: [
    {
      name: 'resume-api',
      script: './src/index.js',

      // Clustering Configuration
      instances: 'max', // Use all available CPU cores (or specify a number like 4)
      exec_mode: 'cluster', // Enable cluster mode for load balancing

      // Auto-restart Configuration
      watch: false, // Set to true in development to auto-restart on file changes
      max_memory_restart: '1G', // Restart if memory exceeds 1GB

      // Environment Variables
      env: {
        NODE_ENV: 'development',
        PORT: 3200
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3200
      },

      // Error Handling
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',

      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Merge logs from all instances
      merge_logs: true,

      // Advanced Options
      kill_timeout: 5000, // Time to wait before force killing
      listen_timeout: 3000, // Time to wait for app to be ready

      // Health Check (optional)
      // Uncomment if you want PM2 to monitor endpoint health
      // health_check: {
      //   enable: true,
      //   interval: 30000, // Check every 30 seconds
      //   path: '/health'
      // }
    }
  ]
};

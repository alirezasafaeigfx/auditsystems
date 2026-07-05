module.exports = {
  apps: [
    {
      name: "auditsystems-web",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      env: {
        NODE_ENV: "production"
      },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      error_file: "logs/web-error.log",
      out_file: "logs/web-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000
    },
    {
      name: "auditsystems-worker",
      script: "node_modules/.bin/tsx",
      args: "src/worker/index.ts",
      env: {
        NODE_ENV: "production"
      },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "256M",
      error_file: "logs/worker-error.log",
      out_file: "logs/worker-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000
    }
  ]
};

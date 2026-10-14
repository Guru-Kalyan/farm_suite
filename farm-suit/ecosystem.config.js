const path = require('path');
const fs = require('fs');

const rootDir = __dirname;
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

// Automatically locate gunicorn binary in virtual environment or fallback to system
function getGunicornPath() {
  const candidates = [
    path.join(backendDir, 'venv', 'bin', 'gunicorn'),
    path.join(backendDir, '.venv', 'bin', 'gunicorn'),
    '/home/ubuntu/farm_suite/backend/venv/bin/gunicorn',
    '/home/ubuntu/farm_suite/farm-suit/backend/venv/bin/gunicorn'
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return 'gunicorn';
}

// Automatically locate Vite runner
function getViteScript() {
  const localVite = path.join(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js');
  if (fs.existsSync(localVite)) {
    return localVite;
  }
  return 'npx';
}

const gunicornBin = getGunicornPath();
const viteBin = getViteScript();

module.exports = {
  apps: [
    {
      name: "farm-suit-frontend",
      cwd: frontendDir,
      script: viteBin,
      args: viteBin === 'npx' ? "vite preview --host 0.0.0.0 --port 3000" : "preview --host 0.0.0.0 --port 3000",
      interpreter: viteBin === 'npx' ? "none" : "node",
      autorestart: true,
      watch: false,
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
        TZ: "Asia/Kolkata"
      }
    },
    {
      name: "farm-suit-backend",
      cwd: backendDir,
      script: gunicornBin,
      args: "config.wsgi:application --bind 127.0.0.1:8000 --workers 2",
      interpreter: "none",
      autorestart: true,
      watch: false,
      max_restarts: 10,
      env: {
        PYTHONUNBUFFERED: "1",
        DJANGO_SETTINGS_MODULE: "config.settings",
        TZ: "Asia/Kolkata"
      }
    }
  ]
};

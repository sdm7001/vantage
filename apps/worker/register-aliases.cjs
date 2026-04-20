const Module = require('module');
const path = require('path');
const fs = require('fs');

// Load .env from monorepo root
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  });
}
const base = path.join(__dirname, 'dist', 'packages');
const orig = Module._resolveFilename.bind(Module);

const aliases = {
  '@vantage/queue':    path.join(base, 'queue/src/index.js'),
  '@vantage/config':   path.join(base, 'config/src/index.js'),
  '@vantage/database': path.join(base, 'database/src/index.js'),
  '@vantage/shared':   path.join(base, 'shared/src/index.js'),
};

Module._resolveFilename = function(request, ...args) {
  return aliases[request] ?? orig(request, ...args);
};

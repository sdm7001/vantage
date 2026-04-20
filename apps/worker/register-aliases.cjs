const Module = require('module');
const path = require('path');
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

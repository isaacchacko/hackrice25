// backend/test-search-launch.cjs
require('dotenv/config'); // load .env

// Register ts-node in-process (CJS), force CommonJS for this run
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'commonjs' }
});

// Now load the TS file (CJS style inside TS file is fine)
require('./test-search.ts');

/**
 * Postinstall script — patches broken dependencies in node_modules
 *
 * @creit.tech/stellar-wallets-kit has multiple broken transitive deps
 * (@stellar/freighter-api ESM/CJS interop, @lobstrco/signer-extension-api).
 * This script replaces the package with a local stub so builds work.
 */

const fs = require('fs');
const path = require('path');

const STUB_SRC = path.join(__dirname, '..', 'src', 'stubs', 'stellar-wallets-kit.js');
const STUB_PKG_DIR = path.join(__dirname, '..', 'node_modules', '@creit.tech', 'stellar-wallets-kit');
const STUB_PKG_JSON = path.join(STUB_PKG_DIR, 'package.json');
const STUB_MODULE = path.join(STUB_PKG_DIR, 'index.js');

// ---------------------------------------------------------------------------
// 1. Replace @creit.tech/stellar-wallets-kit with stub
// ---------------------------------------------------------------------------
if (fs.existsSync(STUB_PKG_DIR)) {
  // Remove original contents
  const entries = fs.readdirSync(STUB_PKG_DIR);
  for (const entry of entries) {
    if (entry !== '.git') {
      fs.rmSync(path.join(STUB_PKG_DIR, entry), { recursive: true, force: true });
    }
  }

  // Write stub package.json
  fs.writeFileSync(STUB_PKG_JSON, JSON.stringify({
    name: '@creit.tech/stellar-wallets-kit',
    version: '1.9.5',
    description: 'Stub — original package has broken transitive dependencies',
    main: 'index.js',
    module: 'index.js',
    type: 'module',
    exports: { '.': { import: './index.js', default: './index.js' } },
  }, null, 2));

  // Copy the stub module
  fs.copyFileSync(STUB_SRC, STUB_MODULE);
  console.log('[postinstall] ✓ Patched @creit.tech/stellar-wallets-kit');
} else {
  console.warn('[postinstall] ⚠ @creit.tech/stellar-wallets-kit not found in node_modules — skipping');
}

// ---------------------------------------------------------------------------
// 2. Patch @stellar/freighter-api for ESM compatibility
// ---------------------------------------------------------------------------
const FREIGHTER_DIR = path.join(__dirname, '..', 'node_modules', '@stellar', 'freighter-api');
const FREIGHTER_PKG_JSON = path.join(FREIGHTER_DIR, 'package.json');

if (fs.existsSync(FREIGHTER_DIR)) {
  // Create ESM wrapper
  const wrapperPath = path.join(FREIGHTER_DIR, 'esm-wrapper.mjs');
  const wrapperContent = `// ESM wrapper for @stellar/freighter-api
import cjsModule from './build/index.min.js';
const { WatchWalletChanges, addToken, getAddress, getNetwork, getNetworkDetails, isAllowed, isBrowser, isConnected, requestAccess, setAllowed, signAuthEntry, signMessage, signTransaction } = cjsModule;
export { WatchWalletChanges, addToken, getAddress, getNetwork, getNetworkDetails, isAllowed, isBrowser, isConnected, requestAccess, setAllowed, signAuthEntry, signMessage, signTransaction };
export default cjsModule;
`;
  fs.writeFileSync(wrapperPath, wrapperContent);

  // Add exports field to package.json
  const pkg = JSON.parse(fs.readFileSync(FREIGHTER_PKG_JSON, 'utf-8'));
  if (!pkg.exports) {
    pkg.exports = {
      '.': { import: './esm-wrapper.mjs', default: './build/index.min.js' },
      './*': './*',
    };
    fs.writeFileSync(FREIGHTER_PKG_JSON, JSON.stringify(pkg, null, 2) + '\n');
  }
  console.log('[postinstall] ✓ Patched @stellar/freighter-api ESM exports');
} else {
  console.warn('[postinstall] ⚠ @stellar/freighter-api not found in node_modules — skipping');
}

console.log('[postinstall] ✔ Postinstall patches applied successfully');

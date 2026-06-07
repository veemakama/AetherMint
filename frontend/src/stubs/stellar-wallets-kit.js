/**
 * Stub for @creit.tech/stellar-wallets-kit
 *
 * The real package has a broken transitive dependency chain
 * (@stellar/freighter-api ESM/CJS interop issues, etc.), causing
 * it to crash at module-load time.  This stub provides a minimal
 * implementation for build/dev.
 *
 * NOTE: This file uses ESM syntax because the stub package.json
 * has "type": "module" (inherited from the original package).
 */

export var WalletNetwork = Object.freeze({
  PUBLIC: 'public',
  TESTNET: 'testnet',
});

export var WalletType = Object.freeze({
  FREIGHTER: 'freighter',
  ALBEDO: 'albedo',
  XBULL: 'xbull',
  WALLET_CONNECT: 'wallet_connect',
  RABET: 'rabet',
  LEDGER: 'ledger',
  TREZOR: 'trezor',
});

export var SUPPORTED_WALLETS = [
  { id: WalletType.FREIGHTER, name: 'Freighter', type: 'extension' },
  { id: WalletType.ALBEDO, name: 'Albedo', type: 'wallet' },
  { id: WalletType.XBULL, name: 'xBull', type: 'wallet' },
  { id: WalletType.RABET, name: 'Rabet', type: 'extension' },
];

export var MAINNET = WalletNetwork.PUBLIC;
export var TESTNET = WalletNetwork.TESTNET;

export class StellarWalletsKit {
  constructor(config) {
    this.config = config;
    this.currentWalletId = config.selectedWalletId;
  }

  async openModal(params) {
    var option = this.config.modules?.[0] || {
      id: this.currentWalletId,
      name: 'Wallet',
      type: 'wallet',
    };
    await params.onWalletSelected(option);
  }

  setWallet(walletId) {
    this.currentWalletId = walletId;
  }

  async getAddress() {
    return { address: 'G' + 'A'.repeat(55), walletType: WalletType.FREIGHTER };
  }

  getSelectedWalletId() {
    return this.currentWalletId;
  }

  async sign(params) {
    return { result: params.xdr };
  }

  setNetwork(network) {
    this.config.network = network;
  }

  getNetwork() {
    return this.config.network;
  }
}

export class WalletsKit {
  constructor(config) {
    this.network = config.network;
    this.selectedWalletId = config.selectedWalletId;
  }

  async connect() {
    return {
      publicKey: 'G' + 'A'.repeat(55),
      type: this.selectedWalletId,
    };
  }

  async disconnect() {}

  async getWallet() {
    return null;
  }

  async signTransaction(xdr) {
    return xdr;
  }

  setNetwork(network) {
    this.network = network;
  }
}

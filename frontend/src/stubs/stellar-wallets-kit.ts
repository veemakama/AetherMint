/**
 * Stub for @creit.tech/stellar-wallets-kit
 * 
 * The real package has a broken dependency chain (@stellar/freighter-api
 * doesn't export 'getAddress'), causing it to crash at module-load time.
 * This stub provides the types and a minimal implementation for build/dev.
 */

export enum WalletNetwork {
  PUBLIC = 'public',
  TESTNET = 'testnet',
}

export enum WalletType {
  FREIGHTER = 'freighter',
  ALBEDO = 'albedo',
  XBULL = 'xbull',
  WALLET_CONNECT = 'wallet_connect',
  RABET = 'rabet',
  LEDGER = 'ledger',
  TREZOR = 'trezor',
}

export const SUPPORTED_WALLETS = [
  { id: WalletType.FREIGHTER, name: 'Freighter', type: 'extension' },
  { id: WalletType.ALBEDO, name: 'Albedo', type: 'wallet' },
  { id: WalletType.XBULL, name: 'xBull', type: 'wallet' },
  { id: WalletType.RABET, name: 'Rabet', type: 'extension' },
];

export const MAINNET = WalletNetwork.PUBLIC;
export const TESTNET = WalletNetwork.TESTNET;

interface WalletOption {
  id: string;
  name: string;
  type: string;
}

interface WalletAddress {
  address: string;
  walletType: WalletType;
}

interface SignatureResult {
  result: string;
}

interface StellarWalletsKitConfig {
  network: WalletNetwork;
  selectedWalletId: string;
  modules?: WalletOption[];
}

export class StellarWalletsKit {
  private config: StellarWalletsKitConfig;
  private currentWalletId: string;

  constructor(config: StellarWalletsKitConfig) {
    this.config = config;
    this.currentWalletId = config.selectedWalletId;
  }

  async openModal(params: { onWalletSelected: (option: WalletOption) => Promise<WalletOption> }): Promise<void> {
    // Stub: simulate wallet selection
    const option = this.config.modules?.[0] || { id: this.currentWalletId, name: 'Wallet', type: 'wallet' };
    await params.onWalletSelected(option);
  }

  setWallet(walletId: string): void {
    this.currentWalletId = walletId;
  }

  async getAddress(): Promise<WalletAddress> {
    const mockPublicKey = 'G' + 'A'.repeat(55);
    return { address: mockPublicKey, walletType: WalletType.FREIGHTER };
  }

  getSelectedWalletId(): string {
    return this.currentWalletId;
  }

  async sign(params: { xdr: string; network: WalletNetwork }): Promise<SignatureResult> {
    return { result: params.xdr };
  }

  setNetwork(network: WalletNetwork): void {
    this.config.network = network;
  }

  getNetwork(): WalletNetwork {
    return this.config.network;
  }
}

export class WalletsKit {
  private network: WalletNetwork;
  private selectedWalletId: string;

  constructor(config: { network: WalletNetwork; selectedWalletId: string }) {
    this.network = config.network;
    this.selectedWalletId = config.selectedWalletId;
  }

  async connect(): Promise<{ publicKey: string; type?: string }> {
    const mockPublicKey = 'G' + 'A'.repeat(55);
    return { publicKey: mockPublicKey, type: this.selectedWalletId };
  }

  async disconnect(): Promise<void> {
    // Stub
  }

  async getWallet(): Promise<{ publicKey: string; type?: string } | null> {
    return null;
  }

  async signTransaction(xdr: string, _options?: { networkPassphrase?: string }): Promise<string> {
    return xdr;
  }

  setNetwork(network: WalletNetwork): void {
    this.network = network;
  }
}

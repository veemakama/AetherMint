export class AccountAbstractionService {
  constructor(_config?: any) {}
  async createAccount(..._args: any[]) { return {}; }
  async createSmartWallet(..._args: any[]) { return { address: '0x', owner: '' }; }
  async executeTransaction(..._args: any[]) { return { txHash: '0x' }; }
  async executeBatchTransactions(..._args: any[]) { return { txHashes: [] }; }
}

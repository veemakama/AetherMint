export class MultiSigService {
  constructor(_config?: any) {}
  async sign(..._args: any[]) { return {}; }
  async setupMultiSig(..._args: any[]) { return {}; }
  async proposeTransaction(..._args: any[]) { return { proposalId: '0' }; }
  async getPendingTransactions(..._args: any[]) { return []; }
}

export class SessionKeyService {
  constructor(_config?: any) {}
  async createSession(..._args: any[]) { return {}; }
  async createSessionKey(..._args: any[]) { return { keyId: '0' }; }
  async getActiveSessionKeys(..._args: any[]) { return []; }
}

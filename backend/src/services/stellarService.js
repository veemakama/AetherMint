const { Server, Networks, TransactionBuilder, Operation, Asset, Memo, MemoText } = require('@stellar/stellar-sdk');
const axios = require('axios');

class StellarService {
  constructor() {
    this.network = process.env.STELLAR_NETWORK === 'mainnet' 
      ? Networks.PUBLIC 
      : Networks.TESTNET;
    
    this.horizonUrl = process.env.STELLAR_NETWORK === 'mainnet'
      ? 'https://horizon.stellar.org'
      : 'https://horizon-testnet.stellar.org';
    
    this.server = new Server(this.horizonUrl);
    
    // Gas optimization configuration
    this.gasConfig = {
      baseFee: parseInt(process.env.STELLAR_BASE_FEE) || 100,
      maxFee: parseInt(process.env.STELLAR_MAX_FEE) || 1000,
      congestionThreshold: 0.8, // 80% network utilization
      priorityMultiplier: 1.5,
      batchDiscount: 0.9, // 10% discount for batch operations
    };

    // Network monitoring
    this.networkStats = {
      lastUpdate: null,
      feeStats: null,
      ledgerCount: 0,
      operationCount: 0,
      congestionLevel: 0,
    };
  }

  async getNetworkStatus() {
    try {
      const [feeStats, latestLedger] = await Promise.all([
        this.server.feeStats(),
        this.server.ledgers().order('desc').limit(1).call(),
      ]);

      this.networkStats = {
        lastUpdate: new Date(),
        feeStats: {
          min: feeStats.min_accepted_fee,
          max: feeStats.max_accepted_fee,
          mode: feeStats.fee_charged.mode,
          p10: feeStats.fee_charged.p10,
          p20: feeStats.fee_charged.p20,
          p50: feeStats.fee_charged.p50,
          p70: feeStats.fee_charged.p70,
          p80: feeStats.fee_charged.p80,
          p90: feeStats.fee_charged.p90,
          p95: feeStats.fee_charged.p95,
          p99: feeStats.fee_charged.p99,
        },
        ledgerCount: latestLedger.records[0]?.sequence || 0,
        operationCount: latestLedger.records[0]?.operation_count || 0,
        congestionLevel: this.calculateCongestionLevel(feeStats),
      };

      return this.networkStats;

    } catch (error) {
      console.error('Failed to get network status:', error);
      throw new Error('Unable to fetch Stellar network status');
    }
  }

  calculateCongestionLevel(feeStats) {
    // Calculate congestion based on fee distribution
    const { min, max, mode } = feeStats;
    
    if (min === 0 && max === 0) return 0;
    
    const feeRange = max - min;
    const modePosition = (mode - min) / feeRange;
    
    // Higher congestion when mode fee is closer to max fee
    return Math.min(modePosition * 2, 1); // Scale to 0-1 range
  }

  async optimizeGasFees({ type, payload, networkStatus = null }) {
    try {
      // Get current network status if not provided
      const status = networkStatus || await this.getNetworkStatus();
      
      let baseFee = this.gasConfig.baseFee;
      let optimization = {
        strategy: 'standard',
        estimatedFee: baseFee,
        savings: 0,
        confidence: 0.95,
      };

      // Adjust based on network congestion
      if (status.congestionLevel > this.gasConfig.congestionThreshold) {
        baseFee = Math.ceil(status.feeStats.p70 * this.gasConfig.priorityMultiplier);
        optimization.strategy = 'priority';
        optimization.confidence = 0.99;
      } else if (status.congestionLevel < 0.3) {
        baseFee = Math.ceil(status.feeStats.p50 * 0.8);
        optimization.strategy = 'economy';
        optimization.confidence = 0.85;
      }

      // Transaction-specific optimizations
      switch (type) {
        case 'credential_issuance':
          optimization = await this.optimizeCredentialIssuance(baseFee, payload, status);
          break;
        case 'course_payment':
          optimization = await this.optimizeCoursePayment(baseFee, payload, status);
          break;
        case 'smart_contract_interaction':
          optimization = await this.optimizeSmartContractInteraction(baseFee, payload, status);
          break;
        case 'profile_update':
          optimization = await this.optimizeProfileUpdate(baseFee, payload, status);
          break;
        default:
          optimization.estimatedFee = baseFee;
      }

      // Apply batch discount if applicable
      if (payload.batchSize && payload.batchSize > 1) {
        optimization.estimatedFee = Math.ceil(optimization.estimatedFee * this.gasConfig.batchDiscount);
        optimization.savings += Math.ceil(baseFee * (1 - this.gasConfig.batchDiscount));
        optimization.strategy += '_batch';
      }

      // Ensure fee doesn't exceed maximum
      optimization.estimatedFee = Math.min(optimization.estimatedFee, this.gasConfig.maxFee);

      return optimization;

    } catch (error) {
      console.error('Gas optimization failed:', error);
      // Fallback to standard fee
      return {
        strategy: 'fallback',
        estimatedFee: this.gasConfig.baseFee,
        savings: 0,
        confidence: 0.5,
      };
    }
  }

  async optimizeCredentialIssuance(baseFee, payload, networkStatus) {
    // Credential issuance is typically time-sensitive but not urgent
    const optimization = {
      strategy: 'standard',
      estimatedFee: baseFee,
      savings: 0,
      confidence: 0.90,
    };

    // Check if we can use memo to reduce operations
    if (payload.memoText) {
      optimization.estimatedFee = Math.ceil(baseFee * 0.95); // 5% savings with memo
      optimization.savings = Math.ceil(baseFee * 0.05);
      optimization.strategy = 'memo_optimized';
    }

    // Check for batch credential issuance
    if (payload.recipients && payload.recipients.length > 1) {
      const batchFee = baseFee * payload.recipients.length;
      const optimizedBatchFee = Math.ceil(batchFee * 0.85); // 15% batch discount
      optimization.estimatedFee = optimizedBatchFee;
      optimization.savings = batchFee - optimizedBatchFee;
      optimization.strategy = 'batch_issuance';
    }

    return optimization;
  }

  async optimizeCoursePayment(baseFee, payload, networkStatus) {
    // Course payments are time-sensitive
    const optimization = {
      strategy: 'priority',
      estimatedFee: Math.ceil(baseFee * 1.2), // 20% higher for priority
      savings: 0,
      confidence: 0.95,
    };

    // Check if payment can be combined with other operations
    if (payload.combineOperations) {
      optimization.estimatedFee = Math.ceil(baseFee * 1.1); // Only 10% increase
      optimization.savings = Math.ceil(baseFee * 0.1);
      optimization.strategy = 'combined_payment';
    }

    // Check for recurring payment optimization
    if (payload.isRecurring) {
      optimization.estimatedFee = Math.ceil(baseFee * 0.9); // 10% discount
      optimization.savings = Math.ceil(baseFee * 0.1);
      optimization.strategy = 'recurring_payment';
    }

    return optimization;
  }

  async optimizeSmartContractInteraction(baseFee, payload, networkStatus) {
    // Smart contract interactions depend on complexity
    const optimization = {
      strategy: 'standard',
      estimatedFee: baseFee,
      savings: 0,
      confidence: 0.85,
    };

    // Estimate operations based on contract method
    const operationCount = this.estimateContractOperations(payload.method, payload.args);
    optimization.estimatedFee = baseFee * operationCount;

    // Check if we can batch multiple contract calls
    if (payload.batchCalls && payload.batchCalls.length > 1) {
      const totalOps = payload.batchCalls.reduce((sum, call) => 
        sum + this.estimateContractOperations(call.method, call.args), 0);
      
      const batchFee = baseFee * totalOps;
      const optimizedBatchFee = Math.ceil(batchFee * 0.8); // 20% batch discount
      optimization.estimatedFee = optimizedBatchFee;
      optimization.savings = batchFee - optimizedBatchFee;
      optimization.strategy = 'batch_contract_calls';
    }

    return optimization;
  }

  async optimizeProfileUpdate(baseFee, payload, networkStatus) {
    // Profile updates are not time-sensitive
    const optimization = {
      strategy: 'economy',
      estimatedFee: Math.ceil(baseFee * 0.8), // 20% lower fee
      savings: Math.ceil(baseFee * 0.2),
      confidence: 0.85,
    };

    // Check if multiple fields can be updated in one transaction
    if (payload.updatedFields && Object.keys(payload.updatedFields).length > 1) {
      optimization.estimatedFee = Math.ceil(baseFee * 0.7); // 30% discount
      optimization.savings = Math.ceil(baseFee * 0.3);
      optimization.strategy = 'bulk_update';
    }

    return optimization;
  }

  estimateContractOperations(method, args) {
    // Rough estimation of operation count based on common patterns
    const operationMap = {
      'create_account': 2,
      'payment': 1,
      'set_options': 1,
      'manage_data': 1,
      'manage_offer': 2,
      'create_passive_offer': 2,
      'set_trust_line': 1,
      'allow_trust': 1,
      'account_merge': 1,
      'inflation': 1,
      'bump_sequence': 1,
    };

    return operationMap[method] || 1;
  }

  async submitTransaction({ type, payload, userId }) {
    try {
      // Get user's account
      const userAccount = await this.server.loadAccount(payload.sourceAccount);
      
      // Build transaction based on type
      let transaction;
      
      switch (type) {
        case 'credential_issuance':
          transaction = await this.buildCredentialIssuanceTransaction(userAccount, payload);
          break;
        case 'course_payment':
          transaction = await this.buildCoursePaymentTransaction(userAccount, payload);
          break;
        case 'smart_contract_interaction':
          transaction = await this.buildSmartContractTransaction(userAccount, payload);
          break;
        case 'profile_update':
          transaction = await this.buildProfileUpdateTransaction(userAccount, payload);
          break;
        default:
          throw new Error(`Unknown transaction type: ${type}`);
      }

      // Sign transaction
      if (payload.secretKey) {
        transaction.sign(payload.secretKey);
      } else if (payload.signatures) {
        payload.signatures.forEach(sig => transaction.addSignature(sig.publicKey, sig.signature));
      }

      // Submit to network
      const result = await this.server.submitTransaction(transaction);

      return {
        hash: result.hash,
        ledger: result.ledger,
        operations: result.operations?.length || 0,
        gasUsed: this.calculateGasUsed(result),
        fee: transaction.fee,
        successful: result.successful,
      };

    } catch (error) {
      console.error('Transaction submission failed:', error);
      
      // Parse Stellar error
      if (error.response && error.response.data) {
        const stellarError = error.response.data;
        throw new Error(`Stellar transaction failed: ${stellarError.title} - ${stellarError.detail}`);
      }
      
      throw error;
    }
  }

  async buildCredentialIssuanceTransaction(account, payload) {
    const builder = new TransactionBuilder(account, {
      fee: payload.gasOptimization.estimatedFee.toString(),
      networkPassphrase: this.network,
    });

    // Add memo for credential reference
    if (payload.memoText) {
      builder.addMemo(Memo.text(payload.memoText));
    }

    // Create payment operations for credential issuance
    if (payload.recipients) {
      if (Array.isArray(payload.recipients)) {
        // Batch credential issuance
        payload.recipients.forEach(recipient => {
          builder.addOperation(Operation.payment({
            destination: recipient.address,
            asset: Asset.native(),
            amount: recipient.amount || '0', // Credential issuance might be free
          }));
        });
      } else {
        // Single recipient
        builder.addOperation(Operation.payment({
          destination: payload.recipients.address,
          asset: Asset.native(),
          amount: payload.recipients.amount || '0',
        }));
      }
    }

    // Add manage data operation for credential metadata
    if (payload.credentialData) {
      Object.entries(payload.credentialData).forEach(([key, value]) => {
        builder.addOperation(Operation.manageData({
          name: `cred_${key}`,
          value: Buffer.from(JSON.stringify(value)).toString('base64'),
        }));
      });
    }

    return builder.setTimeout(180).build(); // 3 minute timeout
  }

  async buildCoursePaymentTransaction(account, payload) {
    const builder = new TransactionBuilder(account, {
      fee: payload.gasOptimization.estimatedFee.toString(),
      networkPassphrase: this.network,
    });

    // Add memo for payment reference
    if (payload.memoText) {
      builder.addMemo(Memo.text(payload.memoText));
    }

    // Payment operation
    builder.addOperation(Operation.payment({
      destination: payload.merchantAccount,
      asset: payload.asset || Asset.native(),
      amount: payload.amount,
    }));

    // Add course enrollment data
    if (payload.courseData) {
      builder.addOperation(Operation.manageData({
        name: 'course_enrollment',
        value: Buffer.from(JSON.stringify({
          courseId: payload.courseData.courseId,
          userId: payload.courseData.userId,
          timestamp: new Date().toISOString(),
        })).toString('base64'),
      }));
    }

    return builder.setTimeout(120).build(); // 2 minute timeout
  }

  async buildSmartContractTransaction(account, payload) {
    const builder = new TransactionBuilder(account, {
      fee: payload.gasOptimization.estimatedFee.toString(),
      networkPassphrase: this.network,
    });

    // Add memo for contract interaction
    if (payload.memoText) {
      builder.addMemo(Memo.text(payload.memoText));
    }

    // Handle different contract interaction types
    if (payload.contractType === 'soroban') {
      // Soroban smart contract interaction
      builder.addOperation(Operation.invokeContractFunction({
        contract: payload.contractId,
        function: payload.method,
        args: payload.args || [],
      }));
    } else {
      // Traditional Stellar contract (using manage_data for state)
      if (payload.method === 'set_data') {
        builder.addOperation(Operation.manageData({
          name: payload.dataKey,
          value: Buffer.from(JSON.stringify(payload.dataValue)).toString('base64'),
        }));
      } else if (payload.method === 'create_account') {
        builder.addOperation(Operation.createAccount({
          destination: payload.destination,
          startingBalance: payload.startingBalance,
        }));
      }
    }

    return builder.setTimeout(180).build();
  }

  async buildProfileUpdateTransaction(account, payload) {
    const builder = new TransactionBuilder(account, {
      fee: payload.gasOptimization.estimatedFee.toString(),
      networkPassphrase: this.network,
    });

    // Update profile data
    if (payload.updatedFields) {
      Object.entries(payload.updatedFields).forEach(([key, value]) => {
        const dataKey = `profile_${key}`;
        const dataValue = Buffer.from(JSON.stringify({
          value,
          timestamp: new Date().toISOString(),
          userId: payload.userId,
        })).toString('base64');

        builder.addOperation(Operation.manageData({
          name: dataKey,
          value: dataValue,
        }));
      });
    }

    // Update account options if needed
    if (payload.accountOptions) {
      builder.addOperation(Operation.setOptions(payload.accountOptions));
    }

    return builder.setTimeout(300).build(); // 5 minute timeout
  }

  calculateGasUsed(result) {
    // Estimate gas usage based on transaction result
    if (!result.operations) return 0;
    
    // Base gas per operation
    const baseGasPerOp = 1000;
    const additionalGas = result.operations.reduce((total, op) => {
      switch (op.type) {
        case 'payment':
          return total + 500;
        case 'manage_data':
          return total + (op.value ? op.value.length * 10 : 200);
        case 'set_options':
          return total + 300;
        case 'invoke_contract_function':
          return total + 2000; // Contract operations are more expensive
        default:
          return total + 200;
      }
    }, 0);

    return baseGasPerOp * result.operations.length + additionalGas;
  }

  async getGasOptimizationInfo() {
    try {
      const networkStatus = await this.getNetworkStatus();
      
      return {
        currentNetworkStats: networkStatus,
        optimizationStrategies: {
          economy: {
            description: 'Lowest fee, lower priority',
            confidence: 0.85,
            estimatedSavings: '20-30%',
          },
          standard: {
            description: 'Balanced fee and priority',
            confidence: 0.95,
            estimatedSavings: '5-15%',
          },
          priority: {
            description: 'Higher fee, faster processing',
            confidence: 0.99,
            estimatedSavings: '0-5%',
          },
        },
        recommendations: {
          currentCongestion: networkStatus.congestionLevel,
          suggestedStrategy: networkStatus.congestionLevel > 0.8 ? 'priority' : 
                           networkStatus.congestionLevel < 0.3 ? 'economy' : 'standard',
          batchDiscount: '10%',
          memoOptimization: '5%',
        },
      };

    } catch (error) {
      console.error('Failed to get gas optimization info:', error);
      throw error;
    }
  }

  async monitorTransaction(hash) {
    try {
      const transaction = await this.server.transactions()
        .transaction(hash)
        .call();

      return {
        hash: transaction.hash,
        ledger: transaction.ledger,
        createdAt: transaction.created_at,
        successful: transaction.successful,
        feePaid: transaction.fee_charged,
        operationCount: transaction.operation_count,
        memo: transaction.memo,
        signatures: transaction.signatures,
      };

    } catch (error) {
      console.error(`Failed to monitor transaction ${hash}:`, error);
      throw error;
    }
  }

  async getAccountTransactions(accountAddress, limit = 10) {
    try {
      const transactions = await this.server.transactions()
        .forAccount(accountAddress)
        .order('desc')
        .limit(limit)
        .call();

      return transactions.records.map(tx => ({
        hash: tx.hash,
        type: this.getTransactionType(tx),
        amount: this.getTransactionAmount(tx),
        timestamp: tx.created_at,
        successful: tx.successful,
        fee: tx.fee_charged,
        memo: tx.memo,
      }));

    } catch (error) {
      console.error('Failed to get account transactions:', error);
      throw error;
    }
  }

  getTransactionType(transaction) {
    if (!transaction.operations || transaction.operations.length === 0) {
      return 'unknown';
    }

    const firstOp = transaction.operations[0].type;
    
    // Map operation types to user-friendly names
    const typeMap = {
      'payment': 'payment',
      'create_account': 'account_creation',
      'manage_data': 'data_update',
      'set_options': 'options_update',
      'invoke_contract_function': 'contract_call',
    };

    return typeMap[firstOp] || 'other';
  }

  getTransactionAmount(transaction) {
    if (!transaction.operations || transaction.operations.length === 0) {
      return null;
    }

    const paymentOp = transaction.operations.find(op => op.type === 'payment');
    if (paymentOp) {
      return {
        amount: paymentOp.amount,
        asset: paymentOp.asset_code || 'XLM',
        destination: paymentOp.to,
      };
    }

    return null;
  }
}

module.exports = { StellarService };

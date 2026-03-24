const Redis = require('redis');
const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { StellarService } = require('./stellarService');
const { MonitoringService } = require('./monitoringService');

class TransactionQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.redis = Redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: options.redisDb || 1,
    });

    this.stellarService = new StellarService();
    this.monitoringService = new MonitoringService();
    
    // Queue configuration
    this.config = {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 5000, // 5 seconds
      batchProcessingSize: options.batchProcessingSize || 10,
      processingInterval: options.processingInterval || 1000, // 1 second
      priorityLevels: {
        critical: 1,
        high: 2,
        medium: 3,
        low: 4,
      },
      maxQueueSize: options.maxQueueSize || 10000,
      transactionTimeout: options.transactionTimeout || 300000, // 5 minutes
    };

    // Queue storage keys
    this.keys = {
      queue: 'tx:queue',
      processing: 'tx:processing',
      completed: 'tx:completed',
      failed: 'tx:failed',
      transaction: 'tx:transaction',
      dependencies: 'tx:dependencies',
      metrics: 'tx:metrics',
    };

    this.isProcessing = false;
    this.processingTimer = null;
    
    this.initialize();
  }

  async initialize() {
    try {
      await this.redis.connect();
      console.log('Transaction queue initialized');
      
      // Start processing loop
      this.startProcessing();
      
      // Set up event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Failed to initialize transaction queue:', error);
      throw error;
    }
  }

  setupEventListeners() {
    this.on('transaction_completed', (transaction) => {
      this.monitoringService.trackTransactionCompleted(transaction);
    });

    this.on('transaction_failed', (transaction) => {
      this.monitoringService.trackTransactionFailed(transaction);
    });

    this.on('queue_full', () => {
      this.monitoringService.trackQueueFull();
    });
  }

  async enqueue(transactionData) {
    try {
      // Check queue size
      const queueSize = await this.getQueueSize();
      if (queueSize >= this.config.maxQueueSize) {
        this.emit('queue_full');
        throw new Error('Transaction queue is full');
      }

      const transaction = {
        id: uuidv4(),
        ...transactionData,
        status: 'queued',
        submittedAt: new Date().toISOString(),
        retryCount: 0,
        maxRetries: this.config.maxRetries,
        priority: this.config.priorityLevels[transactionData.priority] || 3,
      };

      // Validate dependencies
      if (transaction.dependencies && transaction.dependencies.length > 0) {
        await this.validateDependencies(transaction.dependencies);
      }

      // Store transaction
      await this.redis.hSet(
        this.keys.transaction,
        transaction.id,
        JSON.stringify(transaction)
      );

      // Add to priority queue
      await this.redis.zAdd(
        this.keys.queue,
        {
          score: transaction.priority,
          value: transaction.id,
        }
      );

      // Store dependencies if any
      if (transaction.dependencies && transaction.dependencies.length > 0) {
        await this.redis.sAdd(
          `${this.keys.dependencies}:${transaction.id}`,
          ...transaction.dependencies
        );
      }

      // Update metrics
      await this.updateMetrics('queued', 1);

      console.log(`Transaction ${transaction.id} enqueued with priority ${transaction.priority}`);
      
      return transaction;

    } catch (error) {
      console.error('Failed to enqueue transaction:', error);
      throw error;
    }
  }

  async enqueueBulk(transactions, options = {}) {
    const results = {
      successful: [],
      failed: [],
      bulkId: uuidv4(),
    };

    // Process transactions in batches to avoid overwhelming the queue
    const batchSize = options.batchSize || 50;
    
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (tx, index) => {
        try {
          const transaction = await this.enqueue({
            ...tx,
            bulkId: results.bulkId,
            bulkIndex: i + index,
          });
          results.successful.push(transaction);
        } catch (error) {
          results.failed.push({ index: i + index, error: error.message });
        }
      });

      await Promise.allSettled(batchPromises);
    }

    return results;
  }

  async dequeue() {
    try {
      // Get highest priority transaction
      const result = await this.redis.zPopMin(this.keys.queue);
      
      if (!result || !result.value) {
        return null;
      }

      const transactionId = result.value;
      const transactionData = await this.redis.hGet(this.keys.transaction, transactionId);
      
      if (!transactionData) {
        console.warn(`Transaction ${transactionId} not found in storage`);
        return null;
      }

      const transaction = JSON.parse(transactionData);
      
      // Check if dependencies are satisfied
      if (transaction.dependencies && transaction.dependencies.length > 0) {
        const dependenciesSatisfied = await this.checkDependencies(transaction.dependencies);
        
        if (!dependenciesSatisfied) {
          // Re-queue with higher priority (lower score)
          await this.redis.zAdd(
            this.keys.queue,
            {
              score: transaction.priority - 0.1, // Slightly higher priority
              value: transactionId,
            }
          );
          return null;
        }
      }

      // Move to processing
      transaction.status = 'processing';
      transaction.processedAt = new Date().toISOString();
      
      await this.redis.hSet(
        this.keys.transaction,
        transactionId,
        JSON.stringify(transaction)
      );

      await this.redis.sAdd(this.keys.processing, transactionId);
      await this.updateMetrics('processing', 1);

      return transaction;

    } catch (error) {
      console.error('Failed to dequeue transaction:', error);
      return null;
    }
  }

  async processTransaction(transaction) {
    try {
      console.log(`Processing transaction ${transaction.id} of type ${transaction.type}`);

      let result;
      
      switch (transaction.type) {
        case 'credential_issuance':
          result = await this.processCredentialIssuance(transaction);
          break;
        case 'course_payment':
          result = await this.processCoursePayment(transaction);
          break;
        case 'smart_contract_interaction':
          result = await this.processSmartContractInteraction(transaction);
          break;
        case 'profile_update':
          result = await this.processProfileUpdate(transaction);
          break;
        default:
          throw new Error(`Unknown transaction type: ${transaction.type}`);
      }

      // Mark as completed
      await this.markTransactionCompleted(transaction.id, result);

    } catch (error) {
      console.error(`Transaction ${transaction.id} failed:`, error);
      await this.handleTransactionFailure(transaction.id, error);
    }
  }

  async processCredentialIssuance(transaction) {
    const { payload } = transaction;
    
    // Optimize gas fees
    const gasOptimization = await this.stellarService.optimizeGasFees({
      type: 'credential_issuance',
      payload,
    });

    // Submit Stellar transaction
    const stellarResult = await this.stellarService.submitTransaction({
      type: 'credential_issuance',
      payload: {
        ...payload,
        gasOptimization,
      },
      userId: transaction.userId,
    });

    return {
      stellarTransactionHash: stellarResult.hash,
      credentialId: payload.credentialId,
      recipient: payload.recipient,
      gasUsed: stellarResult.gasUsed,
      gasOptimization: gasOptimization.savings,
    };
  }

  async processCoursePayment(transaction) {
    const { payload } = transaction;
    
    // Get current network conditions
    const networkStatus = await this.stellarService.getNetworkStatus();
    
    // Optimize for current conditions
    const gasOptimization = await this.stellarService.optimizeGasFees({
      type: 'course_payment',
      payload,
      networkStatus,
    });

    const stellarResult = await this.stellarService.submitTransaction({
      type: 'course_payment',
      payload: {
        ...payload,
        gasOptimization,
      },
      userId: transaction.userId,
    });

    return {
      stellarTransactionHash: stellarResult.hash,
      courseId: payload.courseId,
      amount: payload.amount,
      paymentId: payload.paymentId,
      gasUsed: stellarResult.gasUsed,
      gasOptimization: gasOptimization.savings,
    };
  }

  async processSmartContractInteraction(transaction) {
    const { payload } = transaction;
    
    const stellarResult = await this.stellarService.submitTransaction({
      type: 'smart_contract_interaction',
      payload,
      userId: transaction.userId,
    });

    return {
      stellarTransactionHash: stellarResult.hash,
      contractId: payload.contractId,
      method: payload.method,
      result: stellarResult.result,
      gasUsed: stellarResult.gasUsed,
    };
  }

  async processProfileUpdate(transaction) {
    const { payload } = transaction;
    
    const stellarResult = await this.stellarService.submitTransaction({
      type: 'profile_update',
      payload,
      userId: transaction.userId,
    });

    return {
      stellarTransactionHash: stellarResult.hash,
      profileId: payload.profileId,
      updatedFields: payload.updatedFields,
      gasUsed: stellarResult.gasUsed,
    };
  }

  async markTransactionCompleted(transactionId, result) {
    try {
      const transactionData = await this.redis.hGet(this.keys.transaction, transactionId);
      const transaction = JSON.parse(transactionData);

      transaction.status = 'completed';
      transaction.completedAt = new Date().toISOString();
      transaction.result = result;

      // Update storage
      await this.redis.hSet(
        this.keys.transaction,
        transactionId,
        JSON.stringify(transaction)
      );

      // Move to completed set
      await this.redis.sAdd(this.keys.completed, transactionId);
      await this.redis.sRem(this.keys.processing, transactionId);

      // Update metrics
      await this.updateMetrics('completed', 1);
      await this.updateMetrics('processing', -1);

      // Clean up dependencies
      await this.cleanupDependencies(transactionId);

      this.emit('transaction_completed', transaction);

      console.log(`Transaction ${transactionId} completed successfully`);

    } catch (error) {
      console.error(`Failed to mark transaction ${transactionId} as completed:`, error);
      throw error;
    }
  }

  async handleTransactionFailure(transactionId, error) {
    try {
      const transactionData = await this.redis.hGet(this.keys.transaction, transactionId);
      const transaction = JSON.parse(transactionData);

      transaction.retryCount += 1;
      transaction.lastError = error.message;
      transaction.failedAt = new Date().toISOString();

      if (transaction.retryCount >= transaction.maxRetries) {
        // Mark as failed permanently
        transaction.status = 'failed';
        
        await this.redis.hSet(
          this.keys.transaction,
          transactionId,
          JSON.stringify(transaction)
        );

        await this.redis.sAdd(this.keys.failed, transactionId);
        await this.redis.sRem(this.keys.processing, transactionId);

        await this.updateMetrics('failed', 1);
        await this.updateMetrics('processing', -1);

        this.emit('transaction_failed', transaction);

        console.log(`Transaction ${transactionId} failed permanently after ${transaction.retryCount} retries`);

      } else {
        // Schedule retry
        transaction.status = 'retrying';
        
        await this.redis.hSet(
          this.keys.transaction,
          transactionId,
          JSON.stringify(transaction)
        );

        // Remove from processing and schedule for retry
        await this.redis.sRem(this.keys.processing, transactionId);
        
        setTimeout(async () => {
          await this.redis.zAdd(
            this.keys.queue,
            {
              score: transaction.priority, // Keep same priority for retry
              value: transactionId,
            }
          );
        }, this.config.retryDelay * transaction.retryCount);

        await this.updateMetrics('processing', -1);

        console.log(`Transaction ${transactionId} scheduled for retry ${transaction.retryCount}/${transaction.maxRetries}`);
      }

    } catch (err) {
      console.error(`Failed to handle transaction failure for ${transactionId}:`, err);
    }
  }

  async validateDependencies(dependencies) {
    for (const depId of dependencies) {
      const depData = await this.redis.hGet(this.keys.transaction, depId);
      if (!depData) {
        throw new Error(`Dependency transaction ${depId} not found`);
      }

      const dependency = JSON.parse(depData);
      if (dependency.status !== 'completed') {
        throw new Error(`Dependency transaction ${depId} is not completed`);
      }
    }
  }

  async checkDependencies(dependencies) {
    for (const depId of dependencies) {
      const depData = await this.redis.hGet(this.keys.transaction, depId);
      if (!depData) return false;

      const dependency = JSON.parse(depData);
      if (dependency.status !== 'completed') return false;
    }
    return true;
  }

  async cleanupDependencies(transactionId) {
    await this.redis.del(`${this.keys.dependencies}:${transactionId}`);
  }

  async startProcessing() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    
    const processBatch = async () => {
      try {
        const batch = [];
        
        // Process multiple transactions in parallel
        for (let i = 0; i < this.config.batchProcessingSize; i++) {
          const transaction = await this.dequeue();
          if (transaction) {
            batch.push(transaction);
          }
        }

        if (batch.length > 0) {
          const promises = batch.map(tx => this.processTransaction(tx));
          await Promise.allSettled(promises);
        }

      } catch (error) {
        console.error('Error in processing batch:', error);
      }

      // Schedule next batch
      this.processingTimer = setTimeout(processBatch, this.config.processingInterval);
    };

    processBatch();
  }

  async stopProcessing() {
    this.isProcessing = false;
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }
  }

  async getTransaction(transactionId) {
    try {
      const transactionData = await this.redis.hGet(this.keys.transaction, transactionId);
      if (!transactionData) return null;

      const transaction = JSON.parse(transactionData);
      
      // Add queue position if still queued
      if (transaction.status === 'queued') {
        const position = await this.redis.zRank(this.keys.queue, transactionId);
        transaction.queuePosition = position !== null ? position + 1 : null;
      }

      return transaction;

    } catch (error) {
      console.error(`Failed to get transaction ${transactionId}:`, error);
      return null;
    }
  }

  async getUserTransactions(userId, options = {}) {
    try {
      const { page = 1, limit = 20, status, type } = options;
      const offset = (page - 1) * limit;

      // Get all transaction IDs for user (this would need a user index in production)
      const allTxIds = await this.redis.hKeys(this.keys.transaction);
      
      let userTransactions = [];
      
      for (const txId of allTxIds) {
        const txData = await this.redis.hGet(this.keys.transaction, txId);
        if (txData) {
          const tx = JSON.parse(txData);
          if (tx.userId === userId) {
            if ((!status || tx.status === status) && (!type || tx.type === type)) {
              userTransactions.push(tx);
            }
          }
        }
      }

      // Sort by submitted date
      userTransactions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

      // Paginate
      const paginatedTransactions = userTransactions.slice(offset, offset + limit);

      return {
        transactions: paginatedTransactions,
        pagination: {
          page,
          limit,
          total: userTransactions.length,
          pages: Math.ceil(userTransactions.length / limit),
        },
      };

    } catch (error) {
      console.error('Failed to get user transactions:', error);
      throw error;
    }
  }

  async getQueueStats() {
    try {
      const [queued, processing, completed, failed] = await Promise.all([
        this.redis.zCard(this.keys.queue),
        this.redis.sCard(this.keys.processing),
        this.redis.sCard(this.keys.completed),
        this.redis.sCard(this.keys.failed),
      ]);

      return {
        queued,
        processing,
        completed,
        failed,
        total: queued + processing + completed + failed,
      };

    } catch (error) {
      console.error('Failed to get queue stats:', error);
      throw error;
    }
  }

  async getQueueSize() {
    return await this.redis.zCard(this.keys.queue);
  }

  async cancelTransaction(transactionId, userId) {
    try {
      const transaction = await this.getTransaction(transactionId);
      
      if (!transaction) return false;
      if (transaction.userId !== userId) return false;
      if (transaction.status !== 'queued') return false;

      // Remove from queue
      await this.redis.zRem(this.keys.queue, transactionId);
      
      // Update status
      transaction.status = 'cancelled';
      transaction.cancelledAt = new Date().toISOString();
      
      await this.redis.hSet(
        this.keys.transaction,
        transactionId,
        JSON.stringify(transaction)
      );

      await this.updateMetrics('cancelled', 1);

      return true;

    } catch (error) {
      console.error(`Failed to cancel transaction ${transactionId}:`, error);
      return false;
    }
  }

  async retryTransaction(transactionId, userId) {
    try {
      const transaction = await this.getTransaction(transactionId);
      
      if (!transaction) return null;
      if (transaction.userId !== userId) return null;
      if (transaction.status !== 'failed') return null;

      // Reset for retry
      transaction.status = 'queued';
      transaction.retryCount = 0;
      transaction.lastError = null;
      
      await this.redis.hSet(
        this.keys.transaction,
        transactionId,
        JSON.stringify(transaction)
      );

      // Add back to queue
      await this.redis.zAdd(
        this.keys.queue,
        {
          score: transaction.priority,
          value: transactionId,
        }
      );

      await this.updateMetrics('queued', 1);

      return transaction;

    } catch (error) {
      console.error(`Failed to retry transaction ${transactionId}:`, error);
      return null;
    }
  }

  async handleStellarWebhook(transactionHash, status, result) {
    try {
      // Find transaction by Stellar hash
      const allTxIds = await this.redis.hKeys(this.keys.transaction);
      
      for (const txId of allTxIds) {
        const txData = await this.redis.hGet(this.keys.transaction, txId);
        if (txData) {
          const tx = JSON.parse(txData);
          if (tx.result && tx.result.stellarTransactionHash === transactionHash) {
            if (status === 'success') {
              await this.markTransactionCompleted(txId, { ...tx.result, webhookResult: result });
            } else {
              await this.handleTransactionFailure(txId, new Error(result.error || 'Stellar transaction failed'));
            }
            break;
          }
        }
      }

    } catch (error) {
      console.error('Failed to handle Stellar webhook:', error);
    }
  }

  async updateMetrics(type, count) {
    try {
      const key = `${this.keys.metrics}:${type}`;
      await this.redis.incrBy(key, count);
      await this.redis.expire(key, 86400); // Keep metrics for 24 hours
    } catch (error) {
      console.error('Failed to update metrics:', error);
    }
  }

  async cleanup() {
    await this.stopProcessing();
    await this.redis.quit();
  }
}

module.exports = { TransactionQueue };

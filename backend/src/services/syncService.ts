/**

 * Data synchronization service
 * Device registration, real-time sync coordination, conflict resolution, and queue processing.
 * GIVEN device change, WHEN detected, THEN data syncs automatically.
 */

import logger from '../utils/logger';
import { Device, SyncStatus, type IDevice, type ISyncStatus, type SyncEntityType } from '../models/SyncStatus';
import { resolveConflict, getDefaultStrategy, type ConflictInput, type ConflictStrategy } from './conflictResolution';
import { getQueueManager, type QueuedItem } from './queueManager';

export interface RegisterDeviceInput {
  deviceId: string;
  userId: string;
  name?: string;
  type?: string;
  userAgent?: string;
}

export interface SyncEntityInput {
  userId: string;
  deviceId: string;
  entityType: SyncEntityType;
  entityId: string;
  version: number;
  updatedAt: Date;
  payload: Record<string, unknown>;
}

export interface SyncEntityResult {
  success: boolean;
  version: number;
  lastModifiedAt: Date;
  payload: Record<string, unknown>;
  conflictResolved?: boolean;
  strategy?: ConflictStrategy;
  message?: string;
}

export interface SyncStatusInfo {
  entityType: SyncEntityType;
  entityId: string;
  version: number;
  lastModifiedAt: Date;
  lastModifiedByDeviceId: string;
  payload?: Record<string, unknown>;
}

let websocketEmit: ((userId: string, event: string, data: unknown) => void) | null = null;

export function setSyncWebsocketEmitter(emit: (userId: string, event: string, data: unknown) => void): void {
  websocketEmit = emit;
}

function notifySyncEvent(userId: string, event: string, data: unknown): void {
  try {
    if (websocketEmit) websocketEmit(userId, event, data);
  } catch (e) {
    logger.debug('Sync websocket emit failed', e);
  }
}

// --- Device registration and management ---

export async function registerDevice(input: RegisterDeviceInput): Promise<IDevice> {
  const now = new Date();
  const device = await Device.findOneAndUpdate(
    { deviceId: input.deviceId },
    {
      $set: {
        userId: input.userId,
        name: input.name,
        type: input.type,
        userAgent: input.userAgent,
        status: 'online',
        lastSeenAt: now
      }
    },
    { new: true, upsert: true }
  );
  logger.info(`Device registered: ${input.deviceId} for user ${input.userId}`);
  await onDeviceOnline(input.userId, input.deviceId);
  return device as IDevice;
}

export async function unregisterDevice(deviceId: string): Promise<void> {
  await Device.findOneAndUpdate(
    { deviceId },
    { $set: { status: 'offline', lastSeenAt: new Date() } }
  );
  logger.info(`Device unregistered: ${deviceId}`);
}

export async function updateDeviceHeartbeat(deviceId: string): Promise<void> {
  await Device.findOneAndUpdate(
    { deviceId },
    { $set: { lastSeenAt: new Date() } }
  );
}

export async function getDevicesForUser(userId: string): Promise<IDevice[]> {
  const devices = await Device.find({ userId }).sort({ lastSeenAt: -1 }).lean();
  return devices as IDevice[];
}

export async function getDevice(deviceId: string): Promise<IDevice | null> {
  const doc = await Device.findOne({ deviceId }).lean();
  return doc as IDevice | null;
}

// --- Sync status tracking ---

export async function getSyncStatus(
  userId: string,
  entityType?: SyncEntityType,
  entityId?: string
): Promise<SyncStatusInfo[]> {
  const filter: Record<string, string> = { userId };
  if (entityType) filter.entityType = entityType;
  if (entityId) filter.entityId = entityId;

  const list = await SyncStatus.find(filter).lean();
  return list.map((s: any) => ({
    entityType: s.entityType,
    entityId: s.entityId,
    version: s.version,
    lastModifiedAt: s.lastModifiedAt,
    lastModifiedByDeviceId: s.lastModifiedByDeviceId,
    payload: s.metadata?.currentPayload as Record<string, unknown> | undefined
  }));
}

// --- Core sync: apply client state with conflict resolution ---

export async function syncEntity(
  input: SyncEntityInput,
  strategy?: ConflictStrategy
): Promise<SyncEntityResult> {
  const chosenStrategy = strategy ?? getDefaultStrategy(input.entityType);

  let current = await SyncStatus.findOne({
    userId: input.userId,
    entityType: input.entityType,
    entityId: input.entityId
  });

  const serverVersion = current?.version ?? 0;
  const serverUpdatedAt = (current?.lastModifiedAt as Date) ?? new Date(0);
  const serverPayload = (current?.metadata?.currentPayload as Record<string, unknown>) ?? {};

  const conflictInput: ConflictInput = {
    entityType: input.entityType,
    entityId: input.entityId,
    serverVersion,
    serverUpdatedAt,
    serverPayload,
    clientVersion: input.version,
    clientUpdatedAt: new Date(input.updatedAt),
    clientPayload: input.payload,
    deviceId: input.deviceId
  };

  const resolution = resolveConflict(conflictInput, chosenStrategy);

  const nextVersion = current ? current.version + 1 : 1;
  const now = new Date();
  const resolvedPayload = resolution.payload;

  if (!current) {
    current = await SyncStatus.create({
      userId: input.userId,
      entityType: input.entityType,
      entityId: input.entityId,
      version: nextVersion,
      lastModifiedAt: now,
      lastModifiedByDeviceId: input.deviceId,
      metadata: { currentPayload: resolvedPayload }
    });
  } else {
    current.version = nextVersion;
    current.lastModifiedAt = now;
    current.lastModifiedByDeviceId = input.deviceId;
    (current.metadata as any) = current.metadata || {};
    (current.metadata as any).currentPayload = resolvedPayload;
    await current.save();
  }

  await Device.findOneAndUpdate(
    { deviceId: input.deviceId },
    { $set: { lastSyncAt: now } }
  );

  notifySyncEvent(input.userId, 'sync-complete', {
    entityType: input.entityType,
    entityId: input.entityId,
    version: nextVersion,
    conflictResolved: resolution.conflictDetected,
    strategy: chosenStrategy
  });

  return {
    success: true,
    version: nextVersion,
    lastModifiedAt: now,
    payload: resolvedPayload,
    conflictResolved: resolution.conflictDetected,
    strategy: chosenStrategy,
    message: resolution.message
  };
}

// --- Offline queue: when online, process queue ---

async function processQueuedItem(item: QueuedItem): Promise<void> {
  await syncEntity({
    userId: item.userId,
    deviceId: item.deviceId,
    entityType: item.entityType,
    entityId: item.entityId,
    version: item.version,
    updatedAt: item.queuedAt,
    payload: (item.payload as Record<string, unknown>) ?? {}
  });
}

function setupQueueHandler(): void {
  const queue = getQueueManager();
  queue.setProcessHandler(processQueuedItem);
}

/** Called when a device comes online: process its queued offline changes. */
export async function onDeviceOnline(userId: string, deviceId: string): Promise<{ processed: number; failed: number }> {
  setupQueueHandler();
  const queue = getQueueManager();
  const result = await queue.processQueueForUser(userId);
  if (result.processed > 0) {
    notifySyncEvent(userId, 'queue-processed', { processed: result.processed, failed: result.failed });
  }
  return result;
}

/** Enqueue a sync operation (e.g. when client is offline or wants deferred sync). */
export function enqueueSync(item: Omit<QueuedItem, 'id' | 'queuedAt' | 'retryCount'>): string {
  setupQueueHandler();
  return getQueueManager().enqueue(item);
}

/** Process entire queue (e.g. global "we're online" event). */
export async function processSyncQueue(): Promise<{ processed: number; failed: number }> {
  setupQueueHandler();
  return getQueueManager().processQueue();
}
export async function processSyncQueueForUser(userId: string): Promise<{ processed: number; failed: number }> {
  setupQueueHandler();
  return getQueueManager().processQueueForUser(userId);
}

/** Queue status for status tracking. */
export function getQueueStatus(): { pendingCount: number; isProcessing: boolean } {
  const queue = getQueueManager();
  return { pendingCount: queue.getPendingCount(), isProcessing: queue.isProcessing() };
}

// Initialize queue handler on first use
setupQueueHandler();
=======
 * Data Synchronization Service
 * Handles device registration, sync coordination, and status tracking
 */

import { EventEmitter } from 'events';
import { 
  Device, 
  SyncStatus, 
  SyncSession, 
  SyncConfiguration,
  SyncEvent,
  SyncState,
  SyncMetrics,
  ConflictResolutionStrategy
} from '../models/SyncStatus';
import { ConflictResolutionService } from './conflictResolution';
import { QueueManager } from './queueManager';
import logger from '../utils/logger';

export class SyncService extends EventEmitter {
  private devices: Map<string, Device> = new Map();
  private syncStatuses: Map<string, SyncStatus> = new Map();
  private activeSessions: Map<string, SyncSession> = new Map();
  private configurations: Map<string, SyncConfiguration> = new Map();
  private metrics: SyncMetrics;
  private syncInterval: any = null;

  constructor(
    private conflictResolution: ConflictResolutionService,
    private queueManager: QueueManager
  ) {
    super();
    this.metrics = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageSyncTime: 0,
      totalDataTransferred: 0,
      conflictsResolved: 0,
      lastSyncTime: new Date(),
      devicesActive: 0
    };
  }

  /**
   * Register a new device for synchronization
   */
  async registerDevice(deviceData: Omit<Device, 'id' | 'registeredAt' | 'syncVersion'>): Promise<Device> {
    const device: Device = {
      ...deviceData,
      id: this.generateDeviceId(),
      registeredAt: new Date(),
      syncVersion: 1
    };

    this.devices.set(device.id, device);
    
    // Initialize sync status for the device
    const syncStatus: SyncStatus = {
      userId: device.userId,
      deviceId: device.id,
      state: SyncState.IDLE,
      lastSyncTime: new Date(),
      pendingItems: 0,
      failedItems: 0,
      conflicts: 0,
      syncVersion: 1,
      isOnline: device.isOnline
    };
    this.syncStatuses.set(device.id, syncStatus);

    // Set default configuration
    const config: SyncConfiguration = {
      autoSync: true,
      syncInterval: 5,
      maxRetries: 3,
      conflictResolution: ConflictResolutionStrategy.LAST_WRITE_WINS,
      syncOnWifiOnly: false,
      syncOnBatteryOnly: false,
      maxStorageUsage: 100,
      batchSize: 50,
      enableRealTimeSync: true
    };
    this.configurations.set(device.id, config);

    this.emitEvent('device_registered', device.userId, device);
    logger.info(`Device registered: ${device.id} for user: ${device.userId}`);
    
    return device;
  }

  /**
   * Start synchronization for a device
   */
  async startSync(deviceId: string): Promise<SyncSession> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    const syncStatus = this.syncStatuses.get(deviceId);
    if (!syncStatus) {
      throw new Error(`Sync status for device ${deviceId} not found`);
    }

    if (syncStatus.state === SyncState.SYNCING) {
      throw new Error(`Sync already in progress for device ${deviceId}`);
    }

    const session: SyncSession = {
      id: this.generateSessionId(),
      deviceId,
      userId: device.userId,
      startTime: new Date(),
      status: SyncState.SYNCING,
      itemsProcessed: 0,
      totalItems: await this.queueManager.getPendingCount(deviceId),
      conflicts: [],
      errors: []
    };

    this.activeSessions.set(session.id, session);
    syncStatus.state = SyncState.SYNCING;
    
    this.emitEvent('sync_started', device.userId, { sessionId: session.id, deviceId });
    logger.info(`Sync started for device: ${deviceId}, session: ${session.id}`);

    // Process sync in background
    this.processSync(session).catch((error: Error) => {
      logger.error(`Sync failed for device ${deviceId}:`, error);
      this.handleSyncError(session, error);
    });

    return session;
  }

  /**
   * Process synchronization session
   */
  private async processSync(session: SyncSession): Promise<void> {
    const startTime = Date.now();
    const deviceId = session.deviceId;
    const config = this.configurations.get(deviceId);

    try {
      // Get queued items
      const items = await this.queueManager.getQueuedItems(deviceId, config?.batchSize || 50);
      
      for (const item of items) {
        try {
          await this.processSyncItem(item, session);
          session.itemsProcessed++;
        } catch (error: any) {
          session.errors.push(`Failed to process item ${item.id}: ${error.message}`);
          logger.error(`Failed to process sync item ${item.id}:`, error);
        }
      }

      // Handle conflicts
      if (session.conflicts.length > 0) {
        await this.resolveConflicts(session);
      }

      // Complete session
      session.endTime = new Date();
      session.status = SyncState.COMPLETED;
      
      const syncTime = (Date.now() - startTime) / 1000;
      this.updateMetrics(session, syncTime, true);

      // Update sync status
      const syncStatus = this.syncStatuses.get(deviceId);
      if (syncStatus) {
        syncStatus.state = SyncState.COMPLETED;
        syncStatus.lastSyncTime = new Date();
        syncStatus.pendingItems = await this.queueManager.getPendingCount(deviceId);
        syncStatus.conflicts = session.conflicts.length;
      }

      this.emitEvent('sync_completed', session.userId, { sessionId: session.id, syncTime });
      logger.info(`Sync completed for device: ${deviceId}, session: ${session.id}`);

    } catch (error) {
      this.handleSyncError(session, error);
    } finally {
      this.activeSessions.delete(session.id);
    }
  }

  /**
   * Process individual sync item
   */
  private async processSyncItem(item: any, session: SyncSession): Promise<void> {
    // Check for conflicts
    const conflictResult = await this.conflictResolution.detectConflict(item);
    if (conflictResult.hasConflict && conflictResult.conflict) {
      session.conflicts.push(conflictResult.conflict);
      return;
    }

    // Apply the sync operation
    await this.queueManager.processItem(item);
  }

  /**
   * Resolve conflicts in a sync session
   */
  private async resolveConflicts(session: SyncSession): Promise<void> {
    const config = this.configurations.get(session.deviceId);
    
    for (const conflict of session.conflicts) {
      const resolution = await this.conflictResolution.resolveConflict(
        conflict, 
        config?.conflictResolution || ConflictResolutionStrategy.LAST_WRITE_WINS
      );
      
      if (resolution) {
        conflict.resolution = resolution.strategy;
        conflict.resolvedAt = new Date();
        conflict.resolvedBy = 'system';
        
        // Apply the resolution
        await this.conflictResolution.applyResolution(conflict, resolution);
        this.metrics.conflictsResolved++;
      }
    }
  }

  /**
   * Handle sync errors
   */
  private handleSyncError(session: SyncSession, error: any): void {
    session.endTime = new Date();
    session.status = SyncState.ERROR;
    session.errors.push(error.message || 'Unknown error');

    const syncTime = (Date.now() - session.startTime.getTime()) / 1000;
    this.updateMetrics(session, syncTime, false);

    const syncStatus = this.syncStatuses.get(session.deviceId);
    if (syncStatus) {
      syncStatus.state = SyncState.ERROR;
      syncStatus.failedItems++;
    }

    this.emitEvent('sync_failed', session.userId, { sessionId: session.id, error: error.message || 'Unknown error' });
    logger.error(`Sync failed for device: ${session.deviceId}, error: ${error.message || 'Unknown error'}`);
  }

  /**
   * Get sync status for a device
   */
  getSyncStatus(deviceId: string): SyncStatus | undefined {
    return this.syncStatuses.get(deviceId);
  }

  /**
   * Get active sync sessions
   */
  getActiveSessions(): SyncSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get registered devices for a user
   */
  getUserDevices(userId: string): Device[] {
    return Array.from(this.devices.values()).filter(device => device.userId === userId);
  }

  /**
   * Update device online status
   */
  updateDeviceStatus(deviceId: string, isOnline: boolean): void {
    const device = this.devices.get(deviceId);
    if (device) {
      device.isOnline = isOnline;
      device.lastActive = new Date();
      
      const syncStatus = this.syncStatuses.get(deviceId);
      if (syncStatus) {
        syncStatus.isOnline = isOnline;
      }

      // Trigger sync if device comes online and has pending items
      if (isOnline && syncStatus && syncStatus.pendingItems > 0) {
        this.startSync(deviceId).catch((error: Error) => {
          logger.error(`Failed to start sync for device ${deviceId}:`, error);
        });
      }
    }
  }

  /**
   * Configure sync settings for a device
   */
  configureSync(deviceId: string, config: Partial<SyncConfiguration>): void {
    const existingConfig = this.configurations.get(deviceId);
    if (existingConfig) {
      this.configurations.set(deviceId, { ...existingConfig, ...config });
    }
  }

  /**
   * Get sync metrics
   */
  getMetrics(): SyncMetrics {
    this.metrics.devicesActive = Array.from(this.devices.values()).filter(d => d.isOnline).length;
    return { ...this.metrics };
  }

  /**
   * Start automatic sync scheduler
   */
  startScheduler(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      const onlineDevices = Array.from(this.devices.values()).filter(device => {
        const config = this.configurations.get(device.id);
        return device.isOnline && config?.autoSync;
      });

      for (const device of onlineDevices) {
        const syncStatus = this.syncStatuses.get(device.id);
        if (syncStatus?.state === SyncState.IDLE && syncStatus.pendingItems > 0) {
          try {
            await this.startSync(device.id);
          } catch (error) {
            logger.error(`Failed to start scheduled sync for device ${device.id}:`, error);
          }
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Stop automatic sync scheduler
   */
  stopScheduler(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Update sync metrics
   */
  private updateMetrics(session: SyncSession, syncTime: number, success: boolean): void {
    this.metrics.totalSyncs++;
    this.metrics.lastSyncTime = new Date();
    
    if (success) {
      this.metrics.successfulSyncs++;
    } else {
      this.metrics.failedSyncs++;
    }

    // Update average sync time
    const totalTime = this.metrics.averageSyncTime * (this.metrics.totalSyncs - 1) + syncTime;
    this.metrics.averageSyncTime = totalTime / this.metrics.totalSyncs;

    // Update data transferred (estimated)
    this.metrics.totalDataTransferred += session.itemsProcessed * 1024; // 1KB per item estimate
  }

  /**
   * Emit sync events
   */
  private emitEvent(type: string, userId: string, data: any): void {
    const event: SyncEvent = {
      id: this.generateEventId(),
      type: type as any,
      deviceId: data.deviceId,
      userId,
      timestamp: new Date(),
      data
    };

    this.emit('syncEvent', event);
  }

  /**
   * Generate unique IDs
   */
  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}


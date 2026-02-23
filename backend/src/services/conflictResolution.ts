/**

 * Conflict resolution for sync
 * Handles divergent changes from multiple devices using configurable strategies
 */

import logger from '../utils/logger';

export type ConflictStrategy = 'last-write-wins' | 'first-write-wins' | 'server-wins' | 'client-wins' | 'merge';

export interface ConflictInput {
  entityType: string;
  entityId: string;
  serverVersion: number;
  serverUpdatedAt: Date;
  serverPayload: Record<string, unknown>;
  clientVersion: number;
  clientUpdatedAt: Date;
  clientPayload: Record<string, unknown>;
  deviceId: string;
}

export interface ConflictResult {
  resolved: boolean;
  payload: Record<string, unknown>;
  strategy: ConflictStrategy;
  conflictDetected: boolean;
  winningSource: 'server' | 'client' | 'merged';
  message?: string;
}

/**
 * Detect if there is a real conflict (same entity, different versions, both modified).
 */
export function hasConflict(input: ConflictInput): boolean {
  if (input.serverVersion === input.clientVersion) {
    return false;
  }
  // Conflict when client has different version than server (concurrent edits)
  return input.clientVersion !== input.serverVersion;
}

/**
 * Resolve conflict using the given strategy.
 * GIVEN conflict, WHEN detected, THEN resolution algorithm handles it.
 */
export function resolveConflict(input: ConflictInput, strategy: ConflictStrategy): ConflictResult {
  const conflictDetected = hasConflict(input);

  if (!conflictDetected) {
    return {
      resolved: true,
      payload: input.clientPayload,
      strategy,
      conflictDetected: false,
      winningSource: 'client',
      message: 'No conflict; accepting client state'
    };
  }

  switch (strategy) {
    case 'last-write-wins': {
      const serverTime = new Date(input.serverUpdatedAt).getTime();
      const clientTime = new Date(input.clientUpdatedAt).getTime();
      const useClient = clientTime >= serverTime;
      return {
        resolved: true,
        payload: useClient ? input.clientPayload : input.serverPayload,
        strategy: 'last-write-wins',
        conflictDetected: true,
        winningSource: useClient ? 'client' : 'server',
        message: useClient ? 'Client has newer timestamp' : 'Server has newer timestamp'
      };
    }

    case 'first-write-wins': {
      const serverTime = new Date(input.serverUpdatedAt).getTime();
      const clientTime = new Date(input.clientUpdatedAt).getTime();
      const useServer = serverTime <= clientTime;
      return {
        resolved: true,
        payload: useServer ? input.serverPayload : input.clientPayload,
        strategy: 'first-write-wins',
        conflictDetected: true,
        winningSource: useServer ? 'server' : 'client'
      };
    }

    case 'server-wins':
      return {
        resolved: true,
        payload: input.serverPayload,
        strategy: 'server-wins',
        conflictDetected: true,
        winningSource: 'server',
        message: 'Server state retained'
      };

    case 'client-wins':
      return {
        resolved: true,
        payload: input.clientPayload,
        strategy: 'client-wins',
        conflictDetected: true,
        winningSource: 'client',
        message: 'Client state accepted'
      };

    case 'merge': {
      const merged = mergePayloads(input.serverPayload, input.clientPayload);
      return {
        resolved: true,
        payload: merged,
        strategy: 'merge',
        conflictDetected: true,
        winningSource: 'merged',
        message: 'Merged server and client changes'
      };
    }

    default:
      logger.warn(`Unknown conflict strategy: ${strategy}, defaulting to last-write-wins`);
      return resolveConflict(input, 'last-write-wins');
  }
}

/**
 * Shallow merge: for each key, prefer the value from the payload with the later timestamp.
 * For nested objects we do one level: if both have same key as object, merge those recursively once.
 */
function mergePayloads(
  server: Record<string, unknown>,
  client: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...server };

  for (const key of Object.keys(client)) {
    const serverVal = server[key];
    const clientVal = client[key];

    if (serverVal === undefined && clientVal !== undefined) {
      result[key] = clientVal;
    } else if (serverVal !== undefined && clientVal === undefined) {
      result[key] = serverVal;
    } else if (
      serverVal !== null &&
      typeof serverVal === 'object' &&
      !Array.isArray(serverVal) &&
      clientVal !== null &&
      typeof clientVal === 'object' &&
      !Array.isArray(clientVal)
    ) {
      result[key] = mergePayloads(
        serverVal as Record<string, unknown>,
        clientVal as Record<string, unknown>
      );
    } else {
      result[key] = clientVal;
    }
  }

  return result;
}

/**
 * Get default strategy per entity type (can be overridden by config).
 */
export function getDefaultStrategy(entityType: string): ConflictStrategy {
  const strategyMap: Record<string, ConflictStrategy> = {
    progress: 'last-write-wins',
    preferences: 'merge',
    course_state: 'last-write-wins',
    notes: 'merge',
    generic: 'last-write-wins'
  };
  return strategyMap[entityType] ?? 'last-write-wins';
=======
 * Conflict Resolution Service
 * Handles detection and resolution of data synchronization conflicts
 */

import { 
  SyncConflict, 
  ConflictResolutionStrategy,
  SyncQueueItem 
} from '../models/SyncStatus';

export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  resolvedData: any;
  requiresUserInput: boolean;
  message?: string;
}

export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflict?: SyncConflict;
  resolution?: ConflictResolution;
}

export class ConflictResolutionService {
  private conflictHistory: Map<string, SyncConflict[]> = new Map();

  /**
   * Detect conflicts between local and remote data
   */
  async detectConflict(item: SyncQueueItem): Promise<ConflictDetectionResult> {
    try {
      // Get remote version of the data
      const remoteData = await this.getRemoteData(item.entityType, item.entityId);
      
      if (!remoteData) {
        // No remote data, no conflict for create operations
        if (item.operation === 'create') {
          return { hasConflict: false };
        }
        // Conflict for update/delete on non-existent remote data
        return this.createConflict(item, remoteData, 'delete_conflict');
      }

      // Compare timestamps and versions
      const localTimestamp = new Date(item.timestamp);
      const remoteTimestamp = new Date(remoteData.updatedAt || remoteData.createdAt);
      
      if (item.operation === 'delete') {
        if (remoteData.deletedAt) {
          return { hasConflict: false }; // Both deleted
        }
        return this.createConflict(item, remoteData, 'delete_conflict');
      }

      if (item.operation === 'update') {
        if (this.hasDataChanged(item.data, remoteData)) {
          if (localTimestamp > remoteTimestamp) {
            // Local is newer, but still check for concurrent modifications
            return this.createConflict(item, remoteData, 'concurrent_update');
          } else {
            // Remote is newer
            return this.createConflict(item, remoteData, 'version_conflict');
          }
        }
      }

      return { hasConflict: false };

    } catch (error) {
      console.error(`Error detecting conflict for item ${item.id}:`, error);
      return { hasConflict: false }; // Proceed on error to avoid blocking
    }
  }

  /**
   * Resolve a conflict using the specified strategy
   */
  async resolveConflict(
    conflict: SyncConflict, 
    strategy: ConflictResolutionStrategy
  ): Promise<ConflictResolution | null> {
    switch (strategy) {
      case ConflictResolutionStrategy.LAST_WRITE_WINS:
        return this.resolveLastWriteWins(conflict);
      
      case ConflictResolutionStrategy.FIRST_WRITE_WINS:
        return this.resolveFirstWriteWins(conflict);
      
      case ConflictResolutionStrategy.MANUAL:
        return this.resolveManual(conflict);
      
      case ConflictResolutionStrategy.MERGE:
        return this.resolveMerge(conflict);
      
      default:
        return null;
    }
  }

  /**
   * Apply conflict resolution
   */
  async applyResolution(conflict: SyncConflict, resolution: ConflictResolution): Promise<void> {
    try {
      // Apply the resolved data to the remote storage
      await this.applyResolvedData(conflict.entityType, conflict.entityId, resolution.resolvedData);
      
      // Store conflict resolution in history
      this.storeConflictResolution(conflict, resolution);
      
    } catch (error) {
      console.error(`Error applying conflict resolution for ${conflict.id}:`, error);
      throw error;
    }
  }

  /**
   * Get conflict history for an entity
   */
  getConflictHistory(entityType: string, entityId: string): SyncConflict[] {
    const key = `${entityType}:${entityId}`;
    return this.conflictHistory.get(key) || [];
  }

  /**
   * Resolve conflict using last-write-wins strategy
   */
  private resolveLastWriteWins(conflict: SyncConflict): ConflictResolution {
    const localTimestamp = new Date(conflict.timestamp);
    const remoteTimestamp = new Date(conflict.remoteData.updatedAt || conflict.remoteData.createdAt);
    
    const resolvedData = localTimestamp > remoteTimestamp ? conflict.localData : conflict.remoteData;
    const winner = localTimestamp > remoteTimestamp ? 'local' : 'remote';
    
    return {
      strategy: ConflictResolutionStrategy.LAST_WRITE_WINS,
      resolvedData,
      requiresUserInput: false,
      message: `Resolved using last-write-wins: ${winner} version selected`
    };
  }

  /**
   * Resolve conflict using first-write-wins strategy
   */
  private resolveFirstWriteWins(conflict: SyncConflict): ConflictResolution {
    const localTimestamp = new Date(conflict.timestamp);
    const remoteTimestamp = new Date(conflict.remoteData.updatedAt || conflict.remoteData.createdAt);
    
    const resolvedData = localTimestamp < remoteTimestamp ? conflict.localData : conflict.remoteData;
    const winner = localTimestamp < remoteTimestamp ? 'local' : 'remote';
    
    return {
      strategy: ConflictResolutionStrategy.FIRST_WRITE_WINS,
      resolvedData,
      requiresUserInput: false,
      message: `Resolved using first-write-wins: ${winner} version selected`
    };
  }

  /**
   * Resolve conflict requiring manual user input
   */
  private resolveManual(conflict: SyncConflict): ConflictResolution {
    return {
      strategy: ConflictResolutionStrategy.MANUAL,
      resolvedData: null, // Will be set by user
      requiresUserInput: true,
      message: 'Manual resolution required - user input needed'
    };
  }

  /**
   * Resolve conflict by merging data
   */
  private resolveMerge(conflict: SyncConflict): ConflictResolution {
    try {
      const mergedData = this.mergeData(conflict.localData, conflict.remoteData);
      
      return {
        strategy: ConflictResolutionStrategy.MERGE,
        resolvedData: mergedData,
        requiresUserInput: false,
        message: 'Resolved by merging local and remote data'
      };
    } catch (error) {
      // If merge fails, fall back to manual resolution
      return this.resolveManual(conflict);
    }
  }

  /**
   * Create a conflict object
   */
  private createConflict(
    item: SyncQueueItem, 
    remoteData: any, 
    conflictType: 'concurrent_update' | 'version_conflict' | 'delete_conflict'
  ): ConflictDetectionResult {
    const conflict: SyncConflict = {
      id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entityType: item.entityType,
      entityId: item.entityId,
      deviceId: item.deviceId,
      localData: item.data,
      remoteData,
      conflictType: item.operation === 'delete' ? 'delete' : 'update',
      timestamp: new Date()
    };

    return {
      hasConflict: true,
      conflict
    };
  }

  /**
   * Get remote data for comparison
   */
  private async getRemoteData(entityType: string, entityId: string): Promise<any> {
    // This would integrate with your data storage layer
    // For now, return null to simulate no remote data
    // In a real implementation, this would query your database or API
    return null;
  }

  /**
   * Check if data has changed
   */
  private hasDataChanged(localData: any, remoteData: any): boolean {
    // Simple comparison - in a real implementation, this would be more sophisticated
    return JSON.stringify(localData) !== JSON.stringify(remoteData);
  }

  /**
   * Merge two data objects
   */
  private mergeData(localData: any, remoteData: any): any {
    // Simple merge strategy - in a real implementation, this would be more sophisticated
    // and handle different data types and structures
    const merged = { ...remoteData };
    
    for (const key in localData) {
      if (localData.hasOwnProperty(key)) {
        if (typeof localData[key] === 'object' && typeof remoteData[key] === 'object') {
          merged[key] = this.mergeData(localData[key], remoteData[key]);
        } else {
          merged[key] = localData[key];
        }
      }
    }
    
    return merged;
  }

  /**
   * Apply resolved data to storage
   */
  private async applyResolvedData(entityType: string, entityId: string, data: any): Promise<void> {
    // This would integrate with your data storage layer
    // In a real implementation, this would update your database or API
    console.log(`Applying resolved data for ${entityType}:${entityId}`, data);
  }

  /**
   * Store conflict resolution in history
   */
  private storeConflictResolution(conflict: SyncConflict, resolution: ConflictResolution): void {
    const key = `${conflict.entityType}:${conflict.entityId}`;
    const history = this.conflictHistory.get(key) || [];
    
    // Add resolution info to conflict
    const resolvedConflict = {
      ...conflict,
      resolution: resolution.strategy,
      resolvedAt: new Date(),
      resolvedBy: 'system'
    };
    
    history.push(resolvedConflict);
    
    // Keep only last 10 conflicts per entity
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
    
    this.conflictHistory.set(key, history);
  }

}

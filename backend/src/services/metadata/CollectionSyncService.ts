/**
 * CollectionSyncService
 * Syncs metadata.json collections to database
 * Updates collection points based on supply tiers
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { MetadataParser, ParsedCollection, getMetadataParser } from './MetadataParser.js';

export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  total: number;
  errors: string[];
}

export class CollectionSyncService {
  private parser: MetadataParser;

  constructor(
    private prisma: PrismaClient,
    metadataPath?: string
  ) {
    this.parser = getMetadataParser(metadataPath);
  }

  /**
   * Sync all collections from metadata.json to database
   * Creates new collections, updates existing ones with new basePoints
   */
  async syncCollections(): Promise<SyncResult> {
    const result: SyncResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      total: 0,
      errors: []
    };

    try {
      const collections = this.parser.parseMetadata();
      result.total = collections.length;

      logger.info('Starting collection sync', {
        totalCollections: collections.length
      });

      for (const collection of collections) {
        try {
          await this.syncCollection(collection, result);
        } catch (err) {
          const msg = `Failed to sync ${collection.address}: ${err instanceof Error ? err.message : 'Unknown error'}`;
          result.errors.push(msg);
          logger.warn(msg);
        }
      }

      logger.info('Collection sync completed', {
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors.length
      });

      return result;
    } catch (error) {
      logger.error('Collection sync failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Sync a single collection
   */
  private async syncCollection(
    collection: ParsedCollection,
    result: SyncResult
  ): Promise<void> {
    const existing = await this.prisma.nFTCollection.findUnique({
      where: { address: collection.address }
    });

    const description = `${collection.brandName} - Supply: ${collection.supply}`;

    if (existing) {
      // Check if update needed
      const needsUpdate =
        existing.basePoints !== collection.basePoints ||
        existing.packTier !== collection.packTier ||
        existing.name !== collection.name;

      if (needsUpdate) {
        await this.prisma.nFTCollection.update({
          where: { address: collection.address },
          data: {
            name: collection.name,
            basePoints: collection.basePoints,
            packTier: collection.packTier,
            description
          }
        });

        logger.debug('Collection updated', {
          address: collection.address,
          name: collection.name,
          oldPoints: existing.basePoints,
          newPoints: collection.basePoints
        });

        result.updated++;
      } else {
        result.skipped++;
      }
    } else {
      // Create new collection
      await this.prisma.nFTCollection.create({
        data: {
          address: collection.address,
          name: collection.name,
          basePoints: collection.basePoints,
          packTier: collection.packTier,
          pointsMultiplier: 1.0,
          description
        }
      });

      logger.debug('Collection created', {
        address: collection.address,
        name: collection.name,
        basePoints: collection.basePoints,
        packTier: collection.packTier
      });

      result.created++;
    }
  }

  /**
   * Get all whitelisted addresses from metadata
   * Can be used to populate WHITELISTED_COLLECTIONS env var
   */
  getWhitelistAddresses(): string[] {
    return this.parser.getCollectionAddresses();
  }

  /**
   * Generate whitelist string for .env file
   */
  generateWhitelistEnvValue(): string {
    return this.parser.getCollectionAddresses().join(',');
  }

  /**
   * Recalculate points for a specific collection by address
   * Useful when supply changes
   */
  async updateCollectionFromMetadata(address: string): Promise<boolean> {
    const metadataCollection = this.parser.getCollectionByAddress(address);

    if (!metadataCollection) {
      logger.warn('Collection not found in metadata', { address });
      return false;
    }

    const existing = await this.prisma.nFTCollection.findUnique({
      where: { address }
    });

    if (!existing) {
      logger.warn('Collection not found in database', { address });
      return false;
    }

    await this.prisma.nFTCollection.update({
      where: { address },
      data: {
        basePoints: metadataCollection.basePoints,
        packTier: metadataCollection.packTier,
        name: metadataCollection.name,
        description: `${metadataCollection.brandName} - Supply: ${metadataCollection.supply}`
      }
    });

    logger.info('Collection updated from metadata', {
      address,
      name: metadataCollection.name,
      basePoints: metadataCollection.basePoints
    });

    return true;
  }

  /**
   * Get sync status - compare metadata with database
   */
  async getSyncStatus(): Promise<{
    inMetadata: number;
    inDatabase: number;
    missing: string[];
    extra: string[];
  }> {
    const metadataAddresses = new Set(this.parser.getCollectionAddresses());

    const dbCollections = await this.prisma.nFTCollection.findMany({
      select: { address: true }
    });
    const dbAddresses = new Set(dbCollections.map(c => c.address));

    // Collections in metadata but not in DB
    const missing: string[] = [];
    for (const addr of metadataAddresses) {
      if (!dbAddresses.has(addr)) {
        missing.push(addr);
      }
    }

    // Collections in DB but not in metadata
    const extra: string[] = [];
    for (const addr of dbAddresses) {
      if (!metadataAddresses.has(addr)) {
        extra.push(addr);
      }
    }

    return {
      inMetadata: metadataAddresses.size,
      inDatabase: dbAddresses.size,
      missing,
      extra
    };
  }

  /**
   * Get parser statistics
   */
  getMetadataStats() {
    return this.parser.getStats();
  }
}

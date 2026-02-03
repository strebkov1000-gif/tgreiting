/**
 * MetadataParser Service
 * Parses metadata.json with NFT collections and extracts:
 * - Collection addresses
 * - Supply numbers
 * - Names and brand info
 *
 * Handles the nested structure of the metadata file:
 * {
 *   "brandId": {
 *     "name": "Brand Name",
 *     "issuer": "Sticker Pack" | "Goodies",
 *     "packId": {
 *       "name": "Pack Name",
 *       "supply": 5000,
 *       "address": "EQ..."
 *     }
 *   }
 * }
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { Address } from '@ton/core';
import { logger } from '../../utils/logger.js';
import { supplyToMeters, getTierName } from '../../utils/supplyToMeters.js';

/**
 * Normalize TON address to raw format for consistent comparison
 * Handles EQ.../Ef.../UQ.../Uf.../0:... formats
 */
function normalizeAddress(address: string): string {
  try {
    const parsed = Address.parse(address);
    return parsed.toRawString().toLowerCase();
  } catch {
    // Fallback to lowercase comparison if parsing fails
    return address.toLowerCase();
  }
}

// Pack item structure from metadata.json
interface PackItem {
  name: string;
  supply: number;
  initial_supply?: number;
  address: string | null;
  preview_url?: string;
  release_time?: string;
  init_price?: number;
  init_price_ton?: number | null;
  init_price_usd?: number | null;
  issuer?: string;
}

// Brand structure from metadata.json
interface Brand {
  name: string;
  cover?: string;
  issuer?: string;
  [key: string]: PackItem | string | undefined; // Pack items have numeric or UUID keys
}

// Raw metadata structure
interface MetadataJson {
  [brandId: string]: Brand;
}

// Parsed collection output
export interface ParsedCollection {
  address: string;
  name: string;
  supply: number;
  basePoints: number;
  packTier: string;
  issuer: string;
  brandName: string;
  brandId: string;
  packId: string;
  previewUrl?: string;
}

export class MetadataParser {
  private metadataPath: string;
  private cachedCollections: ParsedCollection[] | null = null;
  private cacheTimestamp: number = 0;
  private cacheTtl: number = 60000; // 1 minute cache

  constructor(metadataPath?: string) {
    // Default path relative to backend root
    this.metadataPath = metadataPath || resolve(process.cwd(), 'data', 'metadata.json');
  }

  /**
   * Parse metadata.json and return all collections with calculated points
   * Uses caching to avoid repeated file reads
   */
  parseMetadata(): ParsedCollection[] {
    // Check cache
    const now = Date.now();
    if (this.cachedCollections && (now - this.cacheTimestamp) < this.cacheTtl) {
      return this.cachedCollections;
    }

    try {
      if (!existsSync(this.metadataPath)) {
        logger.warn(`Metadata file not found at: ${this.metadataPath}`);
        return [];
      }

      const raw = readFileSync(this.metadataPath, 'utf-8');
      const data: MetadataJson = JSON.parse(raw);

      const collections: ParsedCollection[] = [];

      // Iterate through brands
      for (const [brandId, brand] of Object.entries(data)) {
        if (!brand || typeof brand !== 'object') continue;

        const brandName = brand.name || `Brand ${brandId}`;
        const brandIssuer = brand.issuer || 'Unknown';

        // Iterate through packs within brand
        // Pack keys are numeric strings or UUIDs
        for (const [packId, pack] of Object.entries(brand)) {
          // Skip brand metadata fields
          if (['name', 'cover', 'issuer'].includes(packId)) continue;

          // Check if it's a pack object
          if (!pack || typeof pack !== 'object') continue;
          const packItem = pack as PackItem;

          // Skip items without address
          if (!packItem.address) {
            logger.debug(`Skipping pack without address: ${packItem.name}`, {
              brandId,
              packId
            });
            continue;
          }

          // Calculate points based on supply
          const supply = packItem.supply || 0;
          const basePoints = supplyToMeters(supply);
          const packTier = getTierName(supply);

          collections.push({
            address: packItem.address,
            name: packItem.name || `Pack ${packId}`,
            supply,
            basePoints,
            packTier,
            issuer: packItem.issuer || brandIssuer,
            brandName,
            brandId,
            packId,
            previewUrl: packItem.preview_url
          });
        }
      }

      // Update cache
      this.cachedCollections = collections;
      this.cacheTimestamp = now;

      logger.info(`Parsed ${collections.length} collections from metadata`, {
        path: this.metadataPath
      });

      return collections;
    } catch (error) {
      logger.error('Failed to parse metadata:', {
        path: this.metadataPath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Get all collection addresses (for whitelist)
   */
  getCollectionAddresses(): string[] {
    return this.parseMetadata()
      .map(c => c.address)
      .filter(Boolean);
  }

  /**
   * Get collection by address
   * Normalizes addresses to raw format for consistent matching
   */
  getCollectionByAddress(address: string): ParsedCollection | null {
    const normalizedInput = normalizeAddress(address);
    const collections = this.parseMetadata();

    return collections.find(c =>
      normalizeAddress(c.address) === normalizedInput
    ) || null;
  }

  /**
   * Get all collections for a specific brand
   */
  getCollectionsByBrand(brandId: string): ParsedCollection[] {
    return this.parseMetadata().filter(c => c.brandId === brandId);
  }

  /**
   * Get collections grouped by brand
   */
  getCollectionsGroupedByBrand(): Map<string, ParsedCollection[]> {
    const collections = this.parseMetadata();
    const grouped = new Map<string, ParsedCollection[]>();

    for (const collection of collections) {
      const brandKey = `${collection.brandId}_${collection.brandName}`;
      if (!grouped.has(brandKey)) {
        grouped.set(brandKey, []);
      }
      grouped.get(brandKey)!.push(collection);
    }

    return grouped;
  }

  /**
   * Get statistics about the metadata
   */
  getStats(): {
    totalCollections: number;
    totalBrands: number;
    byTier: Record<string, number>;
    byIssuer: Record<string, number>;
  } {
    const collections = this.parseMetadata();
    const brands = new Set(collections.map(c => c.brandId));

    const byTier: Record<string, number> = {};
    const byIssuer: Record<string, number> = {};

    for (const collection of collections) {
      byTier[collection.packTier] = (byTier[collection.packTier] || 0) + 1;
      byIssuer[collection.issuer] = (byIssuer[collection.issuer] || 0) + 1;
    }

    return {
      totalCollections: collections.length,
      totalBrands: brands.size,
      byTier,
      byIssuer
    };
  }

  /**
   * Clear the cache (useful for testing or after metadata update)
   */
  clearCache(): void {
    this.cachedCollections = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Set metadata path (useful for testing)
   */
  setMetadataPath(path: string): void {
    this.metadataPath = path;
    this.clearCache();
  }
}

// Singleton instance for shared use
let metadataParserInstance: MetadataParser | null = null;

export function getMetadataParser(metadataPath?: string): MetadataParser {
  if (!metadataParserInstance) {
    metadataParserInstance = new MetadataParser(metadataPath);
  }
  return metadataParserInstance;
}

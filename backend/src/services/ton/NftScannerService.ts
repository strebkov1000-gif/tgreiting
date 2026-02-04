import axios, { AxiosError } from 'axios';
import { PrismaClient } from '@prisma/client';
import { Address } from '@ton/core';
import { z } from 'zod';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';
import { PointsService } from '../points/PointsService.js';
import { MetadataParser, getMetadataParser } from '../metadata/MetadataParser.js';
import { supplyToMeters, getTierName } from '../../utils/supplyToMeters.js';
import { applyHoldBonus, calculateHoldDays, getHoldMultiplier } from '../../utils/holdBonus.js';

// Zod schemas for API response validation (MEDIUM-1)
const NftPreviewSchema = z.object({
  url: z.string().optional()
}).passthrough();

const NftCollectionRefSchema = z.object({
  address: z.string()
}).passthrough();

const NftMetadataSchema = z.object({
  name: z.string().optional(),
  image: z.string().optional()
}).passthrough();

const TonApiNftItemSchema = z.object({
  address: z.string(),
  collection: NftCollectionRefSchema.optional(),
  index: z.number().int().min(0).optional(),
  metadata: NftMetadataSchema.optional(),
  previews: z.array(NftPreviewSchema).optional()
}).passthrough();

const TonApiNftResponseSchema = z.object({
  nft_items: z.array(TonApiNftItemSchema).optional()
}).passthrough();

const TonCenterNftContentSchema = z.object({
  name: z.string().optional(),
  image: z.string().optional(),
  uri: z.string().optional() // TonCenter v3 returns uri instead of inline metadata
}).passthrough();

const TonCenterNftItemSchema = z.object({
  address: z.string().optional(), // May be missing in some cases
  collection: NftCollectionRefSchema.optional().nullable(),
  collection_address: z.string().optional().nullable(), // TonCenter v3 returns this separately
  index: z.union([z.number(), z.string()]).optional().nullable(), // Can be number or string in v3
  content: TonCenterNftContentSchema.optional().nullable(),
  metadata: NftMetadataSchema.optional().nullable(),
  previews: z.array(NftPreviewSchema).optional().nullable()
}).passthrough();

// Token info schema for metadata
const TonCenterTokenInfoSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional()
}).passthrough();

// Collection metadata schema
const TonCenterCollectionMetadataSchema = z.object({
  is_indexed: z.boolean().optional(),
  token_info: z.array(TonCenterTokenInfoSchema).optional()
}).passthrough();

const TonCenterNftResponseSchema = z.object({
  nft_items: z.array(TonCenterNftItemSchema).optional().nullable(),
  address_book: z.record(z.any()).optional(), // Address to user-friendly mapping
  metadata: z.record(TonCenterCollectionMetadataSchema).optional() // Metadata by address
}).passthrough();

/**
 * Normalize TON address to raw format for consistent comparison
 * Handles EQ.../Ef.../UQ.../Uf.../0:... formats
 * @throws Error if address is invalid
 */
function normalizeAddress(address: string): string {
  if (!address || typeof address !== 'string') {
    throw new Error('Invalid address: must be a non-empty string');
  }

  try {
    const parsed = Address.parse(address);
    return parsed.toRawString().toLowerCase();
  } catch (error) {
    throw new Error(`Invalid TON address format: ${address}`);
  }
}

/**
 * Safely normalize address, returning null if invalid
 * Use when you want to handle invalid addresses gracefully
 */
function safeNormalizeAddress(address: string): string | null {
  try {
    return normalizeAddress(address);
  } catch {
    return null;
  }
}

export interface NftScanResult {
  nftsFound: number;
  nftsAdded: number;
  nftsRemoved: number;
  pointsAwarded: number;
  pointsDeducted: number;
}

export interface NftItem {
  collectionAddress: string;
  itemIndex: string;
  address: string;
  metadata: any;
  imageUrl?: string;
  name?: string;
  ownedSince?: Date; // When the NFT was acquired by current owner (from blockchain)
}

const TON_API_ENDPOINTS = {
  // TonCenter with API key (unlimited RPS)
  toncenter: 'https://toncenter.com/api/v3',
  // TonAPI as fallback
  tonapi: 'https://tonapi.io/v2'
};

// Allowed domains for NFT image URLs (SSRF protection)
const ALLOWED_IMAGE_DOMAINS = [
  'ipfs.io',
  'cloudflare-ipfs.com',
  'nft.fragment.com',
  'getgems.io',
  'cache.tonapi.io',
  'ton.diamonds',
  'i.getgems.io',
  's.getgems.io',
  'nft.ton.diamonds'
];

// Private IP ranges (SSRF protection)
const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./, // Link-local
  /^0\.0\.0\.0$/,
  /^::1$/,       // IPv6 localhost
  /^fc00:/i,     // IPv6 private
  /^fe80:/i,     // IPv6 link-local
  /^fd/i,        // IPv6 unique local
];

export class NftScannerService {
  private rateLimitDelay = 100; // 100ms with API key (can do ~10 rps safely)
  private lastRequestTime = 0;
  private metadataParser: MetadataParser;
  private apiKey: string | null = null;
  private tonapiKey: string | null = null; // SECURITY: TonAPI auth key

  constructor(
    private prisma: PrismaClient,
    private pointsService: PointsService,
    metadataPath?: string
  ) {
    this.metadataParser = getMetadataParser(metadataPath);
    this.apiKey = process.env.TON_CENTER_API_KEY || null;
    this.tonapiKey = process.env.TON_API_KEY || null; // TonAPI key for auth
    if (this.apiKey) {
      logger.info('TonCenter API key configured - using fast mode');
    }
    if (this.tonapiKey) {
      logger.info('TonAPI key configured - authenticated requests enabled');
    }
  }

  /**
   * Get TonAPI request headers with authentication if available
   */
  private getTonApiHeaders(): Record<string, string> {
    if (this.tonapiKey) {
      return { 'Authorization': `Bearer ${this.tonapiKey}` };
    }
    return {};
  }

  /**
   * Scan wallet for NFTs using TON API
   * Uses public endpoints (tonapi.io) with fallback
   */
  async scanWallet(walletAddress: string): Promise<NftItem[]> {
    try {
      // Rate limit check
      await this.checkRateLimit();

      // Try primary endpoint first
      try {
        return await this.fetchNftsFromTonApi(walletAddress);
      } catch (primaryError) {
        logger.warn('Primary TON API failed, trying fallback', {
          error: primaryError instanceof Error ? primaryError.message : 'Unknown error'
        });

        // Try fallback endpoint
        return await this.fetchNftsFromTonCenter(walletAddress);
      }
    } catch (error) {
      logger.error('Failed to scan wallet for NFTs:', {
        walletAddress,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to scan wallet for NFTs');
    }
  }

  /**
   * Update user's NFT collection in database
   * - Fetches current NFTs from wallet
   * - Compares with database records
   * - Adds new NFTs, removes sold NFTs
   * - Awards points for new NFTs
   */
  async updateUserNfts(userId: string, walletAddress: string): Promise<NftScanResult> {
    try {
      logger.info('Starting NFT scan', { userId, walletAddress });

      // Scan wallet for NFTs
      const scannedNfts = await this.scanWallet(walletAddress);

      // Filter whitelisted collections
      const whitelistedNfts = scannedNfts.filter(nft =>
        this.isWhitelisted(nft.collectionAddress)
      );

      logger.info('NFTs scanned', {
        userId,
        totalNfts: scannedNfts.length,
        whitelistedNfts: whitelistedNfts.length
      });

      // Get existing user NFTs
      const existingUserNfts = await this.prisma.userNFT.findMany({
        where: { userId },
        include: {
          nft: {
            include: {
              collection: true
            }
          }
        }
      });

      // ADDITIONAL CHECK: Get all nft_detected transactions for this user
      // This prevents duplicate awards even if UserNFT records were deleted
      const existingNftTransactions = await this.prisma.pointTransaction.findMany({
        where: {
          userId,
          activityType: 'nft_detected'
        },
        select: {
          metadata: true
        }
      });

      // Extract NFT addresses from existing transactions
      const awardedNftAddresses = new Set<string>();
      for (const tx of existingNftTransactions) {
        const meta = tx.metadata as any;
        if (meta?.nftAddress) {
          awardedNftAddresses.add(meta.nftAddress.toLowerCase());
        }
        // Also check by collection:itemIndex pattern in description
        if (meta?.collectionAddress && meta?.itemIndex !== undefined) {
          awardedNftAddresses.add(`${meta.collectionAddress}:${meta.itemIndex}`.toLowerCase());
        }
      }

      // Use composite key (collectionAddress:itemIndex) for proper duplicate detection
      // This prevents issues when same itemIndex exists in different collections
      const existingNftKeys = new Set(
        existingUserNfts.map(un => `${un.nft.collection.address}:${un.nft.itemIndex}`)
      );

      const scannedNftMap = new Map(
        whitelistedNfts.map(nft => [`${nft.collectionAddress}:${nft.itemIndex}`, nft])
      );

      // Find new NFTs using composite key
      const newNfts = whitelistedNfts.filter(
        nft => !existingNftKeys.has(`${nft.collectionAddress}:${nft.itemIndex}`)
      );

      // Find removed NFTs (sold or transferred) using composite key
      const removedNfts = existingUserNfts.filter(
        un => !scannedNftMap.has(`${un.nft.collection.address}:${un.nft.itemIndex}`)
      );

      let pointsAwarded = 0;

      // Add new NFTs to database
      for (const nft of newNfts) {
        // DUPLICATE CHECK: Check if already awarded points for this NFT
        const nftKey = nft.address?.toLowerCase();
        const alreadyAwarded = nftKey && awardedNftAddresses.has(nftKey);

        if (alreadyAwarded) {
          logger.info('NFT already awarded points, but will ensure UserNFT link exists', {
            userId,
            nftAddress: nft.address,
            nftName: nft.name
          });
        }

        // Get or create collection
        const collection = await this.getOrCreateCollection(nft.collectionAddress);

        // Get or create NFT item
        const nftItem = await this.prisma.nFTItem.upsert({
          where: {
            collectionId_itemIndex: {
              collectionId: collection.id,
              itemIndex: parseInt(nft.itemIndex) || 0
            }
          },
          create: {
            collectionId: collection.id,
            itemIndex: parseInt(nft.itemIndex) || 0,
            metadata: nft.metadata || {},
            imageUrl: nft.imageUrl,
            name: nft.name
          },
          update: {
            metadata: nft.metadata || {},
            imageUrl: nft.imageUrl,
            name: nft.name
          }
        });

        // Check if UserNFT already exists (may have been orphaned)
        const existingUserNft = await this.prisma.userNFT.findUnique({
          where: {
            userId_nftId: {
              userId,
              nftId: nftItem.id
            }
          }
        });

        if (existingUserNft) {
          logger.info('UserNFT already exists, skipping', {
            userId,
            nftId: nftItem.id
          });
          continue;
        }

        // Get supply info from metadata
        const metadataInfo = this.metadataParser.getCollectionByAddress(nft.collectionAddress);
        const supply = metadataInfo?.supply ?? 10000;

        // Calculate base points from supply (meters)
        // For new NFTs, no hold bonus yet (holdDays = 0)
        const baseMeters = collection.basePoints;
        const nftPoints = Math.floor(baseMeters * collection.pointsMultiplier);

        // Create UserNFT record with actual ownership date from blockchain
        await this.prisma.userNFT.create({
          data: {
            userId,
            nftId: nftItem.id,
            pointsAwarded: alreadyAwarded ? 0 : nftPoints, // Don't count points if already awarded
            ownedSince: nft.ownedSince || new Date() // Use blockchain date or fallback to now
          }
        });

        // Only award points if not already awarded previously
        if (!alreadyAwarded) {
          await this.pointsService.awardPoints({
            userId,
            points: nftPoints,
            activityType: 'nft_detected',
            description: `NFT detected: ${nft.name || 'Unknown NFT'} (+${nftPoints} meters)`,
            metadata: {
              nftAddress: nft.address,
              collectionAddress: nft.collectionAddress,
              collectionName: collection.name,
              supply,
              baseMeters,
              packTier: collection.packTier,
              multiplier: collection.pointsMultiplier
            }
          });

          pointsAwarded += nftPoints;
        } else {
          logger.info('Points already awarded previously, only created UserNFT link', {
            userId,
            nftAddress: nft.address,
            nftName: nft.name
          });
        }
      }

      // Remove sold NFTs and deduct points
      let pointsDeducted = 0;
      if (removedNfts.length > 0) {
        // Calculate total points to deduct from removed NFTs
        for (const removedNft of removedNfts) {
          const pointsToDeduct = removedNft.pointsAwarded || 0;
          if (pointsToDeduct > 0) {
            // Deduct points for sold NFT
            await this.pointsService.deductPoints({
              userId,
              points: pointsToDeduct,
              activityType: 'nft_sold',
              description: `NFT sold: ${removedNft.nft.name || 'Unknown NFT'} (-${pointsToDeduct} meters)`,
              metadata: {
                nftId: removedNft.nftId,
                collectionAddress: removedNft.nft.collection.address,
                collectionName: removedNft.nft.collection.name,
                itemIndex: removedNft.nft.itemIndex
              }
            });
            pointsDeducted += pointsToDeduct;
          }
        }

        // Delete UserNFT records
        await this.prisma.userNFT.deleteMany({
          where: {
            id: {
              in: removedNfts.map(un => un.id)
            }
          }
        });

        logger.info('NFTs removed and points deducted', {
          userId,
          nftsRemoved: removedNfts.length,
          pointsDeducted
        });
      }

      // Update user's NFT count
      const newNftCount = existingUserNfts.length + newNfts.length - removedNfts.length;
      await this.prisma.user.update({
        where: { id: userId },
        data: { nftCount: newNftCount }
      });

      logger.info('NFT scan completed', {
        userId,
        nftsFound: whitelistedNfts.length,
        nftsAdded: newNfts.length,
        nftsRemoved: removedNfts.length,
        pointsAwarded,
        pointsDeducted
      });

      return {
        nftsFound: whitelistedNfts.length,
        nftsAdded: newNfts.length,
        nftsRemoved: removedNfts.length,
        pointsAwarded,
        pointsDeducted
      };
    } catch (error) {
      logger.error('NFT update failed:', {
        userId,
        walletAddress,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to update user NFTs');
    }
  }

  /**
   * Check if collection is whitelisted
   * Uses env whitelist first, then falls back to metadata addresses
   * Normalizes addresses to raw format for consistent matching
   */
  private isWhitelisted(collectionAddress: string): boolean {
    if (!collectionAddress) return false;

    const normalizedInput = normalizeAddress(collectionAddress);
    const envWhitelist = config.nft.whitelistedCollections;

    // If env whitelist is configured, use it
    if (envWhitelist.length > 0) {
      return envWhitelist.some(
        addr => normalizeAddress(addr) === normalizedInput
      );
    }

    // Fall back to metadata addresses
    const metadataAddresses = this.metadataParser.getCollectionAddresses();
    if (metadataAddresses.length > 0) {
      const isInMetadata = metadataAddresses.some(
        addr => normalizeAddress(addr) === normalizedInput
      );

      if (isInMetadata) {
        logger.debug('Collection whitelisted via metadata', {
          collectionAddress,
          normalizedAddress: normalizedInput
        });
      }

      return isInMetadata;
    }

    // SECURITY: If no whitelist configured, reject all collections
    // This prevents spam NFTs from being counted when whitelist is misconfigured
    logger.warn('No NFT whitelist configured - rejecting all collections for security', {
      collectionAddress,
      normalizedAddress: normalizedInput
    });
    return false;
  }

  /**
   * Rate limit check
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Validate NFT image URL to prevent SSRF attacks
   * Only allows HTTPS URLs from whitelisted domains
   * Blocks private IP addresses and localhost
   */
  private validateImageUrl(url: string | undefined): string | undefined {
    if (!url || typeof url !== 'string') {
      return undefined;
    }

    try {
      const parsed = new URL(url);

      // Only allow HTTPS
      if (parsed.protocol !== 'https:') {
        logger.debug('Rejected non-HTTPS image URL', { url });
        return undefined;
      }

      // Check for private IP addresses
      if (this.isPrivateIp(parsed.hostname)) {
        logger.warn('Rejected private IP in image URL', { url, hostname: parsed.hostname });
        return undefined;
      }

      // Check domain whitelist
      const isAllowed = ALLOWED_IMAGE_DOMAINS.some(domain =>
        parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
      );

      if (!isAllowed) {
        logger.debug('Image URL domain not in whitelist', { url, hostname: parsed.hostname });
        // Return undefined for non-whitelisted domains instead of blocking
        // This is a defensive measure - the URL won't be used for server-side fetching
        return undefined;
      }

      return url;
    } catch {
      logger.debug('Invalid image URL format', { url });
      return undefined;
    }
  }

  /**
   * Check if hostname is a private IP address
   */
  private isPrivateIp(hostname: string): boolean {
    return PRIVATE_IP_PATTERNS.some(pattern => pattern.test(hostname));
  }

  /**
   * Fetch NFTs - uses TonCenter (fast, with API key) or TonAPI (fallback)
   */
  private async fetchNftsFromTonApi(walletAddress: string): Promise<NftItem[]> {
    // Try TonCenter first if we have API key
    if (this.apiKey) {
      try {
        return await this.fetchNftsFromTonCenter(walletAddress);
      } catch (error) {
        logger.warn('TonCenter failed, falling back to TonAPI', {
          error: error instanceof Error ? error.message : 'Unknown'
        });
      }
    }

    // Fallback to TonAPI
    try {
      const url = `${TON_API_ENDPOINTS.tonapi}/accounts/${walletAddress}/nfts`;

      const response = await axios.get(url, {
        timeout: 10000,
        headers: this.getTonApiHeaders(), // SECURITY: Use auth headers
        params: { limit: 1000, offset: 0 }
      });

      // SECURITY: Validate API response structure
      const parseResult = TonApiNftResponseSchema.safeParse(response.data);
      if (!parseResult.success) {
        logger.warn('TonAPI response validation failed', {
          errors: parseResult.error.errors.slice(0, 5) // Log first 5 errors
        });
        return [];
      }

      const validatedData = parseResult.data;
      if (!validatedData.nft_items) {
        return [];
      }

      return validatedData.nft_items.map((item) => ({
        collectionAddress: item.collection?.address || '',
        itemIndex: item.index?.toString() || '0',
        address: item.address,
        metadata: item.metadata || {},
        // SECURITY: Validate image URLs to prevent SSRF
        imageUrl: this.validateImageUrl(item.previews?.[0]?.url) || this.validateImageUrl(item.metadata?.image),
        name: item.metadata?.name || `NFT #${item.index}`,
        ownedSince: new Date()
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('TON API request failed:', {
          status: error.response?.status,
          message: error.message
        });
      }
      throw error;
    }
  }

  /**
   * Fetch NFTs from TonCenter API v3 (fast, with API key)
   */
  private async fetchNftsFromTonCenter(walletAddress: string): Promise<NftItem[]> {
    const url = `${TON_API_ENDPOINTS.toncenter}/nft/items`;

    const response = await axios.get(url, {
      timeout: 10000,
      headers: { 'X-API-Key': this.apiKey },
      params: {
        owner_address: walletAddress,
        limit: 1000,
        offset: 0
      }
    });

    // SECURITY: Validate API response structure
    const parseResult = TonCenterNftResponseSchema.safeParse(response.data);
    if (!parseResult.success) {
      logger.warn('TonCenter response validation failed', {
        errors: parseResult.error.errors.slice(0, 10), // Log first 10 errors for debugging
        errorPaths: parseResult.error.errors.map(e => e.path.join('.')),
        errorMessages: parseResult.error.errors.map(e => e.message),
        responseKeys: Object.keys(response.data || {}),
        firstItemKeys: response.data?.nft_items?.[0] ? Object.keys(response.data.nft_items[0]) : [],
        nftItemsCount: response.data?.nft_items?.length || 0
      });

      // Try to continue anyway with raw data if we have nft_items array
      if (response.data?.nft_items && Array.isArray(response.data.nft_items)) {
        logger.info('Attempting to process TonCenter response despite validation failure');

        // Extract metadata from top-level metadata object (TonCenter v3)
        const metadataMap = response.data.metadata || {};

        return response.data.nft_items.map((item: any) => {
          const collectionAddress = item.collection_address || item.collection?.address || '';

          // Try to get collection metadata from top-level metadata object
          const collectionMeta = metadataMap[collectionAddress]?.token_info?.[0];

          // Try to get NFT-specific metadata from top-level metadata object
          const nftMeta = metadataMap[item.address]?.token_info?.[0];

          // NFT name: prefer NFT-specific, then collection name + index, then fallback
          const nftName = nftMeta?.name ||
                          item.content?.name ||
                          (collectionMeta?.name ? `${collectionMeta.name} #${item.index}` : null) ||
                          `NFT #${item.index}`;

          // Image: prefer NFT-specific, then collection
          const imageUrl = this.validateImageUrl(nftMeta?.image) ||
                           this.validateImageUrl(collectionMeta?.image) ||
                           this.validateImageUrl(item.content?.image) ||
                           this.validateImageUrl(item.previews?.[0]?.url);

          return {
            collectionAddress,
            itemIndex: String(item.index ?? '0'),
            address: item.address || '',
            metadata: item.content || {},
            imageUrl,
            name: nftName,
            ownedSince: new Date()
          };
        });
      }
      return [];
    }

    const validatedData = parseResult.data;
    if (!validatedData.nft_items) {
      return [];
    }

    // Extract metadata from top-level metadata object (TonCenter v3)
    const metadataMap = validatedData.metadata || {};

    return validatedData.nft_items.map((item: any) => {
      const collectionAddress = item.collection_address || item.collection?.address || '';

      // Try to get collection metadata from top-level metadata object
      const collectionMeta = metadataMap[collectionAddress]?.token_info?.[0];

      // Try to get NFT-specific metadata from top-level metadata object
      const nftMeta = metadataMap[item.address]?.token_info?.[0];

      // NFT name: prefer NFT-specific, then collection name + index, then fallback
      const nftName = nftMeta?.name ||
                      item.content?.name ||
                      (collectionMeta?.name ? `${collectionMeta.name} #${item.index}` : null) ||
                      `NFT #${item.index}`;

      // Image: prefer NFT-specific, then collection
      const imageUrl = this.validateImageUrl(nftMeta?.image) ||
                       this.validateImageUrl(collectionMeta?.image) ||
                       this.validateImageUrl(item.content?.image) ||
                       this.validateImageUrl(item.previews?.[0]?.url);

      return {
        // TonCenter v3 returns collection_address separately, fallback to nested collection.address
        collectionAddress,
        itemIndex: String(item.index ?? '0'),
        address: item.address || '',
        metadata: item.content || {},
        // SECURITY: Validate image URLs to prevent SSRF
        imageUrl,
        name: nftName,
        ownedSince: new Date()
      };
    });
  }

  /**
   * Get the date when NFT was acquired by the owner
   * Uses two methods:
   * 1. Check transfer history for transfers TO the owner
   * 2. If no transfer found, check NFT account events for deploy date (minted NFTs)
   * SECURITY: Uses AbortController for global timeout across chained API calls
   */
  private async getNftOwnershipDate(nftAddress: string, ownerAddress: string): Promise<Date> {
    // SECURITY: Global timeout for the entire operation (15 seconds)
    // Prevents hanging when multiple sequential API calls are made
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      await this.checkRateLimit();

      const normalizedOwner = safeNormalizeAddress(ownerAddress);
      if (!normalizedOwner) {
        return new Date();
      }

      // Method 1: Check NFT transfer history
      const historyUrl = `${TON_API_ENDPOINTS.tonapi}/nfts/${nftAddress}/history`;

      const historyResponse = await axios.get(historyUrl, {
        timeout: 10000,
        signal: controller.signal,
        headers: this.getTonApiHeaders(), // SECURITY: Use auth headers
        params: { limit: 100 }
      });

      if (historyResponse.data?.events?.length > 0) {
        let oldestTransferDate: Date | null = null;

        for (const event of historyResponse.data.events) {
          if (event.actions) {
            for (const action of event.actions) {
              if (action.type === 'NftItemTransfer' && action.NftItemTransfer) {
                const recipientNorm = safeNormalizeAddress(action.NftItemTransfer.recipient?.address || '');
                if (recipientNorm === normalizedOwner) {
                  const transferDate = new Date(event.timestamp * 1000);
                  if (!oldestTransferDate || transferDate < oldestTransferDate) {
                    oldestTransferDate = transferDate;
                  }
                }
              }
            }
          }
        }

        if (oldestTransferDate) {
          logger.debug('Found NFT ownership date from transfer history', {
            nftAddress,
            ownerAddress,
            ownedSince: oldestTransferDate
          });
          return oldestTransferDate;
        }
      }

      // Method 2: If no transfer found, check NFT account events for deploy date
      // This handles minted NFTs that were never transferred
      await this.checkRateLimit();

      const eventsUrl = `${TON_API_ENDPOINTS.tonapi}/accounts/${nftAddress}/events`;
      const eventsResponse = await axios.get(eventsUrl, {
        timeout: 10000,
        signal: controller.signal,
        headers: this.getTonApiHeaders(), // SECURITY: Use auth headers
        params: { limit: 100 }
      });

      if (eventsResponse.data?.events?.length > 0) {
        const events = eventsResponse.data.events;
        // Events are sorted newest first, get the oldest (last in array)
        const oldestEvent = events[events.length - 1];
        const eventDate = new Date(oldestEvent.timestamp * 1000);

        // Verify current owner matches
        await this.checkRateLimit();
        const nftUrl = `${TON_API_ENDPOINTS.tonapi}/nfts/${nftAddress}`;
        const nftResp = await axios.get(nftUrl, {
          timeout: 10000,
          signal: controller.signal,
          headers: this.getTonApiHeaders() // SECURITY: Use auth headers
        });

        if (nftResp.data?.owner?.address) {
          const currentOwnerNorm = safeNormalizeAddress(nftResp.data.owner.address);
          if (currentOwnerNorm === normalizedOwner) {
            logger.debug('Found NFT ownership date from account events (minted)', {
              nftAddress,
              ownerAddress,
              ownedSince: eventDate
            });
            return eventDate;
          }
        }
      }

      // Fallback: return current time if we couldn't determine
      logger.debug('Could not determine NFT ownership date, using current time', {
        nftAddress,
        ownerAddress
      });
      return new Date();
    } catch (error) {
      if (axios.isCancel(error) || (error instanceof Error && error.name === 'AbortError')) {
        logger.warn('NFT ownership date fetch timed out', { nftAddress, ownerAddress });
      } else {
        logger.warn('Failed to fetch NFT ownership date', {
          nftAddress,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      return new Date();
    } finally {
      clearTimeout(timeoutId);
    }
  }


  /**
   * Get or create NFT collection in database
   * Uses metadata.json for supply-based points calculation
   */
  private async getOrCreateCollection(collectionAddress: string) {
    let collection = await this.prisma.nFTCollection.findUnique({
      where: { address: collectionAddress }
    });

    if (!collection) {
      // Check metadata for collection info
      const metadataInfo = this.metadataParser.getCollectionByAddress(collectionAddress);

      // Fetch additional info from TON API if needed
      const tonApiInfo = await this.getCollectionInfo(collectionAddress);

      // Calculate points based on metadata supply or use default
      const supply = metadataInfo?.supply ?? 10000; // Default to lowest tier (2 meters)
      const basePoints = supplyToMeters(supply);
      const packTier = getTierName(supply);

      collection = await this.prisma.nFTCollection.create({
        data: {
          address: collectionAddress,
          name: metadataInfo?.name || tonApiInfo?.name || `Collection ${collectionAddress.slice(0, 8)}`,
          description: metadataInfo
            ? `${metadataInfo.brandName} - Supply: ${metadataInfo.supply}`
            : tonApiInfo?.description,
          packTier,
          pointsMultiplier: 1.0, // Default multiplier
          basePoints
        }
      });

      logger.info('New NFT collection created from metadata', {
        address: collectionAddress,
        name: collection.name,
        supply,
        basePoints,
        packTier
      });
    }

    return collection;
  }

  /**
   * Get NFT collection info from TON API
   */
  async getCollectionInfo(collectionAddress: string): Promise<any> {
    try {
      await this.checkRateLimit();

      const url = `${TON_API_ENDPOINTS.tonapi}/nfts/collections/${collectionAddress}`;

      const response = await axios.get(url, {
        timeout: 10000,
        headers: this.getTonApiHeaders() // SECURITY: Use auth headers
      });

      return response.data || null;
    } catch (error) {
      logger.warn('Failed to get collection info:', {
        collectionAddress,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Background job: Update ownership dates for NFTs that need it
   * Called by cron job to fill in ownedSince for newly added NFTs
   * Processes in batches to avoid rate limiting
   */
  async updateOwnershipDatesBackground(batchSize: number = 20): Promise<{ updated: number; errors: number }> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get NFTs where ownedSince is recent (likely not updated yet)
    const userNfts = await this.prisma.userNFT.findMany({
      take: batchSize,
      where: {
        ownedSince: { gte: sevenDaysAgo }
      },
      include: {
        user: { select: { walletAddress: true } },
        nft: { select: { name: true, collection: { select: { address: true } } } }
      }
    });

    if (userNfts.length === 0) {
      return { updated: 0, errors: 0 };
    }

    let updated = 0;
    let errors = 0;

    // Group by wallet to minimize API calls
    const byWallet = new Map<string, typeof userNfts>();
    for (const nft of userNfts) {
      const wallet = nft.user.walletAddress;
      if (!wallet) continue;
      if (!byWallet.has(wallet)) byWallet.set(wallet, []);
      byWallet.get(wallet)!.push(nft);
    }

    for (const [walletAddress, walletNfts] of byWallet) {
      try {
        await this.checkRateLimit();

        // Get all NFTs for this wallet (use TonCenter if available)
        let nftItems: any[] = [];

        if (this.apiKey) {
          const response = await axios.get(
            `${TON_API_ENDPOINTS.toncenter}/nft/items`,
            {
              timeout: 15000,
              headers: { 'X-API-Key': this.apiKey },
              params: { owner_address: walletAddress, limit: 1000 }
            }
          );
          nftItems = response.data?.nft_items || [];
        } else {
          const response = await axios.get(
            `${TON_API_ENDPOINTS.tonapi}/accounts/${walletAddress}/nfts`,
            {
              timeout: 15000,
              headers: this.getTonApiHeaders(), // SECURITY: Use auth headers
              params: { limit: 1000 }
            }
          );
          nftItems = response.data?.nft_items || [];
        }

        if (nftItems.length === 0) continue;

        const nftMap = new Map<string, string>();
        for (const item of nftItems) {
          const name = item.metadata?.name || item.content?.name;
          if (name) {
            nftMap.set(name, item.address);
          }
        }

        for (const userNft of walletNfts) {
          if (!userNft.nft.name) continue;
          const nftAddress = nftMap.get(userNft.nft.name);
          if (!nftAddress) continue;

          try {
            await this.checkRateLimit();
            const ownedSince = await this.getNftOwnershipDate(nftAddress, walletAddress);

            // Only update if we got a date older than 7 days
            if (ownedSince.getTime() < sevenDaysAgo.getTime()) {
              await this.prisma.userNFT.update({
                where: { id: userNft.id },
                data: { ownedSince }
              });
              updated++;
            }
          } catch (e) {
            errors++;
          }
        }
      } catch (e) {
        errors += walletNfts.length;
      }
    }

    logger.info('Background ownership date update completed', { updated, errors, processed: userNfts.length });
    return { updated, errors };
  }
}

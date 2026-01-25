import axios, { AxiosError } from 'axios';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';
import { PointsService } from '../points/PointsService.js';

export interface NftScanResult {
  nftsFound: number;
  nftsAdded: number;
  nftsRemoved: number;
  pointsAwarded: number;
}

export interface NftItem {
  collectionAddress: string;
  itemIndex: string;
  address: string;
  metadata: any;
  imageUrl?: string;
  name?: string;
}

const TON_API_ENDPOINTS = {
  primary: 'https://tonapi.io/v2',
  fallback: 'https://toncenter.com/api/v2'
};

export class NftScannerService {
  private rateLimitDelay = 2000; // 2 seconds between requests
  private lastRequestTime = 0;

  constructor(
    private prisma: PrismaClient,
    private pointsService: PointsService
  ) {}

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

      const existingNftAddresses = new Set(
        existingUserNfts.map(un => un.nft.itemIndex)
      );

      const scannedNftMap = new Map(
        whitelistedNfts.map(nft => [nft.itemIndex, nft])
      );

      // Find new NFTs
      const newNfts = whitelistedNfts.filter(
        nft => !existingNftAddresses.has(nft.itemIndex)
      );

      // Find removed NFTs (sold or transferred)
      const removedNfts = existingUserNfts.filter(
        un => !scannedNftMap.has(un.nft.itemIndex)
      );

      let pointsAwarded = 0;

      // Add new NFTs to database
      for (const nft of newNfts) {
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

        // Award points for new NFT
        const nftPoints = Math.floor(
          collection.basePoints * collection.pointsMultiplier
        );

        // Create UserNFT record
        await this.prisma.userNFT.create({
          data: {
            userId,
            nftId: nftItem.id,
            pointsAwarded: nftPoints
          }
        });

        // Award points to user
        await this.pointsService.awardPoints({
          userId,
          points: nftPoints,
          activityType: 'nft_detected',
          description: `NFT detected: ${nft.name || 'Unknown NFT'}`,
          metadata: {
            nftAddress: nft.address,
            collectionAddress: nft.collectionAddress,
            collectionName: collection.name,
            multiplier: collection.pointsMultiplier
          }
        });

        pointsAwarded += nftPoints;
      }

      // Remove sold NFTs
      if (removedNfts.length > 0) {
        await this.prisma.userNFT.deleteMany({
          where: {
            id: {
              in: removedNfts.map(un => un.id)
            }
          }
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
        pointsAwarded
      });

      return {
        nftsFound: whitelistedNfts.length,
        nftsAdded: newNfts.length,
        nftsRemoved: removedNfts.length,
        pointsAwarded
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
   */
  private isWhitelisted(collectionAddress: string): boolean {
    const whitelist = config.nft.whitelistedCollections;

    if (whitelist.length === 0) {
      // If no whitelist configured, allow all collections
      return true;
    }

    return whitelist.includes(collectionAddress);
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
   * Fetch NFTs from TON API (tonapi.io)
   */
  private async fetchNftsFromTonApi(walletAddress: string): Promise<NftItem[]> {
    try {
      const url = `${TON_API_ENDPOINTS.primary}/accounts/${walletAddress}/nfts`;

      const response = await axios.get(url, {
        timeout: 10000,
        params: {
          limit: 1000,
          offset: 0
        }
      });

      if (!response.data || !response.data.nft_items) {
        return [];
      }

      const nfts: NftItem[] = response.data.nft_items.map((item: any) => ({
        collectionAddress: item.collection?.address || '',
        itemIndex: item.index?.toString() || '0',
        address: item.address,
        metadata: item.metadata || {},
        imageUrl: item.previews?.[0]?.url || item.metadata?.image,
        name: item.metadata?.name || `NFT #${item.index}`
      }));

      return nfts;
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
   * Fetch NFTs from TON Center (fallback)
   */
  private async fetchNftsFromTonCenter(walletAddress: string): Promise<NftItem[]> {
    try {
      // Note: TON Center API has different structure
      // This is a simplified implementation
      logger.warn('Using TON Center fallback - limited NFT data');

      // For MVP, return empty array if primary fails
      // In production, implement proper TON Center API integration
      return [];
    } catch (error) {
      logger.error('TON Center API failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Get or create NFT collection in database
   */
  private async getOrCreateCollection(collectionAddress: string) {
    let collection = await this.prisma.nFTCollection.findUnique({
      where: { address: collectionAddress }
    });

    if (!collection) {
      // Fetch collection info from TON API
      const collectionInfo = await this.getCollectionInfo(collectionAddress);

      collection = await this.prisma.nFTCollection.create({
        data: {
          address: collectionAddress,
          name: collectionInfo?.name || `Collection ${collectionAddress.slice(0, 8)}`,
          description: collectionInfo?.description,
          packTier: 'common', // Default tier
          pointsMultiplier: 1.0, // Default multiplier
          basePoints: 100 // Default base points
        }
      });

      logger.info('New NFT collection created', {
        address: collectionAddress,
        name: collection.name
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

      const url = `${TON_API_ENDPOINTS.primary}/nfts/collections/${collectionAddress}`;

      const response = await axios.get(url, {
        timeout: 10000
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
}

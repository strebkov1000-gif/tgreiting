import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { TonConnectService, TonProof } from './TonConnectService.js';
import { NftScannerService } from './NftScannerService.js';

export class WalletService {
  constructor(
    private prisma: PrismaClient,
    private tonConnectService: TonConnectService,
    private nftScannerService: NftScannerService
  ) {}

  /**
   * Connect wallet to user account
   * 1. Verify TON Connect proof
   * 2. Save wallet address to user
   * 3. Trigger NFT scan
   */
  async connectWallet(userId: string, proof: TonProof): Promise<{
    walletAddress: string;
    nftScanResult: any;
  }> {
    try {
      // Verify proof
      const isValid = await this.tonConnectService.verifyProof(proof);

      if (!isValid) {
        throw new Error('Invalid TON Connect proof');
      }

      // Extract and normalize wallet address
      const walletAddress = this.tonConnectService.extractWalletAddress(proof);

      // Check if wallet is already connected to another user
      const existingUser = await this.prisma.user.findUnique({
        where: { walletAddress }
      });

      if (existingUser && existingUser.id !== userId) {
        throw new Error('Wallet is already connected to another account');
      }

      // Update user's wallet address
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          walletAddress,
          lastActivity: new Date()
        }
      });

      logger.info('Wallet connected', {
        userId,
        walletAddress
      });

      // Trigger NFT scan
      let nftScanResult;
      try {
        nftScanResult = await this.nftScannerService.updateUserNfts(userId, walletAddress);
      } catch (scanError) {
        logger.error('NFT scan failed after wallet connection:', {
          userId,
          walletAddress,
          error: scanError instanceof Error ? scanError.message : 'Unknown error'
        });
        // Don't throw - wallet is still connected
        nftScanResult = {
          nftsFound: 0,
          nftsAdded: 0,
          nftsRemoved: 0,
          pointsAwarded: 0
        };
      }

      return {
        walletAddress,
        nftScanResult
      };
    } catch (error) {
      logger.error('Failed to connect wallet:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Disconnect wallet from user account
   */
  async disconnectWallet(userId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true }
      });

      if (!user?.walletAddress) {
        throw new Error('No wallet connected');
      }

      // Remove all UserNFT records (since wallet is disconnected)
      await this.prisma.userNFT.deleteMany({
        where: { userId }
      });

      // Update user
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          walletAddress: null,
          nftCount: 0,
          tonConnectSession: null
        }
      });

      logger.info('Wallet disconnected', {
        userId,
        walletAddress: user.walletAddress
      });
    } catch (error) {
      logger.error('Failed to disconnect wallet:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get wallet info for user
   */
  async getWalletInfo(userId: string): Promise<{
    walletAddress: string | null;
    isConnected: boolean;
    nftCount: number;
  }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          walletAddress: true,
          nftCount: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        walletAddress: user.walletAddress,
        isConnected: user.walletAddress !== null,
        nftCount: user.nftCount
      };
    } catch (error) {
      logger.error('Failed to get wallet info:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Verify wallet ownership
   * Check if user owns the specified wallet address
   */
  async verifyWalletOwnership(userId: string, walletAddress: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true }
      });

      if (!user?.walletAddress) {
        return false;
      }

      // Normalize both addresses for comparison
      const userWallet = this.tonConnectService.normalizeAddress(user.walletAddress);
      const checkWallet = this.tonConnectService.normalizeAddress(walletAddress);

      return userWallet === checkWallet;
    } catch (error) {
      logger.error('Failed to verify wallet ownership:', {
        userId,
        walletAddress,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Update wallet session (for TON Connect state persistence)
   */
  async updateWalletSession(userId: string, sessionData: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          tonConnectSession: sessionData
        }
      });

      logger.debug('Wallet session updated', { userId });
    } catch (error) {
      logger.error('Failed to update wallet session:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw - not critical
    }
  }

  /**
   * Get wallet session
   */
  async getWalletSession(userId: string): Promise<string | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { tonConnectSession: true }
      });

      return user?.tonConnectSession || null;
    } catch (error) {
      logger.error('Failed to get wallet session:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }
}

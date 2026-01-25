import { Address } from '@ton/core';
import crypto from 'crypto';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

export interface TonProof {
  address: string;
  proof: {
    timestamp: number;
    domain: {
      lengthBytes: number;
      value: string;
    };
    signature: string;
    payload: string;
    stateInit?: string;
  };
}

export class TonConnectService {
  private readonly PROOF_LIFETIME_SEC = 300; // 5 minutes

  constructor() {}

  /**
   * Generate random payload for wallet connection
   * Used by frontend to request wallet proof
   */
  generatePayload(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify TON Connect proof
   * Steps:
   * 1. Check timestamp freshness (< 5 minutes)
   * 2. Verify domain matches our Mini App URL
   * 3. Parse and validate wallet address
   * 4. Verify signature (simplified for MVP - full verification requires @ton/crypto)
   */
  async verifyProof(proof: TonProof): Promise<boolean> {
    try {
      // Step 1: Check timestamp freshness
      const now = Math.floor(Date.now() / 1000);
      const timeDiff = now - proof.proof.timestamp;

      if (timeDiff > this.PROOF_LIFETIME_SEC) {
        logger.warn('TON proof expired', {
          timestamp: proof.proof.timestamp,
          now,
          timeDiff
        });
        return false;
      }

      if (timeDiff < -60) {
        logger.warn('TON proof timestamp is in the future', {
          timestamp: proof.proof.timestamp,
          now
        });
        return false;
      }

      // Step 2: Verify domain
      const expectedDomain = this.extractDomain(config.miniApp.url);
      const proofDomain = proof.proof.domain.value;

      if (proofDomain !== expectedDomain) {
        logger.warn('TON proof domain mismatch', {
          expected: expectedDomain,
          received: proofDomain
        });
        return false;
      }

      // Step 3: Validate wallet address format
      try {
        Address.parse(proof.address);
      } catch (error) {
        logger.warn('Invalid TON wallet address format', {
          address: proof.address,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        return false;
      }

      // Step 4: Signature verification
      // For MVP, we skip full cryptographic signature verification
      // In production, use @ton/crypto to verify the signature properly
      // This requires constructing the message and verifying with the public key

      if (!proof.proof.signature || proof.proof.signature.length === 0) {
        logger.warn('TON proof missing signature');
        return false;
      }

      logger.info('TON proof verified (simplified)', {
        address: proof.address,
        domain: proofDomain,
        timestamp: proof.proof.timestamp
      });

      return true;
    } catch (error) {
      logger.error('TON proof verification failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Extract wallet address from proof
   */
  extractWalletAddress(proof: TonProof): string {
    try {
      // Normalize address to user-friendly format
      const address = Address.parse(proof.address);
      return address.toString({ bounceable: false, testOnly: config.ton.network === 'testnet' });
    } catch (error) {
      logger.error('Failed to extract wallet address:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Invalid wallet address');
    }
  }

  /**
   * Validate wallet address format
   */
  isValidAddress(address: string): boolean {
    try {
      Address.parse(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert address to different formats
   */
  normalizeAddress(address: string, options?: { bounceable?: boolean; testOnly?: boolean }): string {
    try {
      const addr = Address.parse(address);
      return addr.toString({
        bounceable: options?.bounceable ?? false,
        testOnly: options?.testOnly ?? config.ton.network === 'testnet'
      });
    } catch (error) {
      logger.error('Failed to normalize address:', {
        address,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Invalid address format');
    }
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch (error) {
      logger.error('Failed to extract domain from URL:', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return url; // Fallback to raw URL
    }
  }

  /**
   * Check if proof is still valid (not expired)
   */
  isProofValid(timestamp: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    const timeDiff = now - timestamp;
    return timeDiff <= this.PROOF_LIFETIME_SEC && timeDiff >= -60;
  }

  /**
   * Get proof expiration time
   */
  getProofExpiration(timestamp: number): Date {
    return new Date((timestamp + this.PROOF_LIFETIME_SEC) * 1000);
  }
}

import { Address, Cell, contractAddress, StateInit, loadStateInit } from '@ton/core';
import { sign, signVerify, keyPairFromSecretKey } from '@ton/crypto';
import crypto from 'crypto';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';
import { Buffer } from 'buffer';

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
      if (!proof.proof.signature || proof.proof.signature.length === 0) {
        logger.warn('TON proof missing signature');
        return false;
      }

      // Step 5: Verify stateInit is provided for new wallets
      if (!proof.proof.stateInit) {
        logger.warn('TON proof missing stateInit - required for signature verification');
        return false;
      }

      // Step 6: Cryptographic signature verification
      try {
        const verified = await this.verifySignature(proof);
        if (!verified) {
          logger.warn('TON proof signature verification failed', {
            address: proof.address
          });
          return false;
        }
      } catch (error) {
        logger.error('TON proof signature verification error:', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        return false;
      }

      logger.info('TON proof verified successfully', {
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
   * Throws error if URL is invalid - no fallback to prevent security issues
   */
  private extractDomain(url: string): string {
    const parsed = new URL(url);
    if (!parsed.hostname) {
      throw new Error('Invalid URL: no hostname');
    }
    return parsed.hostname;
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
   * Verify TON Connect signature
   * According to TON Connect spec:
   * message = utf8_encode("ton-proof-item-v2/") ++
   *           Address.workchain_id (4 bytes) ++
   *           Address.hash (32 bytes) ++
   *           AppDomain.Length (4 bytes LE) ++
   *           AppDomain.Value (Length bytes) ++
   *           Timestamp (8 bytes LE) ++
   *           Payload (variable)
   */
  private async verifySignature(proof: TonProof): Promise<boolean> {
    try {
      // Parse wallet address
      const walletAddress = Address.parse(proof.address);

      // Extract public key from stateInit
      const stateInitCell = Cell.fromBase64(proof.proof.stateInit!);
      const stateInit = loadStateInit(stateInitCell.beginParse());

      // Get public key from wallet data cell
      // Different wallet versions store key differently, try common formats
      // SECURITY: Use independent slices for each attempt to avoid state corruption
      let publicKey: Buffer | null = null;

      if (stateInit.data) {
        // Wallet v1/v2 format: seqno(32) + publicKey(256)
        try {
          const slice1 = stateInit.data.beginParse();
          slice1.loadUint(32); // seqno
          const key = slice1.loadBuffer(32);
          if (key.length === 32) {
            publicKey = key;
          }
        } catch {
          // Try next format
        }

        // Wallet v3r1/v3r2/v4 format: seqno(32) + subwallet_id(32) + publicKey(256)
        if (!publicKey) {
          try {
            const slice2 = stateInit.data.beginParse();
            slice2.loadUint(32); // seqno
            slice2.loadUint(32); // subwallet_id
            const key = slice2.loadBuffer(32);
            if (key.length === 32) {
              publicKey = key;
            }
          } catch {
            // Try next format
          }
        }

        // Wallet v4r1/v4r2 with plugins: seqno(32) + subwallet_id(32) + publicKey(256) + plugins(dict)
        // The key extraction is same as v3, already handled above

        // High-load wallet v2: subwallet_id(32) + last_cleaned(64) + publicKey(256)
        if (!publicKey) {
          try {
            const slice3 = stateInit.data.beginParse();
            slice3.loadUint(32); // subwallet_id
            slice3.loadUint(64); // last_cleaned
            const key = slice3.loadBuffer(32);
            if (key.length === 32) {
              publicKey = key;
            }
          } catch {
            // Could not extract public key
          }
        }
      }

      if (!publicKey) {
        logger.warn('Could not extract public key from stateInit - unsupported wallet format');
        return false;
      }

      // Validate public key
      if (publicKey.length !== 32) {
        logger.warn('Invalid public key length', { length: publicKey.length });
        return false;
      }

      // Verify that address matches stateInit
      const calculatedAddress = contractAddress(walletAddress.workChain, stateInit);
      if (!calculatedAddress.equals(walletAddress)) {
        logger.warn('Address does not match stateInit', {
          expected: walletAddress.toString(),
          calculated: calculatedAddress.toString()
        });
        return false;
      }

      // Build the message that was signed
      const domainBuffer = Buffer.from(proof.proof.domain.value, 'utf8');
      const timestampBuffer = Buffer.alloc(8);
      timestampBuffer.writeBigUInt64LE(BigInt(proof.proof.timestamp));

      const payloadBuffer = Buffer.from(proof.proof.payload, 'utf8');

      // Construct message according to TON Connect spec
      const message = Buffer.concat([
        Buffer.from('ton-proof-item-v2/', 'utf8'),
        Buffer.alloc(4).fill(0), // workchain as int32 LE
        walletAddress.hash,
        Buffer.from([domainBuffer.length & 0xff, (domainBuffer.length >> 8) & 0xff, 0, 0]), // domain length as uint32 LE
        domainBuffer,
        timestampBuffer,
        payloadBuffer
      ]);

      // Write workchain correctly
      message.writeInt32LE(walletAddress.workChain, 18);

      // Hash the message with SHA256
      const messageHash = crypto.createHash('sha256').update(message).digest();

      // Construct final message for signature
      const fullMessage = Buffer.concat([
        Buffer.from([0xff, 0xff]), // ton-connect prefix
        Buffer.from('ton-connect', 'utf8'),
        messageHash
      ]);

      const finalHash = crypto.createHash('sha256').update(fullMessage).digest();

      // Verify signature
      const signature = Buffer.from(proof.proof.signature, 'base64');

      const isValid = signVerify(finalHash, signature, publicKey);

      if (!isValid) {
        logger.warn('Signature verification failed');
      }

      return isValid;
    } catch (error) {
      logger.error('Signature verification error:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Get proof expiration time
   */
  getProofExpiration(timestamp: number): Date {
    return new Date((timestamp + this.PROOF_LIFETIME_SEC) * 1000);
  }
}

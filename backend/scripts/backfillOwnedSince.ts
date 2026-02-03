/**
 * Backfill script for ownedSince field
 *
 * This script updates existing UserNFT records with the actual blockchain ownership date.
 * Run once after adding the ownedSince field to the schema.
 *
 * Run with: npx tsx scripts/backfillOwnedSince.ts
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { Address } from '@ton/core';

const prisma = new PrismaClient();

const TON_API_URL = 'https://tonapi.io/v2';
const RATE_LIMIT_DELAY = 500; // 500ms between requests

/**
 * Normalize TON address for comparison
 */
function normalizeAddress(address: string): string | null {
  try {
    const parsed = Address.parse(address);
    return parsed.toRawString().toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Get NFT ownership date from blockchain history
 */
async function getNftOwnershipDate(nftAddress: string, ownerAddress: string): Promise<Date | null> {
  try {
    const normalizedOwner = normalizeAddress(ownerAddress);
    if (!normalizedOwner) return null;

    const response = await axios.get(`${TON_API_URL}/nfts/${nftAddress}/history`, {
      timeout: 10000,
      params: { limit: 100 }
    });

    if (!response.data?.events) {
      return null;
    }

    // Look for the earliest transfer to current owner
    let oldestTransferDate: Date | null = null;

    for (const event of response.data.events) {
      if (event.actions) {
        for (const action of event.actions) {
          if (action.type === 'NftItemTransfer' && action.NftItemTransfer) {
            const transfer = action.NftItemTransfer;
            const recipientNormalized = normalizeAddress(transfer.recipient?.address || '');

            if (recipientNormalized === normalizedOwner) {
              const transferDate = new Date(event.timestamp * 1000);
              if (!oldestTransferDate || transferDate < oldestTransferDate) {
                oldestTransferDate = transferDate;
              }
            }
          }
        }
      }
    }

    return oldestTransferDate;
  } catch (error) {
    console.error(`Failed to get history for NFT ${nftAddress}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function backfillOwnedSince() {
  console.log('Starting ownedSince backfill...\n');

  // Get all UserNFT records with their related data
  const userNfts = await prisma.userNFT.findMany({
    include: {
      user: {
        select: {
          walletAddress: true
        }
      },
      nft: {
        select: {
          id: true,
          name: true,
          collection: {
            select: {
              address: true,
              name: true
            }
          }
        }
      }
    }
  });

  console.log(`Found ${userNfts.length} UserNFT records to process\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const userNft of userNfts) {
    const walletAddress = userNft.user.walletAddress;

    if (!walletAddress) {
      console.log(`⏭️ Skipping ${userNft.nft.name}: No wallet address`);
      skipped++;
      continue;
    }

    // Get NFT address from collection address and item index
    // For TON NFTs, we need to get the actual NFT item address
    // This requires querying the TON API for the NFT item

    try {
      // First, try to get the NFT address from TON API
      const collectionAddress = userNft.nft.collection.address;

      // Get NFT items in collection owned by this wallet
      const response = await axios.get(`${TON_API_URL}/accounts/${walletAddress}/nfts`, {
        timeout: 10000,
        params: { limit: 1000 }
      });

      if (!response.data?.nft_items) {
        console.log(`⏭️ Skipping ${userNft.nft.name}: No NFTs found for wallet`);
        skipped++;
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        continue;
      }

      // Find the matching NFT
      const matchingNft = response.data.nft_items.find((item: any) => {
        const itemCollectionAddress = item.collection?.address || '';
        const normalizedItem = normalizeAddress(itemCollectionAddress);
        const normalizedCollection = normalizeAddress(collectionAddress);

        return normalizedItem === normalizedCollection &&
               item.metadata?.name === userNft.nft.name;
      });

      if (!matchingNft) {
        console.log(`⏭️ Skipping ${userNft.nft.name}: Not found in wallet`);
        skipped++;
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        continue;
      }

      // Get ownership date from history
      const nftAddress = matchingNft.address;
      const ownedSince = await getNftOwnershipDate(nftAddress, walletAddress);

      if (ownedSince) {
        // Update the UserNFT record
        await prisma.userNFT.update({
          where: { id: userNft.id },
          data: { ownedSince }
        });

        const holdDays = Math.floor((Date.now() - ownedSince.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`✅ Updated ${userNft.nft.name}: owned since ${ownedSince.toISOString()} (${holdDays} days)`);
        updated++;
      } else {
        console.log(`⚠️ Could not determine ownership date for ${userNft.nft.name}, keeping detectedAt`);
        // Set ownedSince to detectedAt as fallback
        await prisma.userNFT.update({
          where: { id: userNft.id },
          data: { ownedSince: userNft.detectedAt }
        });
        skipped++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));

    } catch (error) {
      console.error(`❌ Error processing ${userNft.nft.name}:`, error instanceof Error ? error.message : error);
      errors++;
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
  }

  console.log('\n📊 Backfill Summary:');
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total: ${userNfts.length}`);

  await prisma.$disconnect();
  console.log('\n✅ Backfill complete!');
}

backfillOwnedSince().catch(console.error);

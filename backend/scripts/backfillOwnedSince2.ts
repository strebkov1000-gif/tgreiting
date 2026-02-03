/**
 * Backfill script for ownedSince field - RETRY VERSION
 *
 * This script updates UserNFT records that still have default ownedSince dates.
 * Uses longer delays to avoid rate limiting.
 *
 * Run with: npx tsx scripts/backfillOwnedSince2.ts
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { Address } from '@ton/core';

const prisma = new PrismaClient();

const TON_API_URL = 'https://tonapi.io/v2';
const RATE_LIMIT_DELAY = 2000; // 2 seconds between requests (was 500ms)

function normalizeAddress(address: string): string | null {
  try {
    const parsed = Address.parse(address);
    return parsed.toRawString().toLowerCase();
  } catch {
    return null;
  }
}

async function getNftOwnershipDate(nftAddress: string, ownerAddress: string): Promise<Date | null> {
  try {
    const normalizedOwner = normalizeAddress(ownerAddress);
    if (!normalizedOwner) return null;

    const response = await axios.get(`${TON_API_URL}/nfts/${nftAddress}/history`, {
      timeout: 15000,
      params: { limit: 100 }
    });

    if (!response.data?.events) {
      return null;
    }

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
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      console.log(`   ⏳ Rate limited, waiting 10 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
      // Retry once
      return getNftOwnershipDate(nftAddress, ownerAddress);
    }
    return null;
  }
}

async function backfillOwnedSince() {
  console.log('🔄 Starting ownedSince backfill (retry mode)...\n');

  // Only get NFTs where ownedSince is within last 7 days (likely not backfilled properly)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const userNfts = await prisma.userNFT.findMany({
    where: {
      ownedSince: {
        gte: sevenDaysAgo // ownedSince is recent = probably not updated correctly
      }
    },
    include: {
      user: {
        select: {
          walletAddress: true,
          username: true
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

  console.log(`Found ${userNfts.length} NFTs that need ownedSince update\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < userNfts.length; i++) {
    const userNft = userNfts[i];
    const walletAddress = userNft.user.walletAddress;

    console.log(`[${i+1}/${userNfts.length}] ${userNft.nft.name} (@${userNft.user.username || 'unknown'})`);

    if (!walletAddress) {
      console.log(`   ⏭️ Skipped: No wallet address`);
      skipped++;
      continue;
    }

    try {
      // Get NFT address from TON API
      const response = await axios.get(`${TON_API_URL}/accounts/${walletAddress}/nfts`, {
        timeout: 15000,
        params: { limit: 1000 }
      });

      if (!response.data?.nft_items) {
        console.log(`   ⏭️ Skipped: No NFTs found for wallet`);
        skipped++;
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        continue;
      }

      // Find the matching NFT by name
      const matchingNft = response.data.nft_items.find((item: any) => {
        return item.metadata?.name === userNft.nft.name;
      });

      if (!matchingNft) {
        console.log(`   ⏭️ Skipped: NFT not found in wallet`);
        skipped++;
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        continue;
      }

      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));

      // Get ownership date from history
      const ownedSince = await getNftOwnershipDate(matchingNft.address, walletAddress);

      if (ownedSince) {
        const holdDays = Math.floor((Date.now() - ownedSince.getTime()) / (1000 * 60 * 60 * 24));

        await prisma.userNFT.update({
          where: { id: userNft.id },
          data: { ownedSince }
        });

        console.log(`   ✅ Updated: owned since ${ownedSince.toISOString()} (${holdDays} days)`);
        updated++;
      } else {
        console.log(`   ⚠️ Could not determine ownership date`);
        skipped++;
      }

      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));

    } catch (error) {
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      errors++;
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY * 2));
    }
  }

  console.log('\n📊 Backfill Summary:');
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total: ${userNfts.length}`);

  // Now recalculate hold bonus for all users
  console.log('\n🔄 Recalculating hold bonuses...');

  const { PointsService } = await import('../src/services/points/PointsService.js');
  const { HoldBonusService } = await import('../src/services/holdbonus/HoldBonusService.js');

  const pointsService = new PointsService(prisma);
  const holdBonusService = new HoldBonusService(prisma, pointsService);

  const stats = await holdBonusService.calculateAndAwardHoldBonusForAll();

  console.log('\n📊 Hold Bonus Results:');
  console.log(`   Users processed: ${stats.usersProcessed}`);
  console.log(`   Total hold bonus awarded: ${stats.totalHoldBonus}m`);
  console.log(`   Diamond Hands awarded: ${stats.totalDiamondHands}`);

  await prisma.$disconnect();
  console.log('\n✅ Backfill complete!');
}

backfillOwnedSince().catch(console.error);

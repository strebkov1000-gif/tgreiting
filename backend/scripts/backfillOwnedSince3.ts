/**
 * Backfill script for ownedSince field - VERSION 3
 *
 * Improved logic:
 * 1. First try to get transfer events where recipient = owner
 * 2. If no transfer found, get NFT account events to find deploy date (for minted NFTs)
 * 3. Use the oldest relevant event as ownedSince
 *
 * Run with: npx tsx scripts/backfillOwnedSince3.ts
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { Address } from '@ton/core';

const prisma = new PrismaClient();

const TON_API_URL = 'https://tonapi.io/v2';
const RATE_LIMIT_DELAY = 2500; // 2.5 seconds between requests

function normalizeAddress(address: string): string | null {
  try {
    const parsed = Address.parse(address);
    return parsed.toRawString().toLowerCase();
  } catch {
    return null;
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get ownership date by checking NFT account events
 * This works for both minted and transferred NFTs
 */
async function getNftOwnershipDate(nftAddress: string, ownerAddress: string): Promise<Date | null> {
  const normalizedOwner = normalizeAddress(ownerAddress);
  if (!normalizedOwner) return null;

  try {
    // Method 1: Check NFT transfer history
    const historyUrl = `${TON_API_URL}/nfts/${nftAddress}/history`;
    const historyResp = await axios.get(historyUrl, {
      timeout: 15000,
      params: { limit: 100 }
    });

    if (historyResp.data?.events?.length > 0) {
      let transferDate: Date | null = null;

      for (const event of historyResp.data.events) {
        if (event.actions) {
          for (const action of event.actions) {
            if (action.type === 'NftItemTransfer' && action.NftItemTransfer) {
              const recipientNorm = normalizeAddress(action.NftItemTransfer.recipient?.address || '');
              if (recipientNorm === normalizedOwner) {
                const eventDate = new Date(event.timestamp * 1000);
                // Get the OLDEST transfer to this owner
                if (!transferDate || eventDate < transferDate) {
                  transferDate = eventDate;
                }
              }
            }
          }
        }
      }

      if (transferDate) {
        return transferDate;
      }
    }

    // Method 2: If no transfer found, check NFT account events for deploy date
    // This handles minted NFTs that were never transferred
    await sleep(RATE_LIMIT_DELAY);

    const eventsUrl = `${TON_API_URL}/accounts/${nftAddress}/events`;
    const eventsResp = await axios.get(eventsUrl, {
      timeout: 15000,
      params: { limit: 100 }
    });

    if (eventsResp.data?.events?.length > 0) {
      // Find the oldest event (usually ContractDeploy for minted NFTs)
      const events = eventsResp.data.events;
      const oldestEvent = events[events.length - 1]; // Events are sorted newest first

      // Check if the oldest event is a deploy or the first transfer
      const eventDate = new Date(oldestEvent.timestamp * 1000);

      // Verify this NFT is actually owned by the user (check current owner)
      await sleep(RATE_LIMIT_DELAY);

      const nftUrl = `${TON_API_URL}/nfts/${nftAddress}`;
      const nftResp = await axios.get(nftUrl, { timeout: 15000 });

      if (nftResp.data?.owner?.address) {
        const currentOwnerNorm = normalizeAddress(nftResp.data.owner.address);
        if (currentOwnerNorm === normalizedOwner) {
          return eventDate;
        }
      }
    }

    return null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      console.log(`   \u23F3 Rate limited, waiting 15 seconds...`);
      await sleep(15000);
      // Retry once
      return getNftOwnershipDate(nftAddress, ownerAddress);
    }
    return null;
  }
}

async function backfillOwnedSince() {
  console.log('\uD83D\uDD04 Starting ownedSince backfill v3 (improved algorithm)...\n');

  // Get NFTs where ownedSince is within last 7 days (likely not backfilled properly)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const userNfts = await prisma.userNFT.findMany({
    where: {
      ownedSince: {
        gte: sevenDaysAgo
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

  // Group by wallet to optimize API calls
  const byWallet = new Map<string, typeof userNfts>();
  for (const nft of userNfts) {
    const wallet = nft.user.walletAddress;
    if (!wallet) continue;
    if (!byWallet.has(wallet)) {
      byWallet.set(wallet, []);
    }
    byWallet.get(wallet)!.push(nft);
  }

  console.log(`Processing ${byWallet.size} unique wallets\n`);

  let walletIndex = 0;
  for (const [walletAddress, walletNfts] of byWallet) {
    walletIndex++;
    console.log(`\n=== Wallet ${walletIndex}/${byWallet.size}: @${walletNfts[0].user.username} (${walletNfts.length} NFTs) ===`);

    try {
      // Get all NFTs for this wallet in one request
      await sleep(RATE_LIMIT_DELAY);

      const response = await axios.get(`${TON_API_URL}/accounts/${walletAddress}/nfts`, {
        timeout: 15000,
        params: { limit: 1000 }
      });

      if (!response.data?.nft_items) {
        console.log(`   \u23ED\uFE0F No NFTs found for wallet`);
        skipped += walletNfts.length;
        continue;
      }

      // Create a map of NFT names to addresses
      const nftMap = new Map<string, string>();
      for (const item of response.data.nft_items) {
        if (item.metadata?.name) {
          nftMap.set(item.metadata.name, item.address);
        }
      }

      // Process each NFT for this wallet
      for (const userNft of walletNfts) {
        const nftName = userNft.nft.name;
        console.log(`\n[${userNft.nft.name}]`);

        const nftAddress = nftMap.get(nftName);
        if (!nftAddress) {
          console.log(`   \u23ED\uFE0F NFT not found in wallet`);
          skipped++;
          continue;
        }

        await sleep(RATE_LIMIT_DELAY);

        try {
          const ownedSince = await getNftOwnershipDate(nftAddress, walletAddress);

          if (ownedSince) {
            const holdDays = Math.floor((Date.now() - ownedSince.getTime()) / (1000 * 60 * 60 * 24));

            await prisma.userNFT.update({
              where: { id: userNft.id },
              data: { ownedSince }
            });

            console.log(`   \u2705 Updated: owned since ${ownedSince.toISOString()} (${holdDays} days)`);
            updated++;
          } else {
            console.log(`   \u26A0\uFE0F Could not determine ownership date`);
            skipped++;
          }
        } catch (error) {
          console.log(`   \u274C Error: ${error instanceof Error ? error.message : 'Unknown'}`);
          errors++;
          await sleep(RATE_LIMIT_DELAY * 2);
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        console.log(`   \u23F3 Rate limited on wallet scan, waiting 15 seconds...`);
        await sleep(15000);
        walletIndex--; // Retry this wallet
        continue;
      }
      console.log(`   \u274C Error scanning wallet: ${error instanceof Error ? error.message : 'Unknown'}`);
      errors += walletNfts.length;
    }
  }

  console.log('\n\uD83D\uDCCA Backfill Summary:');
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total: ${userNfts.length}`);

  // Now recalculate hold bonus for all users
  console.log('\n\uD83D\uDD04 Recalculating hold bonuses...');

  const { PointsService } = await import('../src/services/points/PointsService.js');
  const { HoldBonusService } = await import('../src/services/holdbonus/HoldBonusService.js');

  const pointsService = new PointsService(prisma);
  const holdBonusService = new HoldBonusService(prisma, pointsService);

  const stats = await holdBonusService.calculateAndAwardHoldBonusForAll();

  console.log('\n\uD83D\uDCCA Hold Bonus Results:');
  console.log(`   Users processed: ${stats.usersProcessed}`);
  console.log(`   Total hold bonus awarded: ${stats.totalHoldBonus}m`);
  console.log(`   Diamond Hands awarded: ${stats.totalDiamondHands}`);

  await prisma.$disconnect();
  console.log('\n\u2705 Backfill complete!');
}

backfillOwnedSince().catch(console.error);

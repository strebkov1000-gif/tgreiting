/**
 * Debug script v2 - check NFT details and transaction history
 *
 * Run with: npx tsx scripts/debugNftOwnership2.ts
 */

import axios from 'axios';
import { Address } from '@ton/core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TON_API_URL = 'https://tonapi.io/v2';

function normalizeAddress(address: string): string | null {
  try {
    const parsed = Address.parse(address);
    return parsed.toRawString().toLowerCase();
  } catch {
    return null;
  }
}

async function getNftCreationDate(nftAddress: string): Promise<Date | null> {
  try {
    // Try to get NFT details which may contain creation info
    console.log('\n--- Checking NFT details ---');
    const detailsUrl = `${TON_API_URL}/nfts/${nftAddress}`;
    const detailsResp = await axios.get(detailsUrl, { timeout: 15000 });

    console.log('NFT details response keys:', Object.keys(detailsResp.data || {}));

    if (detailsResp.data) {
      console.log('  owner:', JSON.stringify(detailsResp.data.owner, null, 2));
      console.log('  approved_by:', detailsResp.data.approved_by);

      // Check if there's any timestamp info
      if (detailsResp.data.collection) {
        console.log('  collection:', detailsResp.data.collection.name);
      }
    }

    // Try to get account transactions for the NFT contract
    console.log('\n--- Checking NFT account transactions ---');
    const txUrl = `${TON_API_URL}/accounts/${nftAddress}/events`;
    const txResp = await axios.get(txUrl, {
      timeout: 15000,
      params: { limit: 10 }
    });

    if (txResp.data?.events && txResp.data.events.length > 0) {
      console.log(`Found ${txResp.data.events.length} events for NFT contract`);

      // Get the oldest event (NFT creation/deploy)
      const events = txResp.data.events;
      let oldestTimestamp = Infinity;

      for (const event of events) {
        console.log(`\nEvent: ${event.event_id}`);
        console.log(`  Timestamp: ${new Date(event.timestamp * 1000).toISOString()}`);
        console.log(`  Actions: ${event.actions?.map((a: any) => a.type).join(', ')}`);

        if (event.timestamp < oldestTimestamp) {
          oldestTimestamp = event.timestamp;
        }
      }

      // Also try to get more events to find the very first one
      const allEventsResp = await axios.get(txUrl, {
        timeout: 15000,
        params: { limit: 100 }
      });

      if (allEventsResp.data?.events && allEventsResp.data.events.length > 0) {
        console.log(`\nTotal events found: ${allEventsResp.data.events.length}`);
        const lastEvent = allEventsResp.data.events[allEventsResp.data.events.length - 1];
        console.log('Oldest event:');
        console.log(`  Timestamp: ${new Date(lastEvent.timestamp * 1000).toISOString()}`);
        console.log(`  Actions: ${lastEvent.actions?.map((a: any) => a.type).join(', ')}`);

        return new Date(lastEvent.timestamp * 1000);
      }
    } else {
      console.log('No events found for NFT contract');
    }

    // Try to get the raw account info which might have timestamp
    console.log('\n--- Checking raw account info ---');
    const accountUrl = `${TON_API_URL}/accounts/${nftAddress}`;
    const accountResp = await axios.get(accountUrl, { timeout: 15000 });

    if (accountResp.data) {
      console.log('Account data keys:', Object.keys(accountResp.data));
      if (accountResp.data.last_activity) {
        console.log('  last_activity:', accountResp.data.last_activity);
      }
      if (accountResp.data.get_methods) {
        console.log('  get_methods:', accountResp.data.get_methods);
      }
    }

    return null;
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    return null;
  }
}

async function main() {
  // Get a few NFTs to test
  const userNfts = await prisma.userNFT.findMany({
    take: 3,
    where: {
      ownedSince: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    },
    include: {
      user: {
        select: { walletAddress: true, username: true }
      },
      nft: {
        select: {
          name: true,
          collection: {
            select: { address: true, name: true }
          }
        }
      }
    }
  });

  if (userNfts.length === 0) {
    console.log('No NFTs found');
    await prisma.$disconnect();
    return;
  }

  for (const userNft of userNfts) {
    if (!userNft.user.walletAddress) continue;

    console.log('\n========================================');
    console.log(`NFT: ${userNft.nft.name}`);
    console.log(`Collection: ${userNft.nft.collection.name}`);
    console.log(`Owner: @${userNft.user.username}`);
    console.log('========================================');

    // Get NFT address from wallet
    const response = await axios.get(`${TON_API_URL}/accounts/${userNft.user.walletAddress}/nfts`, {
      timeout: 15000,
      params: { limit: 100 }
    });

    if (!response.data?.nft_items) {
      console.log('No NFTs in wallet');
      continue;
    }

    const matchingNft = response.data.nft_items.find((item: any) =>
      item.metadata?.name === userNft.nft.name
    );

    if (!matchingNft) {
      console.log('NFT not found in wallet');
      continue;
    }

    console.log('NFT address:', matchingNft.address);

    const creationDate = await getNftCreationDate(matchingNft.address);
    if (creationDate) {
      console.log('\n>>> Found creation date:', creationDate.toISOString());
      const holdDays = Math.floor((Date.now() - creationDate.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`>>> Hold days: ${holdDays}`);
    }

    // Wait to avoid rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }

  await prisma.$disconnect();
}

main().catch(console.error);

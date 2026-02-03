/**
 * Debug script to investigate NFT ownership address matching
 *
 * Run with: npx tsx scripts/debugNftOwnership.ts
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

function getUserFriendlyAddress(address: string, bounceable: boolean = true): string | null {
  try {
    const parsed = Address.parse(address);
    return parsed.toString({ bounceable });
  } catch {
    return null;
  }
}

async function debugNftHistory(nftAddress: string, ownerWallet: string) {
  console.log('\n========================================');
  console.log('Debugging NFT ownership');
  console.log('========================================');

  console.log('\nOwner wallet addresses:');
  console.log('  Input:', ownerWallet);
  console.log('  Raw:', normalizeAddress(ownerWallet));
  console.log('  Bounceable:', getUserFriendlyAddress(ownerWallet, true));
  console.log('  Non-bounceable:', getUserFriendlyAddress(ownerWallet, false));

  console.log('\nNFT address:');
  console.log('  Input:', nftAddress);
  console.log('  Raw:', normalizeAddress(nftAddress));

  console.log('\nFetching NFT history...');

  try {
    const response = await axios.get(`${TON_API_URL}/nfts/${nftAddress}/history`, {
      timeout: 15000,
      params: { limit: 50 }
    });

    if (!response.data?.events || response.data.events.length === 0) {
      console.log('No history events found!');
      return;
    }

    console.log(`Found ${response.data.events.length} events\n`);

    const ownerNormalized = normalizeAddress(ownerWallet);

    for (const event of response.data.events) {
      const timestamp = new Date(event.timestamp * 1000).toISOString();

      if (event.actions) {
        for (const action of event.actions) {
          if (action.type === 'NftItemTransfer' && action.NftItemTransfer) {
            const transfer = action.NftItemTransfer;

            const senderAddr = transfer.sender?.address || 'N/A';
            const recipientAddr = transfer.recipient?.address || 'N/A';

            const senderNorm = normalizeAddress(senderAddr);
            const recipientNorm = normalizeAddress(recipientAddr);

            const matchesSender = senderNorm === ownerNormalized;
            const matchesRecipient = recipientNorm === ownerNormalized;

            console.log('Transfer event:');
            console.log('  Timestamp:', timestamp);
            console.log('  Sender:');
            console.log('    Original:', senderAddr);
            console.log('    Normalized:', senderNorm);
            console.log('    Matches owner?', matchesSender ? 'YES' : 'no');
            console.log('  Recipient:');
            console.log('    Original:', recipientAddr);
            console.log('    Normalized:', recipientNorm);
            console.log('    Matches owner?', matchesRecipient ? 'YES' : 'no');
            console.log('');
          }
        }
      }
    }
  } catch (error) {
    console.error('Error fetching history:', error instanceof Error ? error.message : error);
  }
}

async function main() {
  // Get a sample NFT that failed to get ownership date
  const userNft = await prisma.userNFT.findFirst({
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

  if (!userNft || !userNft.user.walletAddress) {
    console.log('No suitable NFT found for debugging');
    await prisma.$disconnect();
    return;
  }

  console.log('\nSelected NFT for debugging:');
  console.log('  Name:', userNft.nft.name);
  console.log('  Collection:', userNft.nft.collection.name);
  console.log('  Owner:', userNft.user.username);
  console.log('  Wallet:', userNft.user.walletAddress);

  // First get the NFT address from wallet
  console.log('\nFetching NFT address from wallet...');

  try {
    const response = await axios.get(`${TON_API_URL}/accounts/${userNft.user.walletAddress}/nfts`, {
      timeout: 15000,
      params: { limit: 100 }
    });

    if (!response.data?.nft_items) {
      console.log('No NFTs found in wallet');
      await prisma.$disconnect();
      return;
    }

    // Find matching NFT
    const matchingNft = response.data.nft_items.find((item: any) =>
      item.metadata?.name === userNft.nft.name
    );

    if (!matchingNft) {
      console.log('NFT not found in wallet by name');

      // Try to find any NFT from the same collection
      const collectionAddr = normalizeAddress(userNft.nft.collection.address);
      const sameCollectionNft = response.data.nft_items.find((item: any) => {
        const itemCollAddr = normalizeAddress(item.collection?.address || '');
        return itemCollAddr === collectionAddr;
      });

      if (sameCollectionNft) {
        console.log('Found different NFT from same collection:', sameCollectionNft.metadata?.name);
        await debugNftHistory(sameCollectionNft.address, userNft.user.walletAddress);
      }

      await prisma.$disconnect();
      return;
    }

    console.log('Found NFT:');
    console.log('  Address:', matchingNft.address);
    console.log('  Owner from API:', matchingNft.owner?.address);

    // Check if owner matches
    const apiOwner = normalizeAddress(matchingNft.owner?.address || '');
    const ourOwner = normalizeAddress(userNft.user.walletAddress);
    console.log('\nOwner comparison:');
    console.log('  API owner (raw):', apiOwner);
    console.log('  Our wallet (raw):', ourOwner);
    console.log('  Match:', apiOwner === ourOwner ? 'YES' : 'NO');

    // Debug NFT history
    await debugNftHistory(matchingNft.address, userNft.user.walletAddress);

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }

  await prisma.$disconnect();
}

main().catch(console.error);

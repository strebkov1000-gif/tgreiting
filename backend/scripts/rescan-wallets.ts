import { PrismaClient } from '@prisma/client';
import { NftScannerService } from '../src/services/ton/NftScannerService.js';
import { PointsService } from '../src/services/points/PointsService.js';

const prisma = new PrismaClient();
const pointsService = new PointsService(prisma);
const nftScanner = new NftScannerService(prisma, pointsService);

async function rescanWallets() {
  console.log('Fetching users with connected wallets...');

  const users = await prisma.user.findMany({
    where: {
      walletAddress: { not: null }
    },
    select: {
      id: true,
      username: true,
      walletAddress: true,
      nftCount: true
    }
  });

  console.log(`Found ${users.length} users with wallets\n`);

  let totalAdded = 0;
  let totalPoints = 0;

  for (const user of users) {
    if (!user.walletAddress) continue;

    console.log(`Scanning ${user.username || user.id}...`);

    try {
      const result = await nftScanner.updateUserNfts(user.id, user.walletAddress);
      console.log(`  Found: ${result.nftsFound}, Added: ${result.nftsAdded}, Points: ${result.pointsAwarded}`);

      totalAdded += result.nftsAdded;
      totalPoints += result.pointsAwarded;

      // Rate limit - wait 2 seconds between users
      await new Promise(r => setTimeout(r, 2000));
    } catch (error) {
      console.error(`  Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total NFTs added: ${totalAdded}`);
  console.log(`Total points awarded: ${totalPoints}`);

  await prisma.$disconnect();
}

rescanWallets().catch(console.error);

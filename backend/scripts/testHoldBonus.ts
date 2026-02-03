/**
 * Test script for Hold Bonus calculation
 * Run with: npx tsx scripts/testHoldBonus.ts
 */

import { PrismaClient } from '@prisma/client';
import { PointsService } from '../src/services/points/PointsService.js';
import { HoldBonusService } from '../src/services/holdbonus/HoldBonusService.js';

const prisma = new PrismaClient();

async function testHoldBonus() {
  console.log('🧪 Testing Hold Bonus System\n');

  const pointsService = new PointsService(prisma);
  const holdBonusService = new HoldBonusService(prisma, pointsService);

  // Get all users with NFTs
  const usersWithNfts = await prisma.user.findMany({
    where: {
      nfts: {
        some: {}
      }
    },
    include: {
      nfts: {
        include: {
          nft: {
            include: {
              collection: true
            }
          }
        }
      }
    },
    take: 5 // Test with first 5 users
  });

  console.log(`Found ${usersWithNfts.length} users with NFTs\n`);

  for (const user of usersWithNfts) {
    console.log(`\n👤 User: ${user.username || user.firstName || user.telegramId}`);
    console.log(`   NFTs: ${user.nfts.length}`);
    console.log(`   Total Points: ${user.totalPoints}`);
    console.log(`   Diamond Hands Awarded: ${user.diamondHandsAwarded}`);

    // Get hold bonus info
    try {
      const holdInfo = await holdBonusService.getUserHoldBonusInfo(user.id);

      console.log(`\n   📊 Hold Bonus Info:`);
      console.log(`   - Total Hold Bonus: ${holdInfo.totalHoldBonus}m`);
      console.log(`   - Oldest NFT Days: ${holdInfo.oldestNftDays}`);
      console.log(`   - Diamond Hands Eligible: ${holdInfo.diamondHandsEligible}`);
      console.log(`   - Diamond Hands Awarded: ${holdInfo.diamondHandsAwarded}`);
      console.log(`   - Days Until Diamond: ${holdInfo.daysUntilDiamondHands}`);

      if (holdInfo.nfts.length > 0) {
        console.log(`\n   🎨 NFTs with hold bonus:`);
        holdInfo.nfts.slice(0, 3).forEach(nft => {
          const { holdDays, holdMonths, bonusPercent } = nft.holdInfo;
          console.log(`   - ${nft.nftName}: ${holdDays} days (${holdMonths} months) = +${bonusPercent}% = +${nft.currentHoldBonus}m`);
        });
        if (holdInfo.nfts.length > 3) {
          console.log(`   ... and ${holdInfo.nfts.length - 3} more`);
        }
      }

      // Try to calculate hold bonus
      console.log(`\n   🔄 Calculating hold bonus...`);
      const result = await holdBonusService.calculateAndAwardHoldBonus(user.id);

      console.log(`   ✅ Result:`);
      console.log(`   - NFTs Processed: ${result.nftsProcessed}`);
      console.log(`   - Hold Bonus Awarded: ${result.holdBonusAwarded}m`);
      console.log(`   - Diamond Hands Awarded: ${result.diamondHandsAwarded}`);
      console.log(`   - Diamond Hands Bonus: ${result.diamondHandsBonus}m`);
      console.log(`   - Total Awarded: ${result.totalAwarded}m`);

    } catch (error) {
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Summary
  console.log('\n\n📈 Summary:');

  const totalUsers = await prisma.user.count({
    where: { nfts: { some: {} } }
  });

  const diamondHandsUsers = await prisma.user.count({
    where: { diamondHandsAwarded: true }
  });

  const totalHoldBonusTransactions = await prisma.pointTransaction.count({
    where: { activityType: 'hold_bonus' }
  });

  const holdBonusSum = await prisma.pointTransaction.aggregate({
    where: { activityType: 'hold_bonus' },
    _sum: { points: true }
  });

  console.log(`- Total Users with NFTs: ${totalUsers}`);
  console.log(`- Users with Diamond Hands: ${diamondHandsUsers}`);
  console.log(`- Total Hold Bonus Transactions: ${totalHoldBonusTransactions}`);
  console.log(`- Total Hold Bonus Points Awarded: ${holdBonusSum._sum.points || 0}m`);

  await prisma.$disconnect();
  console.log('\n✅ Test complete!');
}

testHoldBonus().catch(console.error);

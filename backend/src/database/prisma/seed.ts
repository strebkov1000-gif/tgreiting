import { PrismaClient } from '@prisma/client';
import { CollectionSyncService } from '../../services/metadata/CollectionSyncService.js';

const prisma = new PrismaClient();

// Only 8 core achievements
const achievements = [
  {
    key: 'wallet_connected',
    name: 'Wallet Pioneer',
    description: 'Connect your TON wallet',
    icon: '💎',
    pointsReward: 50,
    category: 'special',
  },
  {
    key: 'points_100',
    name: 'First Steps',
    description: 'Earn 100 meters',
    icon: '🚀',
    pointsReward: 10,
    category: 'points',
  },
  {
    key: 'streak_7',
    name: 'Week Warrior',
    description: '7-day visit streak',
    icon: '🔥',
    pointsReward: 100,
    category: 'streak',
  },
  {
    key: 'referrer_1',
    name: 'Friendly',
    description: 'Invite your first friend',
    icon: '🤝',
    pointsReward: 25,
    category: 'social',
  },
  {
    key: 'first_nft',
    name: 'Collector',
    description: 'Own your first NFT',
    icon: '🎨',
    pointsReward: 50,
    category: 'nft',
  },
  {
    key: 'top_100',
    name: 'Rising Star',
    description: 'Reach the top 100',
    icon: '⭐',
    pointsReward: 250,
    category: 'leaderboard',
  },
  {
    key: 'points_1000',
    name: 'Climber',
    description: 'Earn 1,000 meters',
    icon: '⛰️',
    pointsReward: 50,
    category: 'points',
  },
  {
    key: 'streak_30',
    name: 'Dedicated',
    description: '30-day visit streak',
    icon: '💪',
    pointsReward: 500,
    category: 'streak',
  },
];

async function main() {
  console.log('Cleaning old achievements...');

  // Delete all user achievements first (foreign key constraint)
  await prisma.userAchievement.deleteMany({});

  // Delete all achievements
  await prisma.achievement.deleteMany({});

  console.log('Seeding 8 achievements...');

  for (const achievement of achievements) {
    await prisma.achievement.create({
      data: achievement,
    });
    console.log(`  + ${achievement.icon} ${achievement.name}`);
  }

  console.log(`\nSeeded ${achievements.length} achievements`);

  // Re-award wallet achievement to users with wallets
  const walletAchievement = await prisma.achievement.findUnique({
    where: { key: 'wallet_connected' }
  });

  if (walletAchievement) {
    const usersWithWallet = await prisma.user.findMany({
      where: { walletAddress: { not: null } },
      select: { id: true, username: true }
    });

    console.log(`\nRe-awarding wallet achievement to ${usersWithWallet.length} users...`);

    for (const user of usersWithWallet) {
      await prisma.userAchievement.create({
        data: {
          userId: user.id,
          achievementId: walletAchievement.id,
          notified: true
        }
      });
      console.log(`  + ${user.username || 'user'}`);
    }
  }

  // Sync NFT collections from metadata.json
  console.log('\n--- Syncing NFT Collections ---');
  try {
    const collectionSync = new CollectionSyncService(prisma);
    const syncResult = await collectionSync.syncCollections();

    console.log(`Collections synced:`);
    console.log(`  + Created: ${syncResult.created}`);
    console.log(`  + Updated: ${syncResult.updated}`);
    console.log(`  + Skipped: ${syncResult.skipped}`);
    console.log(`  + Total: ${syncResult.total}`);

    if (syncResult.errors.length > 0) {
      console.log(`  ! Errors: ${syncResult.errors.length}`);
    }

    // Show metadata stats
    const stats = collectionSync.getMetadataStats();
    console.log(`\nMetadata stats:`);
    console.log(`  Collections: ${stats.totalCollections}`);
    console.log(`  Brands: ${stats.totalBrands}`);
    console.log(`  By tier:`, stats.byTier);
  } catch (error) {
    console.warn('Collection sync skipped (metadata.json not found or error):', error);
  }
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

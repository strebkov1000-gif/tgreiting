import { PrismaClient } from '@prisma/client';

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
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

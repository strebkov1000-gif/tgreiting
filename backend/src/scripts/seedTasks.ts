import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tasks = [
  {
    key: 'subscribe_ice_creators',
    title: 'Subscribe to Ice Creators',
    description: 'Join Ice Creators channel',
    reward: 50,
    type: 'telegram_channel',
    targetId: 'ice_creators',
    targetUrl: 'https://t.me/ice_creators',
    icon: 'telegram',
    sortOrder: 1
  },
  {
    key: 'subscribe_nftcol',
    title: 'Subscribe to NFTcol',
    description: 'Join NFTcol channel',
    reward: 50,
    type: 'telegram_channel',
    targetId: 'nftcol',
    targetUrl: 'https://t.me/nftcol',
    icon: 'telegram',
    sortOrder: 2
  }
];

async function seedTasks() {
  console.log('Seeding tasks...');

  for (const task of tasks) {
    const existing = await prisma.socialTask.findUnique({
      where: { key: task.key }
    });

    if (existing) {
      console.log(`Task "${task.key}" already exists, updating...`);
      await prisma.socialTask.update({
        where: { key: task.key },
        data: task
      });
    } else {
      console.log(`Creating task "${task.key}"...`);
      await prisma.socialTask.create({
        data: task
      });
    }
  }

  // List all tasks
  const allTasks = await prisma.socialTask.findMany();
  console.log('\nAll tasks in database:');
  allTasks.forEach(t => {
    console.log(`  - ${t.key}: ${t.title} (targetId: ${t.targetId}, active: ${t.isActive})`);
  });

  console.log('\nTasks seeded successfully!');
}

seedTasks()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

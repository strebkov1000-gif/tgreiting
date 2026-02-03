import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser(username: string) {
  const user = await prisma.user.findFirst({
    where: { username },
    include: {
      nfts: {
        include: {
          nft: {
            include: {
              collection: true
            }
          }
        }
      },
      _count: {
        select: {
          referrals: true,
          achievements: true
        }
      }
    }
  });

  if (!user) {
    console.log('User not found:', username);
    return;
  }

  console.log('=== User:', username, '===');
  console.log('Total Points:', user.totalPoints);
  console.log('NFT Count (field):', user.nftCount);
  console.log('NFTs in DB:', user.nfts.length);
  console.log('Wallet:', user.walletAddress ? user.walletAddress.slice(0,20) + '...' : 'Not connected');
  console.log('Referrals:', user._count.referrals);
  console.log('Achievements:', user._count.achievements);
  console.log('');

  if (user.nfts.length > 0) {
    console.log('NFTs:');
    user.nfts.forEach((un, i) => {
      console.log('  ' + (i+1) + '.', un.nft.name || 'Unknown');
      console.log('     Collection:', un.nft.collection.name);
      console.log('     Points:', un.pointsAwarded);
    });
  } else {
    console.log('No NFTs detected');
  }

  await prisma.$disconnect();
}

const username = process.argv[2] || 'namewasntdrown';
checkUser(username);

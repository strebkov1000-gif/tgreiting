import axios from 'axios';
import { getMetadataParser } from '../src/services/metadata/MetadataParser.js';
import { Address } from '@ton/core';

const walletAddress = process.argv[2] || '0:95790ceb1528a719a5b22a1ad1eddb5fdd15cc8cc08ae0a1467a1ecf8ff3d7a7';

function normalize(addr: string): string {
  try {
    return Address.parse(addr).toRawString().toLowerCase();
  } catch {
    return addr.toLowerCase();
  }
}

async function checkWallet() {
  // Get NFTs from TON API
  console.log('Fetching NFTs from TON API...');
  console.log('Wallet:', walletAddress);
  console.log('');

  const response = await axios.get(`https://tonapi.io/v2/accounts/${walletAddress}/nfts`, {
    params: { limit: 100 }
  });

  const nfts = response.data.nft_items || [];
  console.log('Total NFTs in wallet:', nfts.length);

  // Get our metadata whitelist
  const parser = getMetadataParser();
  const metadataAddresses = parser.getCollectionAddresses();
  console.log('Collections in metadata.json:', metadataAddresses.length);

  const metadataNormalized = new Set(metadataAddresses.map(a => normalize(a)));

  // Group NFTs by collection
  const byCollection = new Map<string, any[]>();
  for (const nft of nfts) {
    const collAddr = nft.collection?.address || 'no-collection';
    const existing = byCollection.get(collAddr) || [];
    existing.push(nft);
    byCollection.set(collAddr, existing);
  }

  console.log('');
  console.log('NFTs by collection:');
  console.log('-------------------');

  let whitelistedCount = 0;
  let notWhitelistedCount = 0;

  for (const [collAddr, items] of byCollection) {
    const normalized = normalize(collAddr);
    const isWhitelisted = metadataNormalized.has(normalized);
    const status = isWhitelisted ? '✓' : '✗';
    const collName = items[0]?.collection?.name || 'Unknown';

    console.log(`${status} ${collName} (${items.length} NFTs)`);

    if (isWhitelisted) {
      whitelistedCount += items.length;
    } else {
      notWhitelistedCount += items.length;
      if (collAddr !== 'no-collection') {
        console.log(`   addr: ${collAddr}`);
      }
    }
  }

  console.log('');
  console.log('Summary:');
  console.log('  Whitelisted NFTs:', whitelistedCount);
  console.log('  Not whitelisted:', notWhitelistedCount);
}

checkWallet().catch(console.error);

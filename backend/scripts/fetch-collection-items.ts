import axios from 'axios';

const collections = [
  { addr: '0:7c422c92a83327f34877506e56ed09f267a48bf9f13b4bd81ea127e9d98f5f4a', name: 'Retro Pixel' },
  { addr: '0:f8140c0cfb30d072881d46255a6a785ae2e13814a1663ff5c592c264287de490', name: 'Error Pixel' },
  { addr: '0:17a28092e00034efe259a97ec1a19f227236086e087e4796c28c5765301fd6a7', name: 'Pixanos' },
  { addr: '0:d48d7691125843481df14b3f86cfc9c54bb1e8a8aa96d1f59efd165882d02971', name: 'Cute pack' },
  { addr: '0:01235c9f25f11623c3f8358658f05c2c3d23a58815f9369a71d52178a230fd96', name: 'Not Coin' },
  { addr: '0:36f9040959a3e88dc63d01e5594d38b2251389dd651caacd51b18fc6f2e78fab', name: 'Moonbirds Originals' },
  { addr: '0:2e1aa986dbf0820140bf464893796b0be0e16a6ef299ea6b1ce43445bdd445cd', name: 'Bored Ape Originals' },
  { addr: '0:8dc0432ddc0585180f1ba0eef91f826346a2f76eb94f4213c4278e381cf0b6ee', name: 'Doodles Dark Mode' },
  { addr: '0:847f5ebba3be3e4fd8e85d898a34543fbe193491d9d7bc7945533489aa43dbae', name: 'Pengu x Baby Shark' },
  { addr: '0:17fc1520ce908eaf2263c8dfda810cd115b833047227f9fc68b27bdee8f00e04', name: 'OG Icons' },
  { addr: '0:968a53956057239dface0f2cabb0b04fe64c455100a5006bc5d2ceb8fbe3c20f', name: 'Pengu x NASCAR' },
  { addr: '0:db6506e2f869445f4ff5c0faf8eb1a3b43b4dc473cf1f0bd234c6590bb528516', name: 'GMI' },
  { addr: '0:aa7c6933b8ce10e59ef579013cffd337bf5d7bf12abf683537a29c12c82ac44c', name: 'NGMI' },
  { addr: '0:5692b335865bb86fe6ec54b74fa132bf6e213e7a7b90fb0db832a8b27e7a2cd6', name: 'Full dig' },
  { addr: '0:d585fe7a8643f50b2ad3e81aee561b19e37271cce2200395ed4863a3adfa4a09', name: 'Witch' },
  { addr: '0:046d8fb4eddbcbe3211e6c7c4debff894ff2249fcb892b3491066974b1e0bec5', name: 'King' },
];

async function main() {
  for (const col of collections) {
    try {
      // Try to get NFT count from items endpoint
      const res = await axios.get(`https://tonapi.io/v2/nfts/collections/${col.addr}/items`, {
        params: { limit: 1 }
      });
      // The response may have a count or we check owner count
      const collRes = await axios.get(`https://tonapi.io/v2/nfts/collections/${col.addr}`);
      const data = collRes.data;
      console.log(JSON.stringify({
        name: col.name,
        owner_count: data.owner_count || 0,
        next_item_index: data.next_item_index,
        address: col.addr
      }));
    } catch (e: any) {
      console.log(JSON.stringify({ name: col.name, error: true, address: col.addr }));
    }
    await new Promise(r => setTimeout(r, 300));
  }
}
main();

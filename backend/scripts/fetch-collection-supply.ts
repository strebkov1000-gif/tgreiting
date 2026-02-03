import axios from 'axios';

const collections = [
  '0:f56156f01b974d57d959833d7c178723066e62a985f2794a9d19edb52578ec2c',
  '0:3edc4f5ce95eb63a1b54f6ef8838d298b2570000fb7574e7ed45680fb0a8dfb2',
  '0:7c422c92a83327f34877506e56ed09f267a48bf9f13b4bd81ea127e9d98f5f4a',
  '0:f8140c0cfb30d072881d46255a6a785ae2e13814a1663ff5c592c264287de490',
  '0:17a28092e00034efe259a97ec1a19f227236086e087e4796c28c5765301fd6a7',
  '0:d48d7691125843481df14b3f86cfc9c54bb1e8a8aa96d1f59efd165882d02971',
  '0:01235c9f25f11623c3f8358658f05c2c3d23a58815f9369a71d52178a230fd96',
  '0:36f9040959a3e88dc63d01e5594d38b2251389dd651caacd51b18fc6f2e78fab',
  '0:2e1aa986dbf0820140bf464893796b0be0e16a6ef299ea6b1ce43445bdd445cd',
  '0:8dc0432ddc0585180f1ba0eef91f826346a2f76eb94f4213c4278e381cf0b6ee',
  '0:847f5ebba3be3e4fd8e85d898a34543fbe193491d9d7bc7945533489aa43dbae',
  '0:17fc1520ce908eaf2263c8dfda810cd115b833047227f9fc68b27bdee8f00e04',
  '0:968a53956057239dface0f2cabb0b04fe64c455100a5006bc5d2ceb8fbe3c20f',
  '0:db6506e2f869445f4ff5c0faf8eb1a3b43b4dc473cf1f0bd234c6590bb528516',
  '0:aa7c6933b8ce10e59ef579013cffd337bf5d7bf12abf683537a29c12c82ac44c',
  '0:5692b335865bb86fe6ec54b74fa132bf6e213e7a7b90fb0db832a8b27e7a2cd6',
  '0:d585fe7a8643f50b2ad3e81aee561b19e37271cce2200395ed4863a3adfa4a09',
  '0:046d8fb4eddbcbe3211e6c7c4debff894ff2249fcb892b3491066974b1e0bec5',
];

async function main() {
  for (const addr of collections) {
    try {
      const res = await axios.get('https://tonapi.io/v2/nfts/collections/' + addr);
      const data = res.data;
      console.log(JSON.stringify({
        name: data.metadata?.name || 'Unknown',
        supply: data.next_item_index || 0,
        address: addr
      }));
    } catch (e: any) {
      console.error('Error:', addr);
    }
    await new Promise(r => setTimeout(r, 300));
  }
}
main();

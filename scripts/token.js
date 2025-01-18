const { Connection, PublicKey } = require('@solana/web3.js');
const { AccountLayout } = require('@solana/spl-token');
const mpl = require("@metaplex-foundation/mpl-token-metadata");
const { Metadata } = require("@metaplex-foundation/mpl-token-metadata");
const { Metaplex } = require('@metaplex-foundation/js')


async function getTokenMetadata(tokenMint) {
  // Connect to Solana mainnet
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const metaplex = Metaplex.make(connection);
  const metadataPda = metaplex.nfts().pdas().metadata({ mint: tokenMint });
  console.log(metadataPda)

  const metadata = await metaplex.nfts().findByMint({ mintAddress: tokenMint })
  console.log(`Name: ${metadata.json.name}, Symbol: ${metadata.json.symbol}`)
}

const tokenMint = new PublicKey('565mhYaFRRZAaHoZC7zaGE1eUhG7ZphuGa9eBKvppump');
getTokenMetadata(tokenMint);
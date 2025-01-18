const { Connection, PublicKey } = require('@solana/web3.js');
const { Metaplex } = require('@metaplex-foundation/js')

async function getTransactionDetails(signature) {
  // Connect to Solana mainnet
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const metaplex = Metaplex.make(connection);

  // Get parsed transaction details
  const tx = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed'
  });

  /** @type {PublicKey} **/
  const tokenMint = tx.transaction.message.instructions[2].accounts[9]
  console.log("Token pubkey: ", tokenMint.toString())

  const metadata = await metaplex.nfts().findByMint({ mintAddress: tokenMint })
  console.log(`Name: ${metadata.json.name}, Symbol: ${metadata.json.symbol}`)

}

// The transaction signature to look up
const signature = '26ykKn9t1GEP66DqcFvAbpSetYwyiyHrytaphmwy3FwceLr834eRsTUzbZ9PqocVc2BUM1yrw9cqTKwVRtVDfmT1';

getTransactionDetails(signature);
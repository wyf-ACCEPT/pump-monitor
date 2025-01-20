const { Connection, PublicKey } = require('@solana/web3.js');
const { Metaplex } = require('@metaplex-foundation/js')
require('dotenv').config()

async function getTransactionDetails(signature) {
  // Connect to Solana mainnet
  const connection = new Connection(process.env.SOLANA_RPC, 'confirmed');
  const metaplex = Metaplex.make(connection);

  // Get parsed transaction details
  const tx = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed'
  });
  console.log(tx)

  /** @type {PublicKey} **/
  const tokenMint = tx.transaction.message.instructions[2].accounts[9]
  console.log("Token pubkey: ", tokenMint.toString())

  const metadata = await metaplex.nfts().findByMint({ mintAddress: tokenMint })
  console.log(`Name: ${metadata.json.name}, Symbol: ${metadata.json.symbol}`)

}

// The transaction signature to look up
const signature = '4eN5kWa7PsrMEJSYkCYFSm5ZkdnPiEyemtt6eEciKTuPRKRa93ZEw1b1Tzxi4snt3yZtnbruq9X8oS4J3EyzNUYP';

getTransactionDetails(signature);
const { Connection, PublicKey, ParsedTransactionWithMeta } = require('@solana/web3.js');
const { Metaplex } = require('@metaplex-foundation/js')

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const metaplex = Metaplex.make(connection);

const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function now() {
  const timestamp = new Date().toISOString().replace('T', ' ').replace('Z', '').replace(/\.\d{3}/, '');
  return `[${YELLOW}${timestamp}${RESET}]`
}

/** @param {ParsedTransactionWithMeta} tx */
async function processParsedTransaction(tx) {
  /** @type {PublicKey} **/
  const tokenMint = tx.transaction.message.instructions[2].accounts[9]
  console.log(`${now()} Token pubkey: ${tokenMint.toString()}`);

  metaplex.nfts().findByMint({ mintAddress: tokenMint })
    .then((metadata) => {
      console.log(`${now()} Name: ${GREEN}${metadata.json.name}${RESET}, Symbol: ${GREEN}${metadata.json.symbol}${RESET}`)
    })
    .catch((error) => {
      console.error(`${now()} ${RED}Error fetching metadata${RESET}: ${error}`)
    })
}

async function monitorTransfers(addressToMonitor) {
  // Connect to Solana network (mainnet-beta)
  const pubKey = new PublicKey(addressToMonitor);

  // Subscribe to all transactions for the address
  console.log(`Start monitoring address: ${addressToMonitor}`);

  connection.onLogs(
    pubKey,
    (logs, _ctx) => {
      const signature = logs.signature

      // Check if logs contain transfer-related events
      if (logs.logs.some(log => log.includes('InitializeInstruction2'))) {
        console.log(`${now()} ✅ Pump emission 🚀 event detected!`);
        console.log(`${now()}   Signature: ${signature}`);
        console.log(`${now()}   Explorer Link: https://solscan.io/tx/${signature}`);

        connection.getParsedTransaction(signature, {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed'
        }).then((tx) => {
          processParsedTransaction(tx, pubKey)
        });
      } else {
        console.log(`${now()} 🗒️  Not pump emission tx: https://solscan.io/tx/${signature}`)
      }
    },
    'confirmed'
  );
}

async function main() {

  connection.getParsedTransaction("2pZ2dMTu2nwGFCzofQex7kT4hKYhG9eJAqFGM3NPJaZZ4tGhi3p8QaH51kQifDbUrowQYAkfS5D8LzGTBGvMD9uX", {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed'
  }).then((tx) => processParsedTransaction(tx))

  try {
    // Address to monitor
    const ADDRESS_TO_MONITOR = '39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg';
    await monitorTransfers(ADDRESS_TO_MONITOR);

    // Keep the process running
    process.on('SIGINT', () => {
      console.log('Monitoring stopped');
      process.exit();
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
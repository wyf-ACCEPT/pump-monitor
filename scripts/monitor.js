const { Connection, PublicKey, ParsedTransactionWithMeta } = require('@solana/web3.js');
const { Metaplex } = require('@metaplex-foundation/js')
const axios = require('axios');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const metaplex = Metaplex.make(connection);

const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function now() {
  const timestamp = new Date().toISOString().replace('T', ' ').replace('Z', '').replace(/\.\d{3}/, '');
  return `⏰ ${timestamp}`
}

async function sendMessage(text) {
  try {
    await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      params: {
        chat_id: CHAT_ID,
        text,
        parse_mode: 'HTML'
      }
    });
  } catch (error) {
    console.error('Telegram error:', error.message);
  }
}

/** @param {ParsedTransactionWithMeta} tx */
async function processParsedTransaction(tx) {
  /** @type {PublicKey} **/
  const tokenMint = tx.transaction.message.instructions[2].accounts[9]
  console.log(`${now()} Token pubkey: ${tokenMint.toString()}`);

  metaplex.nfts().findByMint({ mintAddress: tokenMint })
    .then((metadata) => {
      console.log(`${now()} Name: ${GREEN}${metadata.json.name}${RESET}, Symbol: ${GREEN}${metadata.json.symbol}${RESET}`)
      const tokenAddress = tokenMint.toString()
      sendMessage(
        `${now()}\n` +
        `🟩 Token address: <a href="https://solscan.io/token/${tokenAddress}">${tokenAddress}</a>\n` +
        `🟦 Name: ${metadata.json.name}, Symbol: ${metadata.json.symbol}`
      )
    })
    .catch((error) => {
      console.error(`${now()} ${RED}Error fetching metadata${RESET}: ${error}`)
    })
}

async function monitorTransfers(addressToMonitor) {
  const pubKey = new PublicKey(addressToMonitor);
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

        sendMessage(
          `${now()}\n` +
          `✅ Pump emission 🚀 event detected!\n` +
          `🔗 Explorer Link: https://solscan.io/tx/${signature}`
        )

        connection.getParsedTransaction(signature, {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed'
        }).then((tx) => {
          processParsedTransaction(tx, pubKey)
        });
      } else {
        console.log(`${now()} 🗒️  Not pump emission tx: https://solscan.io/tx/${signature}`)
        sendMessage(
          `${now()}\n` +
          `🗒️ Not pump emission tx: https://solscan.io/tx/${signature}`
        )
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
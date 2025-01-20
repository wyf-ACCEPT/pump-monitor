const { Connection, PublicKey, ParsedTransactionWithMeta } = require('@solana/web3.js');
const { Metaplex } = require('@metaplex-foundation/js')
const axios = require('axios');
require('dotenv').config();

const PUMP_MIGRATION = "39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const TARGET_SYMBOL = "argo"

const connection = new Connection(
  process.env.SOLANA_RPC, { 
    commitment: 'confirmed',
    wsEndpoint: process.env.SOLANA_RPC_WSS
  }
);
const metaplex = Metaplex.make(connection);

function now() {
  const date = new Date()
  date.setHours(date.getHours() + 8)    // UTC+8
  return date.toISOString().replace('T', ' ').replace('Z', '').replace(/\.\d{3}/, '');
}

function consoleNow() {
  return `[${now()}]`
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
    console.log(`${consoleNow()} Message sent.`)
  } catch (error) {
    console.error(`${consoleNow()} Telegram error:`, error.message);
  }
}

/** 
 * @param {string} signature 
 * @param {number} retryCount 
 * @returns {Promise<ParsedTransactionWithMeta | null>}
*/
async function getTransaction(signature, retryCount = 0) {
  try {
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed'
    });

    if (!tx || !tx.transaction) {
      if (retryCount < 10) {
        console.log(`${consoleNow()} Transaction not found, retrying in 3s... (attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        return getTransaction(signature, retryCount + 1);
      } else {
        console.error(`${consoleNow()} Failed to get transaction after ${retryCount} attempts`);
        sendMessage(`⏰ ${now()} Failed to get transaction after ${retryCount} attempts`);
        return null;
      }
    }

    return tx;
  } catch (error) {
    console.error(`${consoleNow()} Error fetching transaction:`, error);
    return null;
  }
}


/** @param {ParsedTransactionWithMeta} tx */
async function processParsedTransaction(tx) {
  /** @type {PublicKey} **/
  const tokenMint = tx.transaction.message.instructions[2].accounts[9]
  console.log(`${consoleNow()} Token pubkey: ${tokenMint.toString()}`);

  metaplex.nfts().findByMint({ mintAddress: tokenMint })
    .then((metadata) => {
      console.log(`${consoleNow()} Name: "${metadata.json.name}", Symbol: "${metadata.json.symbol}"`)
      const tokenAddress = tokenMint.toString()
      sendMessage(
        `⏰ ${now()}\n` +
        `🟦 Name: ${metadata.json.name}, Symbol: ${metadata.json.symbol}\n` + 
        `🟩 Token address: <a href="https://gmgn.ai/sol/token/${tokenAddress}">${tokenAddress}</a>`
      )
      if (metadata.json.name.toLowerCase().includes(TARGET_SYMBOL) || metadata.json.symbol.toLowerCase().includes(TARGET_SYMBOL)) {
        for (let i = 0; i < 5; i++) {
          sendMessage(
            `⏰ ${now()}\n` +
            `🟥 Strong alert! ${metadata.json.symbol} (${metadata.json.name}) is pumpable!`
          )
        }
      }
    })
    .catch((error) => {
      console.error(`${consoleNow()} Error fetching metadata: ${error}`)
    })
}

async function monitorTransfers(addressToMonitor) {
  const pubKey = new PublicKey(addressToMonitor);
  console.log(`${consoleNow()} Start monitoring address: ${addressToMonitor}`);

  connection.onLogs(
    pubKey,
    (logs, _ctx) => {
      const signature = logs.signature

      // Check if logs contain transfer-related events
      if (logs.logs.some(log => log.includes('InitializeInstruction2'))) {
        console.log(`${consoleNow()} ✅ Pump emission 🚀 event detected!`);
        console.log(`${consoleNow()}   Signature: ${signature}`);
        console.log(`${consoleNow()}   Explorer Link: https://solscan.io/tx/${signature}`);
        sendMessage(
          `⏰ ${now()}\n` +
          `✅ Pump emission 🚀 event detected!\n` +
          `🔗 Solscan <a href="https://solscan.io/tx/${signature}">Link</a>`
        )
        getTransaction(signature).then((tx) => {
          processParsedTransaction(tx)
        });

      } else {
        console.log(`${consoleNow()} 🗒️  Not pump emission tx: https://solscan.io/tx/${signature}`)
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

  setInterval(() => {
    console.log(`${consoleNow()} ⬜️ Server still running.`)
    sendMessage(
      `⏰ ${now()}\n` +
      `⬜️ Server still running.`
    )
  }, 60 * 60 * 1000) // 1 hour

  try {
    // Address to monitor
    await monitorTransfers(PUMP_MIGRATION);

    // Keep the process running
    process.on('SIGINT', () => {
      console.log(`${consoleNow()} Monitoring stopped`);
      process.exit();
    });
  } catch (error) {
    console.error(`${consoleNow()} Error:`, error);
  }
}

main();
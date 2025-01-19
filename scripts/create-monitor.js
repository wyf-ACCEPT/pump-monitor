const { Connection, PublicKey, ParsedTransactionWithMeta } = require('@solana/web3.js');
const { Metaplex } = require('@metaplex-foundation/js')
const axios = require('axios');
require('dotenv').config();

const PUMP_FUN = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_CREATION;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const TARGET_SYMBOL = "ai3"

const connection = new Connection(
  process.env.SOLANA_RPC, { 
    commitment: 'confirmed',
    wsEndpoint: process.env.SOLANA_RPC_WSS
  }
);
const metaplex = Metaplex.make(connection);

const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

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
  const tokenMint = tx.transaction.message.instructions
    .filter(x => x.programId.toString() == PUMP_FUN)[0].accounts[0]
  console.log(`${consoleNow()} Token pubkey: ${tokenMint.toString()}`);

  metaplex.nfts().findByMint({ mintAddress: tokenMint })
    .then((metadata) => {
      console.log(`${consoleNow()} Name: "${metadata.json.name}", Symbol: "${metadata.json.symbol}"`)
      const tokenAddress = tokenMint.toString()
      sendMessage(
        `⏰ ${now()}\n` +
        `🟦 New token: <a href="https://gmgn.ai/sol/token/${tokenAddress}">${metadata.json.name}</a> (${metadata.json.symbol})\n`
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

async function monitorCreate(addressToMonitor) {
  const pubKey = new PublicKey(addressToMonitor);
  console.log(`${consoleNow()} Start monitoring address: ${addressToMonitor}`);

  connection.onLogs(
    pubKey,
    (logs, _ctx) => {
      const signature = logs.signature

      // Check if logs contain transfer-related events
      if (logs.logs.some(log => log == 'Program log: Instruction: Create')) {
        console.log(`\n${consoleNow()} ✅ Pump creation 📨 event detected!`);
        console.log(`${consoleNow()}   Signature: ${signature}`);
        console.log(`${consoleNow()}   Explorer Link: https://solscan.io/tx/${signature}`);
        getTransaction(signature).then((tx) => {
          processParsedTransaction(tx)
        });
      }
    },
    'confirmed',
  );
}

async function main() {
  try {
    // Address to monitor
    await monitorCreate(PUMP_FUN);

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
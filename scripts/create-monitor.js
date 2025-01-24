const { Connection, PublicKey, ParsedTransactionWithMeta } = require('@solana/web3.js');
const { Metaplex } = require('@metaplex-foundation/js')
const axios = require('axios');
const { buyToken } = require('./buy');
require('dotenv').config();

const PUMP_FUN = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"

const BUY_AMOUNT = 200_000_000n   // 0.2 SOL
const SLIPPAGE_BASE_POINT = 3000n   // 30%

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_CREATION;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const JUSTIN_CHAT_ID = process.env.JUSTIN_CHAT_ID;

const TARGET_SYMBOL = "argo"

let repeatFlag = 3

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

async function sendMessage(text, chatId) {
  try {
    await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      params: {
        chat_id: chatId,
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
        console.log(`${consoleNow()} Transaction not found, retrying in 5s... (attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 1000));
        return getTransaction(signature, retryCount + 1);
      } else if (retryCount < 13) {
        console.log(`${consoleNow()} Transaction not found, retrying in 60s... (attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 60000 + Math.random() * 10000));
        return getTransaction(signature, retryCount + 1);
      } else {
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

      const tokenAddress = tokenMint.toString()
      console.log(`${consoleNow()} Name: "${metadata.json.name}", Symbol: "${metadata.json.symbol}", Address: ${tokenAddress}`)

      if (metadata.json.name.toLowerCase().includes('arg') || metadata.json.symbol.toLowerCase().includes('arg')) {
        const message = 
          `⏰ ${now()}\n` +
          `🟨 Weak alert: "${metadata.json.symbol}" ("${metadata.json.name}") is issued.\n` +
          `🟨 Token: <a href="https://gmgn.ai/sol/token/${tokenAddress}">${metadata.json.name}</a> (${metadata.json.symbol})\n`
        sendMessage(message, CHAT_ID);
        sendMessage(message, JUSTIN_CHAT_ID);
      }

      if (metadata.json.name.toLowerCase().includes(TARGET_SYMBOL) || metadata.json.symbol.toLowerCase().includes(TARGET_SYMBOL)) {
        const message = 
          `⏰ ${now()}\n` +
          `🟥 Strong alert (maybe target): "${metadata.json.symbol}" ("${metadata.json.name}") is issued.\n` +
          `🟥 Token: <a href="https://gmgn.ai/sol/token/${tokenAddress}">${metadata.json.name}</a> (${metadata.json.symbol})\n`
        sendMessage(message, CHAT_ID);
        sendMessage(message, JUSTIN_CHAT_ID);
      }

      if (metadata.json.name.toLowerCase() == TARGET_SYMBOL || metadata.json.symbol.toLowerCase() == TARGET_SYMBOL) {
        console.log(`${consoleNow()} Name: "${metadata.json.name}", Symbol: "${metadata.json.symbol}"`)
        for (let i = 0; i < 5; i++) {
          const message = 
            `⏰ ${now()}\n` +
            `🟥🟥 Strong alert!! "${metadata.json.symbol}" ("${metadata.json.name}") is issued!\n` +
            `🟥🟥 Token: <a href="https://gmgn.ai/sol/token/${tokenAddress}">${metadata.json.name}</a> (${metadata.json.symbol})\n`
          sendMessage(message, CHAT_ID);
          sendMessage(message, JUSTIN_CHAT_ID);
        }

        if (repeatFlag > 0) {
          try {
            buyToken(tokenAddress, BUY_AMOUNT, SLIPPAGE_BASE_POINT)
            .then(tx => {
              sendMessage(`Buy in finished.`, CHAT_ID);
              const message = `⏰ ${now()}\n` + 
                `Buy in: <a href="https://solscan.io/tx/${tx.signature}">${tx.signature}</a>`
              sendMessage(message, CHAT_ID);
              sendMessage(message, JUSTIN_CHAT_ID);
              console.log(`${consoleNow()} Buy in: ${tx.signature}`)
            })
            .catch(_ => {
              sendMessage("1st buy-in failed, retrying...", CHAT_ID);
              buyToken(tokenAddress, BUY_AMOUNT, SLIPPAGE_BASE_POINT * 3)
                .then(tx => {
                  sendMessage("2nd buy-in finished.", CHAT_ID);
                  const message = `⏰ ${now()}\n` + 
                    `Buy in: <a href="https://solscan.io/tx/${tx.signature}">${tx.signature}</a>`
                  sendMessage(message, CHAT_ID);
                  sendMessage(message, JUSTIN_CHAT_ID);
                  console.log(`${consoleNow()} Buy in: ${tx.signature}`)
                })
                .catch(_ => {
                  sendMessage("2nd buy-in failed, please manually buy in.", CHAT_ID);
                })
            })
          } catch (error) {
            console.error(`${consoleNow()} Error buying token: ${error}`)
            sendMessage(`${consoleNow()} Error buying token: ${error}`, CHAT_ID);
          }
          repeatFlag -= 1
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
          if (tx) {
            processParsedTransaction(tx)
          } else {
            const message = 
              `⏰ ${now()}\n` +
              `📴 Failed to get <a href="https://solscan.io/tx/${signature}">transaction</a> after 13 attempts.` +
              `Please check the transaction manually.`
            sendMessage(message, CHAT_ID);
            sendMessage(message, JUSTIN_CHAT_ID);
          }
        });
      }
    },
    'confirmed',
  );
}

async function main() {
  setInterval(() => {
    console.log(`${consoleNow()} ⬜️ Server still running.`)
    const message = 
      `⏰ ${now()}\n` +
      `⬜️ Server still running.`
    sendMessage(message, CHAT_ID);
    sendMessage(message, JUSTIN_CHAT_ID);
  }, 60 * 60 * 1000) // 1 hour

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
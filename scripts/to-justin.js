const axios = require('axios');
const { buyToken } = require('./buy');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_CREATION;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const JUSTIN_CHAT_ID = process.env.JUSTIN_CHAT_ID;  

function now() {
  const date = new Date()
  date.setHours(date.getHours() + 8)    // UTC+8
  return date.toISOString().replace('T', ' ').replace('Z', '').replace(/\.\d{3}/, '');
}

function consoleNow() {
  return `[${now()}]`
}

// async function sendMessage(text, chatId) {
//   try {
//     await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
//       params: {
//         chat_id: chatId,
//         text,
//         parse_mode: 'HTML'
//       }
//     });
//     console.log(`${consoleNow()} Message sent.`)
//   } catch (error) {
//     console.error(`${consoleNow()} Telegram error:`, error.message);
//   }
// }

// sendMessage("Hello", CHAT_ID);
// sendMessage("Hello", JUSTIN_CHAT_ID);

// buyToken(
//   'AdmyZDPbuDxHS2D5tEBv35RiqPe6ebRUmbWMSbzZpump',
//   100_000_000n, // 0.1 SOL
//   2000n,
// ).catch(console.error);


let repeatFlag = 3

async function testHere() {
  repeatFlag -= 1
  console.log(repeatFlag)
}

testHere()
testHere()
testHere()

const axios = require('axios');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendMessage(text) {
  console.log(BOT_TOKEN, CHAT_ID)
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

sendMessage('Hello World!')


// const TelegramBot = require('node-telegram-bot-api');
// require('dotenv').config();

// const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// bot.on('message', (msg) => {
//   console.log('Chat ID:', msg.chat.id);
//   console.log('User ID:', msg.from.id);
//   console.log('Chat Type:', msg.chat.type); // 'private', 'group', 'supergroup' 或 'channel'
// });
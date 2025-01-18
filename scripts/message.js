const axios = require('axios');

const BOT_TOKEN = 'your_bot_token';
const CHAT_ID = 'your_chat_id';

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

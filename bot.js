const TelegramBot = require('node-telegram-bot-api');
const AlertDiff = require('./alert_diff.js');
const mysql = require('mysql');


const TELEGRAM_CHAT_ID = 8834684;
const TELEGRAM_BOT_TOKEN = '423299318:AAGSZaf9hy8_KNy2QAtLebSA_9uJovuc4sU';

let userSettings = {
  chatId: TELEGRAM_CHAT_ID,
  coins: ['PAY', 'EOS', 'SNT', 'FUN', 'ADX', 'BAT', 'OMG', 'NET', 'BNT'],
  blacklist: ['OMG', 'BAT'],
  arbitrageAlert: true,
  etherdeltaDiffAlert: true
};

let pool = mysql.createPool({
  host: 'localhost',
  user: 'andres',
  password: 'wena',
  database: 'crypto'
});

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {polling: true});


bot.onText(/toggle ethdelta diff/, (msg, match) => {
  if (msg.chat.id == TELEGRAM_CHAT_ID) {
    userSettings.etherdeltaDiffAlert = !userSettings.etherdeltaDiffAlert;
    let currentState = (userSettings.etherdeltaDiffAlert) ? 'ON' : 'OFF';
    bot.sendMessage(userSettings.chatId, 'Ok, now it is ' + currentState);
  }
});

bot.onText(/toggle arbitrage/, (msg, match) => {
  if (msg.chat.id == TELEGRAM_CHAT_ID) {
    userSettings.arbitrageAlert = !userSettings.arbitrageAlert;
    let currentState = (userSettings.arbitrageAlert) ? 'ON' : 'OFF';
    bot.sendMessage(userSettings.chatId, 'Ok, now it is ' + currentState);
  }
});

bot.onText(/add coin (.+)/, (msg, match) => {
  if (msg.chat.id == TELEGRAM_CHAT_ID) {
    const arg = match[1];
    userSettings.coins.push(arg)
    bot.sendMessage(userSettings.chatId, 'Coin added. ' + JSON.stringify(userSettings.coins));
  }
});

bot.onText(/remove coin (.+)/, (msg, match) => {
  if (msg.chat.id == TELEGRAM_CHAT_ID) {
    const arg = match[1];
    let index = userSettings.coins.indexOf(arg);
    if (index > -1) {
      userSettings.blacklist.splice(index, 1);
      bot.sendMessage(userSettings.chatId, 'Coin removed. ' + JSON.stringify(userSettings.coins));
    }
    else {
      bot.sendMessage(userSettings.chatId, 'Mmm not in the list');
    }
  }
});

bot.onText(/remove blacklist (.+)/, (msg, match) => {
  if (msg.chat.id == TELEGRAM_CHAT_ID) {
    const arg = match[1];
    let index = userSettings.blacklist.indexOf(arg);
    if (index > -1) {
      userSettings.blacklist.splice(index, 1);
      bot.sendMessage(userSettings.chatId, 'Ok, removed. ' + JSON.stringify(userSettings.blacklist));
    }
    else {
      bot.sendMessage(userSettings.chatId, 'Mmm not in the list');
    }
  }
});

bot.onText(/blacklist (.+)/, (msg, match) => {
  const arg = match[1];
  userSettings.blacklist.push(arg);
  bot.sendMessage(userSettings.chatId, 'Ok, added. ' + JSON.stringify(userSettings.blacklist));
});

bot.onText(/show coins/, (msg, match) => {
  if (msg.chat.id == TELEGRAM_CHAT_ID) {
    bot.sendMessage(userSettings.chatId, JSON.stringify(userSettings.coins));
  }
});

bot.onText(/show blacklist/, (msg, match) => {
  if (msg.chat.id == TELEGRAM_CHAT_ID) {
    bot.sendMessage(userSettings.chatId, JSON.stringify(userSettings.blacklist));
  }
});

let allCoins = [
  'VERI', 'PPT', 'PAY', 'PLR', 'DICE',
  'XRL', 'EOS', 'SNT', 'FUN', 'BTH',
  'FUCK', 'ADX', 'BAT', 'OMG'
];

AlertDiff.start(pool, bot, userSettings);

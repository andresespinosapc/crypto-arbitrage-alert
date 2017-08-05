const TelegramBot = require('node-telegram-bot-api');
const AlertDiff = require('./alert_diff.js');
const mysql = require('mysql');
const TS = require('./transactor.js');
const websites = require('./websites/exports.js');


let privateKey = Buffer.from(process.env.PRIV, 'hex');
TS.init("https://mainnet.infura.io/" + process.env.INFURA_TOKEN, privateKey);
let myWebsites = {
  etherdelta: new websites.EtherDelta(TS),
  bittrex: new websites.Bittrex(TS, process.env.BITTREX_KEY, process.env.BITTREX_SECRET),
  liqui: new websites.Liqui(TS, process.env.LIQUI_KEY, process.env.LIQUI_SECRET)
}

const TELEGRAM_CHAT_ID = 8834684;
const TELEGRAM_BOT_TOKEN = '423299318:AAGSZaf9hy8_KNy2QAtLebSA_9uJovuc4sU';

let userSettings = {
  chatId: TELEGRAM_CHAT_ID,
  coins: ['PAY', 'EOS', 'SNT', 'FUN', 'ADX', 'BAT', 'OMG', 'NET', 'BNT'],
  blacklist: ['OMG', 'BAT'],
  arbitrageAlert: true,
  etherdeltaDiffAlert: true,
  etherdeltaCheapAlert: true
};

let pool = mysql.createPool({
  host: 'localhost',
  user: 'andres',
  password: 'wena',
  database: 'crypto'
});

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {polling: true});

bot.onText(/move (.+) (.+) from (.+) to (.+)/, (msg, match) => {
  if (msg.chat.id == TELEGRAM_CHAT_ID) {
    let amount = parseFloat(match[1]);
    let token = match[2];
    let initialWebsite = match[3];
    let finalWebsite = match[4];

    TS.moveCoin(myWebsites[initialWebsite], myWebsites[finalWebsite], token, amount, (err) => {
      if (err) bot.sendMessage(userSettings.chatId, err);
      else {
        bot.sendMessage(userSettings.chatId, 'Your coin movement has finished');
      }
    });
  }
});

bot.onText(/withdraw (.+) (.+) from (.+)/, (msg, macth) => {
  if (msg.chat.id == TELEGRAM_CHAT_ID) {
    let amount = parseFloat(match[1]);
    let token = match[2];
    let website = match[3];

    myWebsites[website].withdraw(token, amount, (err) => {
      if (err) bot.sendMessage(userSettings.chatId, err);
      else {
        bot.sendMessage(userSettings.chatId, 'Withdrawal successful');
      }
    });
  }
});

bot.onText(/deposit (.+) (.+) on (.+)/, (msg, macth) => {
  if (msg.chat.id == TELEGRAM_CHAT_ID) {
    let amount = parseFloat(match[1]);
    let token = match[2];
    let website = match[3];

    myWebsites[website].deposit(token, amount, (err) => {
      if (err) bot.sendMessage(userSettings.chatId, err);
      else {
        bot.sendMessage(userSettings.chatId, 'Deposit successful');
      }
    });
  }
});

bot.onText(/order (buy|sell) (.+) (.+) at (.+)/, (msg, match) => {
  if (msg.chat.id == TELEGRAM_CHAT_ID) {
    let direction = match[1];
    let amount = parseFloat(match[2]);
    let token = match[3];
    let price = parseFloat(match[4]);

    myWebsites.etherdelta.order(direction, amount, price, 'ETH', token, 10000, false, (err, orderNonce) => {
      if (err) bot.sendMessage(userSettings.chatId, err);
      else {
        console.log('Order placed with nonce: ' + orderNonce);
        myWebsites.etherdelta.waitForOrder(direction, 'ETH', token, orderNonce, (err) => {
          if (err) bot.sendMessage(userSettings.chatId, err);
          else {
            bot.sendMessage(userSettings.chatId, 'Termino tu orden');
          }
        });
      }
    });
  }
});

bot.onText(/toggle ethdelta cheap/, (msg, match) => {
  if (msg.chat.id == TELEGRAM_CHAT_ID) {
    userSettings.etherdeltaCheapAlert = !userSettings.etherdeltaCheapAlert;
    let currentState = (userSettings.etherdeltaCheapAlert) ? 'ON' : 'OFF';
    bot.sendMessage(userSettings.chatId, 'Ok, now it is ' + currentState);
  }
});

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

AlertDiff.start(pool, bot, userSettings, myWebsites);

const TelegramBot = require('node-telegram-bot-api');
const AlertDiff = require('./alert_diff.js');
const mysql = require('mysql');
const TS = require('./transactor.js');
const websites = require('./websites/exports.js');
const fs = require('fs');
const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_IDS, LIQUI_DEPOSIT_ADDRS } = require('./constants.js');


let privateKey = Buffer.from(process.env.PRIV, 'hex');
TS.init("https://mainnet.infura.io/" + process.env.INFURA_TOKEN, privateKey);
let myWebsites = {
  etherdelta: new websites.EtherDelta(TS),
  bittrex: new websites.Bittrex(TS, process.env.BITTREX_KEY, process.env.BITTREX_SECRET),
  liqui: new websites.Liqui(TS, process.env.LIQUI_KEY, process.env.LIQUI_SECRET, LIQUI_DEPOSIT_ADDRS)
}

let userSettings = {};
userSettings['global'] = JSON.parse(fs.readFileSync('user_settings/global.json', 'utf8'));
TELEGRAM_CHAT_IDS.forEach((chatId) => {
  userSettings[chatId] = JSON.parse(fs.readFileSync(`user_settings/${chatId}.json`, 'utf8'));
});

let pool;
if (process.env.IS_DG) {
  pool = mysql.createPool({
    host: 'localhost',
    user: 'andres',
    password: '3661071a',
    database: 'crypto'
  });
}
else {
  pool = mysql.createPool({
    host: 'localhost',
    user: 'andres',
    password: 'wena',
    database: 'crypto'
  });
}


// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {polling: true});

bot.onText(/move (.+) (.+) from (.+) to (.+)/, (msg, match) => {
  if (msg.chat.id == 8834684) {
    let amount = parseFloat(match[1]);
    let token = match[2];
    let initialWebsite = match[3];
    let finalWebsite = match[4];

    TS.moveCoin(myWebsites[initialWebsite], myWebsites[finalWebsite], token, amount, (err) => {
      if (err) bot.sendMessage(msg.chat.id, err);
      else {
        bot.sendMessage(msg.chat.id, 'Your coin movement has finished');
      }
    });
  }
});

bot.onText(/withdraw (.+) (.+) from (.+)/, (msg, match) => {
  // TEMP
  if (msg.chat.id == TELEGRAM_CHAT_IDS[0]) {
    let amount = parseFloat(match[1]);
    let token = match[2];
    let website = match[3];

    myWebsites[website].withdraw(token, amount, (err) => {
      if (err) bot.sendMessage(msg.chat.id, err);
      else {
        bot.sendMessage(msg.chat.id, 'Withdrawal successful');
      }
    });
  }
});

bot.onText(/deposit (.+) (.+) on (.+)/, (msg, match) => {
  // TEMP
  if (msg.chat.id == TELEGRAM_CHAT_IDS[0]) {
    let amount = parseFloat(match[1]);
    let token = match[2];
    let website = match[3];

    myWebsites[website].deposit(token, amount, (err) => {
      if (err) {
        bot.sendMessage(msg.chat.id, err);
      }
      else {
        bot.sendMessage(msg.chat.id, 'Deposit successful');
      }
    });
  }
});

bot.onText(/order (buy|sell) (.+) (.+) at (.+)/, (msg, match) => {
  // TEMP
  if (msg.chat.id == TELEGRAM_CHAT_IDS[0]) {
    let direction = match[1];
    let amount = parseFloat(match[2]);
    let token = match[3];
    let price = parseFloat(match[4]);

    myWebsites.etherdelta.order(direction, amount, price, 'ETH', token, 10000, false, (err, orderNonce) => {
      if (err) bot.sendMessage(msg.chat.id, err);
      else {
        bot.sendMessage(msg.chat.id, 'Order placed with nonce: ' + orderNonce);
        myWebsites.etherdelta.waitForOrder(direction, 'ETH', token, orderNonce, (err) => {
          if (err) bot.sendMessage(msg.chat.id, err);
          else {
            bot.sendMessage(msg.chat.id, 'Your order has finished');
          }
        });
      }
    });
  }
});

bot.onText(/(buy|sell) (.+) (.+) at (.+)/, (msg, match) => {
  // TEMP
  if (msg.chat.id == TELEGRAM_CHAT_IDS[0]) {
    let direction = match[1];
    let amount = parseFloat(match[2]);
    let token = match[3];
    let price = parseFloat(match[4]);
    let directions = ['buy', 'sell'];

    myWebsites.etherdelta.getOrders('ETH', token, {}, (err, data) => {
      if (err) bot.sendMessage(msg.chat.id, err);
      else {
        myWebsites.etherdelta.trade(direction,
            data[directions[1-directions.indexOf(direction)]][0].order, amount, (err, hash) => {
          if (err) bot.sendMessage(msg.chat.id, err);
          else {
            bot.sendMessage(msg.chat.id, 'Transaction hash: ' + hash);
          }
        });
      }
    });
  }
});

bot.onText(/toggle ethdelta cheap/, (msg, match) => {
  if (TELEGRAM_CHAT_IDS.indexOf(msg.chat.id) != -1) {
    userSettings[msg.chat.id].etherdeltaCheapAlert = !userSettings[msg.chat.id].etherdeltaCheapAlert;
    let currentState = (userSettings[msg.chat.id].etherdeltaCheapAlert) ? 'ON' : 'OFF';
    bot.sendMessage(msg.chat.id, 'Ok, now it is ' + currentState);
    fs.writeFile(`user_settings/${msg.chat.id}.json`, JSON.stringify(userSettings[msg.chat.id]));
  }
});

bot.onText(/toggle ethdelta diff/, (msg, match) => {
  if (TELEGRAM_CHAT_IDS.indexOf(msg.chat.id) != -1) {
    userSettings[msg.chat.id].etherdeltaDiffAlert = !userSettings[msg.chat.id].etherdeltaDiffAlert;
    let currentState = (userSettings[msg.chat.id].etherdeltaDiffAlert) ? 'ON' : 'OFF';
    bot.sendMessage(msg.chat.id, 'Ok, now it is ' + currentState);
    fs.writeFile(`user_settings/${msg.chat.id}.json`, JSON.stringify(userSettings[msg.chat.id]));
  }
});

bot.onText(/toggle arbitrage/, (msg, match) => {
  if (TELEGRAM_CHAT_IDS.indexOf(msg.chat.id) != -1) {
    userSettings[msg.chat.id].arbitrageAlert = !userSettings[msg.chat.id].arbitrageAlert;
    let currentState = (userSettings[msg.chat.id].arbitrageAlert) ? 'ON' : 'OFF';
    bot.sendMessage(msg.chat.id, 'Ok, now it is ' + currentState);
    fs.writeFile(`user_settings/${msg.chat.id}.json`, JSON.stringify(userSettings[msg.chat.id]));
  }
});

bot.onText(/add coin (.+)/, (msg, match) => {
  if (TELEGRAM_CHAT_IDS.indexOf(msg.chat.id) != -1) {
    const coinName = match[1];
    userSettings['global'].coins.push(coinName);
    bot.sendMessage(msg.chat.id, `Coin ${coinName} added. ${JSON.stringify(userSettings[msg.chat.id].coins)}`);
    fs.writeFile('user_settings/global.json', JSON.stringify(userSettings[msg.chat.id]));
  }
});

bot.onText(/remove coin (.+)/, (msg, match) => {
  if (TELEGRAM_CHAT_IDS.indexOf(msg.chat.id) != -1) {
    const coinName = match[1];
    let index = userSettings['global'].coins.indexOf(coinName);
    if (index > -1) {
      userSettings['global'].blacklist.splice(index, 1);
      bot.sendMessage(msg.chat.id, `Coin ${coinName} removed. ${JSON.stringify(userSettings['global'].coins)}`);
    }
    else {
      bot.sendMessage(msg.chat.id, 'Mmm not in the list');
    }
    fs.writeFile('user_settings/global.json', JSON.stringify(userSettings['global']));
  }
});

bot.onText(/remove blacklist (.+)/, (msg, match) => {
  if (TELEGRAM_CHAT_IDS.indexOf(msg.chat.id) != -1) {
    const arg = match[1];
    let index = userSettings[msg.chat.id].blacklist.indexOf(arg);
    if (index > -1) {
      userSettings[msg.chat.id].blacklist.splice(index, 1);
      bot.sendMessage(msg.chat.id, 'Ok, removed. ' + JSON.stringify(userSettings[msg.chat.id].blacklist));
    }
    else {
      bot.sendMessage(msg.chat.id, 'Mmm not in the list');
    }
    fs.writeFile(`user_settings/${msg.chat.id}.json`, JSON.stringify(userSettings[msg.chat.id]));
  }
});

bot.onText(/blacklist (.+)/, (msg, match) => {
  if (TELEGRAM_CHAT_IDS.indexOf(msg.chat.id) != -1) {
    const arg = match[1];
    userSettings[msg.chat.id].blacklist.push(arg);
    bot.sendMessage(msg.chat.id, 'Ok, added. ' + JSON.stringify(userSettings[msg.chat.id].blacklist));
    fs.writeFile(`user_settings/${msg.chat.id}.json`, JSON.stringify(userSettings[msg.chat.id]));
  }
});

bot.onText(/show coins/, (msg, match) => {
  if (TELEGRAM_CHAT_IDS.indexOf(msg.chat.id) != -1) {
    bot.sendMessage(msg.chat.id, JSON.stringify(userSettings['global'].coins));
  }
});

bot.onText(/show blacklist/, (msg, match) => {
  if (TELEGRAM_CHAT_IDS.indexOf(msg.chat.id) != -1) {
    bot.sendMessage(msg.chat.id, JSON.stringify(userSettings[msg.chat.id].blacklist));
  }
});

let allCoins = [
  'VERI', 'PPT', 'PAY', 'PLR', 'DICE',
  'XRL', 'EOS', 'SNT', 'FUN', 'BTH',
  'FUCK', 'ADX', 'BAT', 'OMG'
];

AlertDiff.start(pool, bot, userSettings, myWebsites);

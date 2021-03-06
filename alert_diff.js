const request = require('request');
const Combinatorics = require('js-combinatorics');
const utils = require('./utils.js');
const winston = require('winston');


let consoleLevel;
if (process.env.IS_DG) consoleLevel = 'error';
else consoleLevel = 'debug';

let logger = new winston.Logger({
  exitOnError: false,
  transports: [
    new (winston.transports.Console)({
      handleExceptions: true,
      humanReadableUnhandledException: true,
      level: consoleLevel
    }),
    new (winston.transports.File)({
      name: 'error-file',
      handleExceptions: true,
      filename: 'alert_diff_errors.log',
      level: 'error'
    }),
    new (winston.transports.File)({
      name: 'info-file',
      handleExceptions: false,
      filename: 'alert_diff_info.log',
      level: 'info'
    }),
  ]
});

let sendBasedOnSetting = (setting, message, bot, userSettings) => {
  Object.keys(userSettings).forEach((key) => {
    if (userSettings[key][setting]) {
      bot.sendMessage(key, message);
    }
  });
}

let mainLoop = (pool, bot, userSettings, myWebsites) => {
  try {
    let markets = {}
    console.log(new Date());

    // Get data from EtherDelta
    request.get('https://cache1.etherdelta.com/returnTicker', (err, response, body) => {
      let dataEtherDelta = JSON.parse(body);
      markets.etherdelta = {}
      markets.bittrex = {}
      markets.liqui = {}
      markets.kraken = {}
      Object.keys(dataEtherDelta).forEach((coin) => {
        let value = dataEtherDelta[coin];
        let coinName = coin.replace('ETH_', '');
        let ask = parseFloat(value.ask);
        let bid = parseFloat(value.bid);
        markets.etherdelta[coinName] = {
          last: parseFloat(value.last),
          ask: ask,
          bid: bid,
          dailyVolume: parseFloat(value.baseVolume)
        }
        let diff = bid / ask;
        logger.info('Found a difference of ' + diff + ' on ' + coinName);
        // if (diff >= 1.1) {
        //   if (coinName != 'Droplex Token') {
        //     let message = `URGENTE: Hay una diferencia de ${diff} en ${coinName} en etherdelta`;
        //     sendBasedOnSetting('etherdeltaDiffAlert', message, bot, userSettings);
        //   }
        // }
      });

      userSettings['global'].coins.forEach(async (coin) => {
        let bittrexPromise = new Promise((resolve) => {
          let options = {
            uri: 'https://bittrex.com/api/v1.1/public/getticker',
            qs: { market: 'ETH-' + coin },
            json: true
          }
          request(options, (err, response, data) => {
            if (err) resolve(undefined);
            else {
              if (!data) {
                logger.error('No bittrex data');
                resolve();
              }
              else if (!data.success) {
                logger.info('Bittrex error for ' + coin + ': ' + data.message);
                resolve();
              }
              else {
                data = data.result;
                resolve({
                  last: data.Last,
                  ask: data.Ask,
                  bid: data.Bid
                });
              }
            }
          });
        }).catch((err) => {
          logger.info('Bittrex promise failed: ' + err);
        });
        let liquiPromise = new Promise((resolve) => {
          let name = coin.toLowerCase() + '_eth';
          let options = {
            uri: 'https://api.liqui.io/api/3/ticker/' + name,
            json: true
          }
          request(options, (err, response, data) => {
            if (err) resolve(undefined);
            else {
              if (!data) {
                logger.error('No liqui data');
                resolve();
              }
              else if (data.success === 0) {
                logger.info('Liqui error for ' + coin + ': ' + data.error);
                resolve();
              }
              else {
                data = data[name];
                resolve({
                  last: data.last,
                  ask: data.sell,
                  bid: data.buy,
                  dailyVolume: data.vol
                });
              }
            }
          });
        }).catch((err) => {
          logger.info('Liqui promise failed: ' + err);
        });
        let krakenPromise = new Promise((resolve) => {
          let options = {
            uri: 'https://api.kraken.com/0/public/Ticker',
            qs: { pair: coin.toLowerCase() + 'eth' },
            json: true
          }
          request(options, (err, response, data) => {
            if (err) resolve(undefined);
            else {
              if (!data) {
                logger.info('No kraken data');
              }
              else if (data.error.length) {
                logger.info(data);
                logger.info('Kraken error for ' + coin + ': ' + data.error);
                resolve(undefined);
              }
              else {
                data = data.result[coin + 'ETH'];
                try {
                  resolve({
                    last: data.c[0],
                    ask: data.a[0],
                    bid: data.b[0],
                    dailyVolume: data.v[1]
                  });
                }
                catch (err) {
                  logger.info('Error resolving Kraken: ' + err);
                  resolve();
                }
              }
            }
          });
        }).catch((err) => {
          logger.info('Kraken promise failed: ' + err);
        });
        markets.bittrex[coin] = await bittrexPromise;
        markets.liqui[coin] = await liquiPromise;
        markets.kraken[coin] = await krakenPromise;

        console.log('\nMarket values in ' + coin + ':');
        Object.keys(markets).forEach((market) => {
          let value = markets[market][coin];
          if (value) {
            let query = 'INSERT INTO ticker (coin1, coin2, website, last, bid, ask, daily_volume)' +
                        'VALUES ("ETH", ?, ?, ?, ?, ?, ?)';
            pool.getConnection((err, conn) => {
              if (err) logger.error(err);
              else {
                conn.query(query, [coin, market, value.last, value.bid, value.ask, value.dailyVolume], (err, results, fields) => {
                  conn.release();
                  if (err) console.log(err);
                });
                console.log(market + ': ' + JSON.stringify(value));
              }
            });
          }
        });

        console.log('\nDifferences in ' + coin + ':');
        Combinatorics.combination(Object.keys(markets), 2).forEach((comb) => {
          let market1 = comb[0];
          let market2 = comb[1];

          try {
            let diff = Math.abs(1 - markets[market1][coin].ask / markets[market2][coin].ask);
            console.log(market1 + '-' + market2 + ': ' + diff);

            // Notify if there ir a difference of 10% or more between websites
            if (diff >= 0.1 && userSettings.blacklist.indexOf(coin) == -1) {
              let message = `Hay una diferencia de ${diff} en ${coin} entre ${market1} y ${market2}`;
              sendBasedOnSetting('arbitrageAlert', message, bot, userSettings);
            }

            // Notify if etherdelta is cheaper than other website
            if (market1 == 'etherdelta') {
              if (markets[market2][coin].last / markets[market1][coin].ask >= 1.05) {
                let message = `URGENTE: Esta mas barato ${coin} en etherdelta que en ${market2}`
                sendBasedOnSetting('etherdeltaCheapAlert', message, bot, userSettings);
              }
            }
            else if (market2 == 'etherdelta') {
              if (markets[market1][coin].last / markets[market2][coin].ask >= 1.05) {
                let message = `URGENTE: Esta mas barato ${coin} en etherdelta que en ${market1}`
                sendBasedOnSetting('etherdeltaCheapAlert', message, bot, userSettings);
              }
            }
          }
          catch (err) {
            logger.info('Error in difference ' + market1 + '-' + market2);
          }
        });
      });
    });

    // Get trades from EtherDelta and save in database
    myWebsites.etherdelta.getTrades((err, trades) => {
      if (err) logger.error('Getting etherdelta trade data: ' + err);
      else {
        logger.info('Trades gotten');
        //logger.info(trades);
        Object.keys(trades.events).forEach((key) => {
          let event = trades.events[key];
          if (event.event == 'Trade') {
            let data = event.args;
            let type, tradeCoin, price, baseAmount;
            let timestamp = new Date(parseInt(event.timeStamp, 16) * 1000);
            let tokenGet = utils.getToken(data.tokenGet);
            if (tokenGet === undefined) {
              logger.info('Error processing trade for token ' + data.tokenGet);
              return;
            }
            let tokenGive = utils.getToken(data.tokenGive);
            if (tokenGive === undefined) {
              logger.info('Error processing trade for token ' + data.tokenGive);
              return;
            }
            let amountGet = utils.argToAmount(data.amountGet, tokenGet.decimals);
            let amountGive = utils.argToAmount(data.amountGive, tokenGive.decimals);
            if (amountGet === undefined) return;
            if (tokenGet.name == 'ETH') {
              type = 'sell';
              tradeCoin = tokenGive.name;
              price = amountGet.dividedBy(amountGive);
              baseAmount = amountGet;
            }
            else {
              type = 'buy';
              tradeCoin = tokenGet.name;
              price = amountGive.dividedBy(amountGet);
              baseAmount = amountGive;
            }
            let query = 'INSERT INTO trade (website, type, base_coin, trade_coin, price, base_amount, website_timestamp)' +
                        'VALUES ("ethereum", ?, "ETH", ?, ?, ?, ?)';
            pool.getConnection((err, conn) => {
              if (err) logger.error(err);
              else {
                conn.query(query, [type, tradeCoin, price.toNumber(), baseAmount.toNumber(), timestamp], (err, results, fields) => {
                  conn.release();
                  if (err) {
                    if (err.code == 'ER_DUP_ENTRY') {
                      logger.info('Skipping trade duplicate entry');
                    }
                    else {
                      logger.error(err);
                    }
                  }
                });
              }
            });
          }
        });
      }
    });

    // Get orders from EtherDelta and save in database
    // allCoins.forEach((coin) => {
    //   myWebsites.etherdelta.getOrders('ETH', coin, 10, (err, orders) => {
    //     if (err) logger.error(err);
    //     else {
    //       let diff = orders.buy[0].price / orders.sell[0].price;
    //       console.log(orders);
    //       logger.info('Found a difference of ' + diff + ' on ' + coin);
    //       if (diff >= 1.1) {
    //         let message = `URGENTE: Hay una diferencia de ${diff} en ${coin} en etherdelta`;
    //         sendTelegramMessage(message);
    //       }
    //     }
    //   });
    // });
  }
  catch (err) {
    logger.error(err);
  }
}

let start = (pool, bot, userSettings, myWebsites) => {
  // Run main loop
  mainLoop(pool, bot, userSettings, myWebsites);
  setInterval(() => { mainLoop(pool, bot, userSettings, myWebsites) }, 60000);
}

module.exports = { start };

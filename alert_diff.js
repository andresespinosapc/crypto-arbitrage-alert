const request = require('request');
const mysql = require('mysql');
const Combinatorics = require('js-combinatorics');


let mainLoop = (conn) => {
  try {
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
        markets.etherdelta[coin.replace('ETH_', '')] = {
          last: parseFloat(value.last),
          ask: parseFloat(value.ask),
          bid: parseFloat(value.bid),
          dailyVolume: parseFloat(value.baseVolume)
        }
      });

      coins.forEach(async (coin) => {
        let bittrexPromise = new Promise((resolve) => {
          let options = {
            uri: 'https://bittrex.com/api/v1.1/public/getticker',
            qs: { market: 'ETH-' + coin }
          }
          request(options, (err, response, body) => {
            if (err) resolve(undefined);
            else {
              let data = JSON.parse(body);
              resolve({
                last: data.Last,
                ask: data.Ask,
                bid: data.Bid
              });
            }
          });
        });
        let liquiPromise = new Promise((resolve) => {
          let name = coin.toLowerCase() + '_eth';
          request.get('https://api.liqui.io/api/3/ticker/' + name, (err, response, body) => {
            if (err) resolve(undefined);
            else {
              let data = JSON.parse(body)[name];
              resolve({
                last: data.last,
                ask: data.sell,
                bid: data.buy,
                dailyVolume: data.vol
              });
            }
          });
        });
        let krakenPromise = new Promise((resolve) => {
          let options = {
            uri: 'https://api.kraken.com/0/public/Ticker',
            qs: { pair: coin.toLowerCase() + 'eth' }
          }
          request(options, (err, response, body) => {
            if (err) resolve(undefined);
            else {
              let data = JSON.parse(body);
              resolve({
                last: data.c[0],
                ask: data.a[0],
                bid: data.b[0],
                dailyVolume: data.v[1]
              });
            }
          });
        });
        let markets
        markets.bittrex[coin] = await bittrexPromise;
        markets.liqui[coin] = await liquiPromise;
        markets.kraken[coin] = await krakenPromise;

        console.log('\nMarket values in ' + coin + ':');
        Object.keys(markets).forEach((market) => {
          let value = markets[market][coin];
          if (value) {
            let query = 'INSERT INTO ticker (coin1, coin2, website, last, bid, ask, daily_volume)' +
                        'VALUES ("ETH", ?, ?, ?, ?, ?, ?)';
            conn.query(query, [coin, market, value.last, value.bid, value.ask, value.dailyVolume], (err, results, fields) => {
              if (err) console.log(err);
            });
            console.log(market + ': ' + value);
          }
        });

        console.log('\nDifferences in ' + coin + ':');
        Combinatorics.combination(Object.keys(markets), 2).forEach((comb) => {
          let market1 = comb[0];
          let market2 = comb[1];

          try {
            let diff = Math.abs(1 - markets[market1][coin].ask / markets[market2][coin].ask);
            console.log(market1 + '-' + market2 + ': ' + diff);
            if (diff >= 0.1 && !(coin in blacklist)) {
              let message = 'Hay una diferencia de ' + diff + ' en ' +
                            coin + ' entre ' + market1 + ' y ' + market2;
              options = {
                uri: 'https://api.telegram.org/bot423299318:AAGSZaf9hy8_KNy2QAtLebSA_9uJovuc4sU/sendMessage',
                qs: {
                  'chat_id': 8834684,
                  'text': message
                }
              }
              request(options);
            }
          }
        });
      });
    });
  }
  catch (err) {
    console.log(err);
  }
}

let conn = mysql.createConnection({
  host: 'localhost',
  user: 'andres',
  password: '3661071a',
  database: 'crypto'
});

let coins = [
      'VERI', 'PAY', 'FUN', 'DICE', 'ADX', 'ADT', 'SNT', 'EOS', 'ICE', 'HMQ', 'PLU', 'BAT']
coins = ['PAY', 'FUN', 'ADX', 'EOS', 'SNT', 'HMQ', 'PLU', 'BAT', 'ADT']
let blacklist = ['BAT', 'PLU', 'ADT']
// TEMP
// blacklist = ['PAY', 'FUN', 'ADX', 'EOS', 'SNT', 'HMQ', 'PLU', 'BAT', 'ADT']

let markets = {}

try {
  conn.connect();
  mainLoop(conn);
  setInterval(mainLoop, 60000);
}
finally {
  conn.end();
}
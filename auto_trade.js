const websites = require('./websites/exports.js');
const TS = require('./transactor.js');
const request = require('request');

const liquiEthAddr = '0xfea012e2ef9b0894ac658630abc145ba27b76099';

var privateKey = Buffer.from(process.env.PRIV, 'hex');
TS.init("https://mainnet.infura.io/" + process.env.INFURA_TOKEN, privateKey);

let TELEGRAM_CHAT_ID = 8834684;
let TELEGRAM_BOT_TOKEN = '423299318:AAGSZaf9hy8_KNy2QAtLebSA_9uJovuc4sU';

let sendTelegramMessage = async (message) => {
  let options = {
    uri: `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    qs: {
      'chat_id': TELEGRAM_CHAT_ID,
      'text': message
    }
  }
  request(options);
}

let myWebsites = {
  etherdelta: new websites.EtherDelta(TS),
  bittrex: new websites.Bittrex(TS, process.env.BITTREX_KEY, process.env.BITTREX_SECRET),
  liqui: new websites.Liqui(TS, process.env.LIQUI_KEY, process.env.LIQUI_SECRET)
}

// TS.moveCoin(myWebsites.etherdelta, myWebsites.bittrex, 'ADX', 770, (err) => {
//   if (err) console.log(err);
//   else {
//     console.log('yeah');
//   }
// });

// myWebsites.bittrex.deposit('ADX', 770, (err) => {
//   if (err) console.log(err);
//   else {
//     console.log('yeah');
//   }
// });

// TS.sendToken('ADX', '0xe4573b8bab07aaedce70605e578110979df16442', 461.31, {}, (err, hash) => {
//   if (err) console.log(err);
//     console.log('yeah', hash);
// });

// myWebsites.etherdelta.waitForOrder('sell', 'ETH', 'EOS', '2126580151', (err) => {
//   if (err) console.log(err);
//   else {
//     sendTelegramMessage('Termino tu orden');
//   }
// });

// myWebsites.etherdelta.order('sell', 464.88, 0.0007, 'ETH', 'ADX', 10, false, (err, orderNonce) => {
//   if (err) console.log(err);
//   else {
//     console.log('Order placed with nonce: ' + orderNonce);
//     myWebsites.etherdelta.waitForOrder('sell', 'ETH', 'ADX', orderNonce, (err) => {
//       if (err) console.log(err);
//       else {
//         sendTelegramMessage('Termino tu orden');
//       }
//     });
//   }
// });

// myWebsites.etherdelta.getOrders('ETH', 'VERI', { areMyOrders: false }, (err, data) => {
//   if (err) console.log(err);
//   else {
//     console.log('Orders gotten');
//     console.log(data.sell[0].order);
//     // myWebsites.etherdelta.trade('buy', data.sell[0].order, 0.001, (err, hash) => {
//     //   if (err) console.log(err);
//     //   else {
//     //     console.log('Transaction hash: ' + hash);
//     //   }
//     // });
//   }
// });

// myWebsites.etherdelta.deposit('ETH', 0.52, (err) => {
//   if (err) console.log(err);
//   else {
//     console.log('yeah');
//   }
// });

// myWebsites.bittrex.withdraw('FUN', 5364.05125556, (err) => {
//   if (err) console.log(err);
//   else console.log('Withdrawal successfull');
// });

// myWebsites.etherdelta.withdraw('ETH', 1, (err) => {
//   if (err) console.log(err);
//   else console.log('Withdrawal successfull');
// });

// myWebsites.etherdelta.deposit('FUN', 0.04, (err) => {
//   if (err) console.log(err);
//   else console.log('Deposit successfull');
// });

// myWebsites.etherdelta.withdraw('ETH', 1, (err) => {
//   if (err) console.log(err);
//   else console.log('Withdrawal successfull');
// });

myWebsites.bittrex.deposit('PAY', 73, (err) => {
  if (err) console.log(err);
  else console.log('Deposit submitted');
});

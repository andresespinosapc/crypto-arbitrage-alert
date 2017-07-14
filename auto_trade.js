const websites = require('./websites/exports.js');
const TS = require('./transactor.js');

const liquiEthAddr = '0xfea012e2ef9b0894ac658630abc145ba27b76099';

var privateKey = Buffer.from(process.env.PRIV, 'hex');
TS.init("https://mainnet.infura.io/" + process.env.INFURA_TOKEN, privateKey);

let myWebsites = {
  etherdelta: new websites.EtherDelta(TS),
  bittrex: new websites.Bittrex(TS, process.env.BITTREX_KEY, process.env.BITTREX_SECRET),
  liqui: new websites.Liqui(TS, process.env.LIQUI_KEY, process.env.LIQUI_SECRET)
}

// myWebsites.bittrex.withdraw('FUN', 5364.05125556, (err) => {
//   if (err) console.log(err);
//   else console.log('Withdrawal successfull');
// });

// myWebsites.etherdelta.withdraw('FUN', 0.04, (err) => {
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

myWebsites.bittrex.deposit('ETH', 0.476, (err) => {
  if (err) console.log(err);
  else console.log('Deposit submitted');
});


// myWebsites.bittrex.request('https://bittrex.com/api/v1.1/account/getdeposithistory', {}, (err, res) => {
//   console.log(res);
// });

// console.log('Starting deposit...');
// myWebsites.etherdelta.deposit('ETH', 0.01, (err) => {
//   if (err) console.log(err);
//   else {
//     console.log('Deposit successfull');
//   }
// });

// console.log('Starting deposit...');
// myWebsites.bittrex.deposit(TS, 'ETH', 0.01, (err) => {
//   if (err) console.log(err);
//   else {
//     console.log('Deposit successfull');
//   }
// });

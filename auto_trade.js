const websites = require('./websites/exports.js');
const TS = require('./transactor.js');

const liquiEthAddr = '0xfea012e2ef9b0894ac658630abc145ba27b76099';

var privateKey = Buffer.from(process.env.PRIV, 'hex');
TS.init("https://mainnet.infura.io/" + process.env.INFURA_TOKEN, privateKey);

new websites.EtherDelta(TS, (err, etherdelta) => {
  if (err) console.log(err);
  else {
    let myWebsites = {
      etherdelta: etherdelta,
      bittrex: new websites.Bittrex(TS, process.env.BITTREX_KEY, process.env.BITTREX_SECRET),
      liqui: new websites.Liqui(TS, process.env.LIQUI_KEY, process.env.LIQUI_SECRET)
    }

    myWebsites.etherdelta.withdraw('ETH', 0.09, (err) => {
      if (err) console.log(err);
      else console.log('Withdraw successfull');
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
  }
});

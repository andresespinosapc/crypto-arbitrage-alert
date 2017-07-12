const websites = require('./websites.js');
const TS = require('./transactor.js');
const ethUtil = require('ethereumjs-util');


let myWebsites = {
  bittrex: new websites.Bittrex(process.env.BITTREX_KEY, process.env.BITTREX_SECRET),
  liqui: new websites.Liqui(process.env.LIQUI_KEY, process.env.LIQUI_SECRET)
}

const liquiEthAddr = '0xfea012e2ef9b0894ac658630abc145ba27b76099';
var privateKey = Buffer.from(process.env.MEW, 'hex');
TS.init("https://mainnet.infura.io/" + process.env.INFURA_TOKEN);


// Move ether from bittrex to liqui
myWebsites.bittrex.withdraw('ETH', 0.35587913, ethUtil.privateToAddress(process.env.MEW), (err) => {
  if (err === null) console.log('There was an error');
  else {
    console.log('Withdrawal successful');
    myWebsites.liqui.getBalance('ETH', (err, balance) => {
      if (err) console.log('Error getting initial balance');
      else {
        console.log('Initial balance:', balance);
        let hash = TS.transact(privateKey, liquiEthAddr, value=transValue);
        console.log('Transaction hash:', hash);
        let interval = setInterval(() => {
          myWebsites.liqui.getBalance('ETH', (err, balance2) => {
            if (err) console.log('Error getting liqui balance');
            else {
              if (balance2 > balance) {
                console.log('Deposit successful');
                clearInterval(interval);
              }
            }
          });
        }, 60000);
      }
    });
  }
});

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

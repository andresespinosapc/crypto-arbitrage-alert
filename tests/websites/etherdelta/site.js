const projectPath = '/Users/sebamenabar/Documents/ethtrader/crypto/'

// console.log(process.env.NODE_PATH);
// process.env.NODE_PATH = '/Users/sebamenabar/Documents/ethtrader/crypto/'
// console.log(process.env.NODE_PATH);

const fs = require('fs');
const EtherDelta = require(projectPath + './websites/etherdelta');
const ts = require(projectPath + './transactor');

let privateKey = Buffer.from(fs.readFileSync('/Users/sebamenabar/.eth_keys/odins_second', 'utf8').trim(), 'hex');
let infuraToken = fs.readFileSync('/Users/sebamenabar/.eth_keys/infura_token', 'utf8').trim();
ts.init("https://mainnet.infura.io" + infuraToken, privateKey);

let etherDelta = new EtherDelta(ts)

module.exports = {
  etherDelta
}

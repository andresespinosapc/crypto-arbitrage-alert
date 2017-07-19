const projectPath = '/Users/sebamenabar/Documents/ethtrader/crypto/'

// console.log(process.env.NODE_PATH);
// process.env.NODE_PATH = '/Users/sebamenabar/Documents/ethtrader/crypto/'
// console.log(process.env.NODE_PATH);

const fs = require('fs');
const Bittrex = require(projectPath + './websites/bittrex');
const ts = require(projectPath + './transactor');

const bittrexApi = '138fae0cd15142d0a26c3ed3e7895296';
const bittrexSecret = '0e45956b532c4db49a680be7c92a1373';

let privateKey = Buffer.from(fs.readFileSync('/Users/sebamenabar/.eth_keys/odins_second', 'utf8').trim(), 'hex');
let infuraToken = fs.readFileSync('/Users/sebamenabar/.eth_keys/infura_token', 'utf8').trim();
ts.init("https://mainnet.infura.io" + infuraToken, privateKey);

let bittrex = new Bittrex(ts, bittrexApi, bittrexSecret);

module.exports = {
  bittrex:bittrex
}

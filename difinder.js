const sites = require('./websites/exports');
const ts = require('./transactor');
const fs = require('fs');

const privateKey = Buffer.from(fs.readFileSync('../node/priv', 'utf8').trim(), 'hex');
const bittrexApi = '138fae0cd15142d0a26c3ed3e7895296';
const bittrexSecret = '0e45956b532c4db49a680be7c92a1373';

ts.init("https://mainnet.infura.io/wPxDBC49Lu3fYkUy5r5e", privateKey);

console.log()

var etherdelta = new sites.EtherDelta(ts);
var bittrex = new sites.Bittrex(ts, bittrexApi, bittrexSecret);



let ethPromise = new Promise((resolve)=>{
  etherdelta.getOrders('ETH', 'ADX', async (err, pairs)=>{
    resolve({
      err,
      pairs
    });
  });
});

let bittrexPromise = new Promise((resolve)=>{
  bittrex.getOrders('ETH', 'ADX', async (err, val)=>{
    resolve({
      err,
      val
    });
  });
});

(async function(){
  let bitmark = await bittrexPromise;
  let ethmark = await ethPromise;

  console.log(bitmark);
  console.log(ethmark);
});

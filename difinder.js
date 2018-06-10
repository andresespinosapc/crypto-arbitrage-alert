const sites = require('./websites/exports');
const ts = require('./transactor');
const fs = require('fs');

const privateKey = Buffer.from(fs.readFileSync('../node/priv', 'utf8').trim(), 'hex');
const bittrexApi = process.env.BITTREX_KEY;
const bittrexSecret = process.env.BITTREX_SECRET;

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

var site = require('./site').etherDelta;
orders = site.getTrades((err,trades)=>{
  if(err) console.log(err);
  else site.getTradesByPair('ETH', 'HMQ', ()=>{});
});

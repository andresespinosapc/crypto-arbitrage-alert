var site = require('./site').etherDelta;
orders = site.getOrders('ETH', 'HMQ', 15, (err, orders)=>{
  if(err) console.log(err);
  else{
    console.log(orders);
  }
});

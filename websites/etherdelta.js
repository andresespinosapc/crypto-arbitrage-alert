const Website = require('./website.js');
const config = require('../etherdelta.github.io/config.js');
const utility = require('../etherdelta.github.io/common/utility.js')(config)
const utils = require('../utils.js');
const BigNumber = require('bignumber.js');
const async = require('async');
const request = require('request');
const etherScanUri = 'https://api.etherscan.io/api'
const etherScanApiKey = 'TYM3NSAF9RIAFSNRU5RZJQHI71C784FNK6' // TODO temporal
const locks = require('locks');
const sha256 = require('js-sha256').sha256;


class EtherDelta extends Website{
  constructor(transactor) {
    super(transactor);

    this.config = config;
    this.config.etherDeltaContracts = this.config.contractEtherDeltaAddrs.map(
      (elem)=>{return elem.addr;});
    this.config.tokens = this.config.tokens.map((elem)=>{return elem.name});
    this.config.contractEtherDeltaAddr = this.config.contractEtherDeltaAddrs[0].addr;
    this.config.apiServer = this.config.apiServer[
      Math.floor(Math.random() * this.config.apiServer.length)];

    this.contractEtherDelta = utils.loadContractSync(
      transactor.web3,
      __dirname + '/../etherdelta.github.io/smart_contract/etherdelta.sol',
      this.config.contractEtherDeltaAddr);
    if (this.contractEtherDelta); //console.log('EtherDelta ether contract loaded');
    else console.log('Error loading EtherDelta ether contract');

    this.contractToken = utils.loadContractSync(
      transactor.web3,
      __dirname + '/../etherdelta.github.io/smart_contract/token.sol',
      this.config.ethAddr);
    if (this.contractToken); //console.log('EtherDelta token contract loaded');
    else console.log('Error loading EtherDelta token contract');

    this.eventsLock = locks.createMutex();
    this.eventsCache = {};
  }

  getDivisor(tokenOrAddress) {
    let result = 1000000000000000000;
    const token = utils.getToken(tokenOrAddress);
    if (token && token.decimals !== undefined) {
      result = Math.pow(10, token.decimals); // eslint-disable-line no-restricted-properties
    }
    return new BigNumber(result);
  };

  deposit(currency, value, callback) {
    const token = utils.getToken(currency);
    const tokenAddr = token.addr;
    let amount = new BigNumber(Number(utility.ethToWei(value, this.getDivisor(tokenAddr))));
    if (amount.lte(0)) {
      callback('Invalid deposit amount');
      return;
    }
    if (tokenAddr.slice(0, 39) === '0x0000000000000000000000000000000000000') {
      this.transactor.getBalance('ETH', (err, balance) => {
        if (err) callback(err);
        else {
          if (amount.gt(balance) && amount.lt(balance.times(new BigNumber(1.1)))) amount = balance;
          if (amount.lte(balance)) {
            utility.send(
              this.transactor.web3,
              this.contractEtherDelta,
              this.config.contractEtherDeltaAddr,
              'deposit',
              [{ gas: this.config.gasDeposit, value: amount.toNumber() }],
              this.transactor.address,
              this.transactor.privateKey,
              this.nonce,
              (errSend, resultSend) => {
                if (errSend) callback(errSend);
                else {
                  this.nonce = resultSend.nonce;
                  console.log('Transaction hash:', resultSend.txHash);
                  this.transactor.waitForTransaction(resultSend.txHash, callback);
                }
              });
          } else {
            callback('You don\'t have enough Ether');
          }
        }
      });
    } else {
      utility.call(
        this.transactor.web3,
        this.contractToken,
        token.addr,
        'allowance',
        [this.transactor.address, this.config.contractEtherDeltaAddr],
        (errAllowance, resultAllowance) => {
          if (resultAllowance.gt(0) && amount.gt(resultAllowance)) amount = resultAllowance;
          utility.call(
            this.transactor.web3,
            this.contractToken,
            token.addr,
            'balanceOf',
            [this.transactor.address],
            (errBalanceOf, resultBalanceOf) => {
              if (errBalanceOf) callback(errBalanceOf);
              else {
                if (amount.gt(resultBalanceOf) &&
                  amount.lt(resultBalanceOf.times(new BigNumber(1.1)))) amount = resultBalanceOf;
                if (amount.lte(resultBalanceOf)) {
                  const txs = [];
                  async.series(
                    [
                      (callbackSeries) => {
                        if (resultAllowance.eq(0)) {
                          utility.send(
                            this.transactor.web3,
                            this.contractToken,
                            tokenAddr,
                            'approve',
                            [this.config.contractEtherDeltaAddr, amount,
                              { gas: this.config.gasApprove, value: 0 }],
                            this.transactor.address,
                            this.transactor.privateKey,
                            this.nonce,
                            (errSend, resultSend) => {
                              if (errSend) callbackSeries(errSend);
                              else {
                                this.nonce = resultSend.nonce;
                                txs.push(resultSend);
                                callbackSeries(null, { errSend, resultSend });
                              }
                            });
                        } else {
                          callbackSeries(null, undefined);
                        }
                      },
                      (callbackSeries) => {
                        utility.send(
                          this.transactor.web3,
                          this.contractEtherDelta,
                          this.config.contractEtherDeltaAddr,
                          'depositToken',
                          [tokenAddr, amount, { gas: this.config.gasDeposit, value: 0 }],
                          this.transactor.address,
                          this.transactor.privateKey,
                          this.nonce,
                          (errSend, resultSend) => {
                            if (errSend) callbackSeries(errSend);
                            else {
                              console.log(errSend);
                              this.nonce = resultSend.nonce;
                              txs.push(resultSend);
                              callbackSeries(null, { errSend, resultSend });
                            }
                          });
                      },
                    ],
                    (err, results) => {
                      if (err) callback(err);
                      else {
                        const [tx1, tx2] = results;
                        const errSend1 = tx1 ? tx1.errSend1 : undefined;
                        const errSend2 = tx2 ? tx2.errSend1 : undefined;

                        async.parallel([
                          (parallelCallback) => {
                            let hash = txs[0].txHash;
                            console.log('Transaction 1 hash:', hash);
                            this.transactor.waitForTransaction(hash, parallelCallback);
                          },
                          (parallelCallback) => {
                            let hash = txs[1].txHash;
                            console.log('Transaction 2 hash:', hash);
                            this.transactor.waitForTransaction(hash, parallelCallback);
                          }
                        ], callback);
                      }
                    });
                } else {
                  callback("You don't have enough tokens");
                }
              }
            });
        });
    }
  }

  withdraw(currency, value, callback) {
    const token = utils.getToken(currency);
    const tokenAddr = token.addr;
    let amount = new BigNumber(Number(utility.ethToWei(value, this.getDivisor(tokenAddr))));
    if (amount.lte(0)) {
      calback('You must specify a valid amount to withdraw');
      return;
    }
    utility.call(
      this.transactor.web3,
      this.contractEtherDelta,
      this.config.contractEtherDeltaAddr,
      'balanceOf',
      [tokenAddr, this.transactor.address],
      (err, result) => {
        if (err) callback(err);
        else {
          const balance = result;
          // if you try to withdraw more than your balance, the amount
          // will be modified so that you withdraw your exact balance:
          if (amount.gt(balance)) {
            amount = balance;
          }
          if (amount.lte(0)) {
            callback('You don\'t have anything to withdraw');
            return;
          }
          else if (tokenAddr.slice(0, 39) === '0x0000000000000000000000000000000000000') {
            utility.send(
              this.transactor.web3,
              this.contractEtherDelta,
              this.config.contractEtherDeltaAddr,
              'withdraw',
              [amount, { gas: this.config.gasWithdraw, value: 0 }],
              this.transactor.address,
              this.transactor.privateKey,
              this.nonce,
              (errSend, resultSend) => {
                if (errSend) callback(errSend);
                else {
                  this.nonce = resultSend.nonce;
                  console.log('Transaction hash:', resultSend.txHash);
                  this.transactor.waitForTransaction(resultSend.txHash, callback);
                }
              });
          }
          else {
            utility.send(
              this.transactor.web3,
              this.contractEtherDelta,
              this.config.contractEtherDeltaAddr,
              'withdrawToken',
              [tokenAddr, amount, { gas: this.config.gasWithdraw, value: 0 }],
              this.transactor.address,
              this.transactor.privateKey,
              this.nonce,
              (errSend, resultSend) => {
                if (errSend) callback(errSend);
                else {
                  this.nonce = resultSend.nonce;
                  console.log('Transaction hash:', resultSend.txHash);
                  this.transactor.waitForTransaction(resultSend.txHash, callback);
                }
            });
          }
        }
      });
  };

  // Options: {limit, areMyOrders}
  getOrders(baseCurrency, tradeCurrency, options, callback) {
    let apiServerNonce = this.getNonce();
    // CURRENCIES MUST
    let baseToken = utils.getToken(tradeCurrency);
    let tradeToken = utils.getToken(baseCurrency);
    request.get(`${this.config.apiServer}/orders/${apiServerNonce}/${baseToken.addr}/${tradeToken.addr}`, (err, response, body) => {
      if (err) callback(err);
      else {
        let orders = JSON.parse(body).orders;
        let pairs;
        if (options.areMyOrders) {
          // Only include orders by the selected user
          orders = orders.filter(
            order => this.transactor.address.toLowerCase() === order.order.user.toLowerCase());
          pairs = utils.ordersByPair(orders, baseToken.addr, tradeToken.addr, options.limit);

          callback(undefined, {
            buy: pairs.buy.map((elem)=>{
              return {
                price: new BigNumber(elem.price).toNumber(),
                amount: utils.argToAmount(elem.amount, baseToken.decimals).toNumber(),
                amountFilled: utils.argToAmount(elem.amountFilled, baseToken.decimals).toNumber(),
                nonce: elem.order.nonce
              }
            }),
            sell: pairs.sell.map((elem)=>{
              return {
                price: new BigNumber(elem.price).toNumber(),
                amount: utils.argToAmount(-elem.amount, baseToken.decimals).toNumber(),
                amountFilled: utils.argToAmount(elem.amountFilled, baseToken.decimals).toNumber(),
                nonce: elem.order.nonce
              }
            })
          });
        }
        else {
          pairs = utils.ordersByPair(orders.orders, baseToken.addr, tradeToken.addr, options.limit);

          callback(undefined, {
            buy: pairs.buy.map((elem)=>{
              return {
                price:new BigNumber(elem.price).toNumber(),
                quantity:utils.argToAmount(elem.amount, baseToken.decimals)
                .minus(utils.argToAmount(elem.amountFilled, baseToken.decimals)).toNumber()
              }
            }),
            sell: pairs.sell.map((elem)=>{
              return {
                price:new BigNumber(elem.price).toNumber(),
                quantity:utils.argToAmount(-elem.amount, baseToken.decimals)
                .minus(utils.argToAmount(elem.amountFilled, baseToken.decimals)).toNumber()
              }
            })
          });
        }
      }
    });
  }

  getTrades(callback) {
    var qs = {
      module: 'proxy',
      action: 'eth_blockNumber',
      apikey: etherScanApiKey
    }
    // TODO use INFURA node to get blockNumber
    request({ uri: etherScanUri, qs: qs }, (err, response, body)=>{
      if (err) callback(err);
      else {
        let res = JSON.parse(body);
        let blockNumber = parseInt(res.result, 16);
        let apiServerNonce = this.getNonce();
        console.log('NEW NONCE', apiServerNonce);
        request.get(`${this.config.apiServer}/events/${apiServerNonce}/${blockNumber}`, (err, response, body)=>{
          if (err) callback(err);
          else {
            let trades = JSON.parse(body);
            this.eventsLock.lock(()=>{
              this.eventsCache = trades;
              this.eventsLock.unlock();
            });
            callback(undefined, trades);
          }
        });
      };
    });
  }

  getTradesByPair(baseCurrency, tradeCurrency) {
    let trades = [];
    let tokenGive = utils.getToken(baseCurrency);
    let baseAddrLower = tokenGive.addr.toLowerCase();
    let tokenGet = utils.getToken(tradeCurrency);
    let tradeAddrLower = tokenGet.addr.toLowerCase();
    console.log(baseAddrLower);
    console.log(tradeAddrLower);
    this.eventsLock.lock(()=>{
      Object.keys(this.eventsCache.events).forEach((key)=>{
        var event = this.eventsCache.events[key];
        if(event.event === 'Trade' && this.config.etherDeltaContracts.indexOf(event.address)>=0){
          if (Number(event.args.amountGive) > 0 && Number(event.args.amountGet) > 0) {
            if(event.args.tokenGet.toLowerCase() === tradeAddrLower &&
               event.args.tokenGive.toLowerCase() === baseAddrLower){
              var amountGet = utils.argToAmount(event.args.amountGet, tokenGet.decimals);
              var amountGive = utils.argToAmount(event.args.amountGive, tokenGive.decimals);
              var trade = {
                amountGet,
                amountGive,
                rate: amountGive.dividedBy(amountGet),
                timestamp: new Date(parseInt(event.timeStamp, 16) * 1000)
              }
              trades.push(trade)
            } else if (event.args.tokenGive.toLowerCase() === tradeAddrLower &&
               event.args.tokenGet.toLowerCase() === baseAddrLower){
               var amountGet = utils.argToAmount(event.args.amountGive, tokenGet.decimals);
               var amountGive = utils.argToAmount(event.args.amountGet, tokenGive.decimals);
               var trade = {
                 amountGet,
                 amountGive,
                 rate: amountGive.dividedBy(amountGet),
                 timestamp: new Date(parseInt(event.timeStamp, 16) * 1000)
               }
               trades.push(trade);
             }
          }
        }
      });
      trades.sort((a,b)=>{
        return b.timestamp>a.timestamp;
      })
      this.eventsLock.unlock();
      return trades;
    });
  }

  getNonce(){
    return Math.random().toString().slice(2) + Math.random().toString().slice(2);
  }

  sell(){}

  buy(){}

  order(direction, amount, price, baseCurrency, tradeCurrency, expires, refresh, callback) {
    const baseToken = utils.getToken(baseCurrency);
    const tradeToken = utils.getToken(tradeCurrency);
    utility.blockNumber(this.transactor.web3, (err, blockNumber) => {
      const orderObj = {
        baseAddr: baseToken.addr,
        tokenAddr: tradeToken.addr,
        direction,
        amount,
        price,
        expires,
        refresh,
        nextExpiration: 0,
      };
      if (blockNumber >= orderObj.nextExpiration) {
        if (orderObj.nextExpiration === 0) {
          orderObj.nextExpiration = Number(orderObj.expires) + blockNumber;
          orderObj.nonce = utility.getRandomInt(0,
            Math.pow(2, 32)); // eslint-disable-line no-restricted-properties
          this.publishOrder(
            orderObj.baseAddr,
            orderObj.tokenAddr,
            orderObj.direction,
            orderObj.amount,
            orderObj.price,
            orderObj.nextExpiration,
            orderObj.nonce,
            callback);
        }
      }
    });
  };

  waitForOrder(direction, baseCurrency, tradeCurrency, orderNonce, callback) {
    console.log('Waiting order...');
    this.getOrders(baseCurrency, tradeCurrency, { areMyOrders: true }, (err, pairs) => {
      if (err) callback(err);
      else {
        let found = pairs[direction].find((elem) => {
          if (elem.nonce == orderNonce) return true;
        });
        if (!found) {
          callback(undefined);
        }
        else {
          setTimeout(() => {
            this.waitForOrder(direction, baseCurrency, tradeCurrency, orderNonce, callback);
          }, 60000);
        }
      }
    });
  }

  publishOrder(baseAddr, tokenAddr, direction, amount, price, expires, orderNonce, callback) {
    let tokenGet;
    let tokenGive;
    let amountGet;
    let amountGive;

    if (direction === 'buy') {
      tokenGet = tokenAddr;
      tokenGive = baseAddr;
      amountGet = Math.floor(utility.ethToWei(amount, this.getDivisor(tokenGet)));
      const amountGetEth = utility.weiToEth(amountGet, this.getDivisor(tokenGet));
      amountGive = Math.floor(utility.ethToWei(amountGetEth * price, this.getDivisor(tokenGive)));
    }
    else if (direction === 'sell') {
      tokenGet = baseAddr;
      tokenGive = tokenAddr;
      amountGive = Math.floor(utility.ethToWei(amount, this.getDivisor(tokenGive)));
      const amountGiveEth = utility.weiToEth(amountGive, this.getDivisor(tokenGive));
      amountGet = Math.ceil(utility.ethToWei(amountGiveEth * price, this.getDivisor(tokenGet)));
    }
    else {
      console.log('Invalid order direction');
      return;
    }
    utility.call(
      this.transactor.web3,
      this.contractEtherDelta,
      this.config.contractEtherDeltaAddr,
      'balanceOf',
      [tokenGive, this.transactor.address],
      (err, result) => {
        if (err) callback(err);
        else {
          const balance = result;
          if (balance.lt(new BigNumber(amountGive))) {
            callback('You do not have enough funds');
            return;
          }
          else if (!this.config.ordersOnchain) {
            // offchain order
            const condensed = utility.pack(
              [
                this.config.contractEtherDeltaAddr,
                tokenGet,
                amountGet,
                tokenGive,
                amountGive,
                expires,
                orderNonce,
              ],
              [160, 160, 256, 160, 256, 256, 256]);
            const hash = sha256(new Buffer(condensed, 'hex'));
            utility.sign(this.transactor.web3, this.transactor.address,
            hash, this.transactor.privateKey, (errSign, sig) => {
              if (errSign) callback(errSign);
              else {
                // Send order to offchain book:
                const order = {
                  contractAddr: this.config.contractEtherDeltaAddr,
                  tokenGet,
                  amountGet,
                  tokenGive,
                  amountGive,
                  expires,
                  nonce: orderNonce,
                  v: sig.v,
                  r: sig.r,
                  s: sig.s,
                  user: this.transactor.address,
                };
                console.log('Sending order to the order book...');
                utility.postURL(
                  `${this.config.apiServer}/message`,
                  { message: JSON.stringify(order) },
                  (errPost) => {
                    // There is no body response
                    if (errPost) callback(errPost);
                    else {
                      // Notify when order is complete
                      callback(undefined, orderNonce);
                    }
                });
              }
            });
          }
          else {
            // onchain order
            utility.send(
              this.web3,
              this.contractEtherDelta,
              this.config.contractEtherDeltaAddr,
              'order',
              [
                tokenGet,
                amountGet,
                tokenGive,
                amountGive,
                expires,
                orderNonce,
                { gas: this.config.gasOrder, value: 0 },
              ],
              this.transactor.address,
              this.transactor.privateKey,
              this.nonce,
              (errSend, resultSend) => {
                if (errSend) callback(errSend);
                else {
                  this.nonce = resultSend.nonce;
                  callback(undefined, { txHash: resultSend.txHash });
                }
              });
          }
        }
      });
  };

}





module.exports = EtherDelta;

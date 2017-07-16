const Website = require('./website.js');
const config = require('../etherdelta.github.io/config.js');
const utility = require('../etherdelta.github.io/common/utility.js')(config)
const utils = require('../utils.js');
const BigNumber = require('bignumber.js');
const async = require('async');
const request = require('request');


class EtherDelta extends Website{
  constructor(transactor) {
    super(transactor);

    this.config = config;
    this.config.contractEtherDeltaAddr = this.config.contractEtherDeltaAddrs[0].addr;
    this.config.apiServer = this.config.apiServer[
      Math.floor(Math.random() * this.config.apiServer.length)];

    this.contractEtherDelta = utils.loadContractSync(
      transactor.web3,
      'etherdelta.github.io/smart_contract/etherdelta.sol',
      this.config.contractEtherDeltaAddr);
    if (this.contractEtherDelta) console.log('EtherDelta ether contract loaded');
    else console.log('Error loading EtherDelta ether contract');

    this.contractToken = utils.loadContractSync(
      transactor.web3,
      'etherdelta.github.io/smart_contract/token.sol',
      this.config.ethAddr);
    if (this.contractToken) console.log('EtherDelta token contract loaded');
    else console.log('Error loading EtherDelta token contract');
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
                console.log('resultBalanceOf:', resultBalanceOf);
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
                              this.nonce = resultSend.nonce;
                              txs.push(resultSend);
                              callbackSeries(null, { errSend, resultSend });
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
                            this.nonce = resultSend.nonce;
                            txs.push(resultSend);
                            callbackSeries(null, { errSend, resultSend });
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

  getOrders(baseCurrency, tradeCurrency, limit, callback) {
    let apiServerNonce = Math.random().toString().slice(2) +
      Math.random().toString().slice(2);
    let baseToken = utils.getToken(baseCurrency);
    let tradeToken = utils.getToken(tradeCurrency);
    let uri = `${this.config.apiServer}/orders/${apiServerNonce}/${baseToken.addr}/${tradeToken.addr}`;
    request.get(uri, (err, response, body) => {
      if (err) callback(err);
      else {
        let ordersData = JSON.parse(body).orders;
        callback(undefined, {
          buy: ordersData.filter((elem) => {
            return elem.order.tokenGive == baseToken.addr;
          }).map((elem) => {
            return {
              amount: elem.amount,
              price: elem.price
            }
          }),
          sell: ordersData.filter((elem) => {
            return elem.order.tokenGet == baseToken.addr;
          }).map((elem) => {
            return {
              
            }
          })
        });
        callback(undefined, data);
      }
    });
  }
}

module.exports = EtherDelta;

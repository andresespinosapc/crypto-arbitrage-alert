const request = require('request');
const crypto = require('crypto');
const querystring = require('querystring');
const BigNumber = require('bignumber.js');
const config = require('./etherdelta.github.io/config.js')
const utility = require('./etherdelta.github.io/common/utility.js')(config); // eslint-disable-line global-require
const utils = require('./utils.js');


class Website {
  constructor(transactor) {
    this.transactor = transactor;
  }

  deposit(currency, value, callback) {
    this.getBalance(currency, (err, initialBalance) => {
      if (err) callback(err);
      else {
        console.log('Initial balance:', initialBalance);
        this.getDepositAddress(currency, (err, depositAddress) => {
          if (err) callback(err);
          else {
            let hash = this.transactor.transact(depositAddress, value);
            console.log('Transaction hash:', hash);
            let interval = setInterval(() => {
              this.getBalance(currency, (err, currentBalance) => {
                if (err) callback(err);
                else {
                  if (currentBalance > initialBalance) {
                    clearInterval(interval);
                    callback(null);
                  }
                }
              });
            }, 60000);
          }
        });
      }
    });
  }
}

class EtherDelta extends Website{
  constructor(transactor, callback) {
    super(transactor);
    this.config = config;
    utility.loadContract(
      transactor.web3,
      'etherdelta.github.io/smart_contract/etherdelta.sol',
      this.config.contractEtherDeltaAddrs[0].addr,
      (err, contract) => {
        if (err) callback(err);
        else {
          console.log('EtherDelta ether contract loaded');
          this.contractEtherDelta = contract;
          utility.loadContract(
            transactor.web3,
            'etherdelta.github.io/smart_contract/token.sol',
            this.config.ethAddr,
            (err, contract) => {
              if (err) callback(err);
              else {
                console.log('EtherDelta token contract loaded');
                this.contractToken = contract;
                callback(undefined, this);
              }
            }
          );
        }
    });
  }

  getBalance() {

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
      this.transactor.getBalance((err, result) => {
        if (err) callback(err);
        if (amount.gt(result) && amount.lt(result.times(new BigNumber(1.1)))) amount = result;
        if (amount.lte(result)) {
          utility.send(
            this.transactor.web3,
            this.contractEtherDelta,
            this.config.contractEtherDeltaAddrs[0].addr,
            'deposit',
            [{ gas: this.config.gasDeposit, value: amount.toNumber() }],
            this.transactor.address,
            this.transactor.privateKey,
            this.nonce,
            (errSend, resultSend) => {
              if (errSend) callback(errSend);
              else {
                this.nonce = resultSend.nonce;
                // TODO
                console.log('Transaction hash:', resultSend.txHash);
              }
            });
        } else {
          callback("You don't have enough Ether");
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
                      // TODO
                      ts.forEach((resultSend, index) => {
                        console.log('Transaction', index, 'hash:', resultSend.txHash);
                      });
                    }
                  });
              } else {
                callback("You don't have enough tokens");
              }
            });
        });
    }
  }
}

class Bittrex extends Website {
  constructor(transactor, apiKey, secretKey) {
    super(transactor);
    this.apiKey = apiKey;
    this.secretKey = secretKey;
  }

  request(uri, qs, callback) {
    let nonce = new Date().getTime();
    let params = Object.assign(qs, {
      apikey: this.apiKey,
      nonce: nonce
    });
    uri = uri + '?' + querystring.stringify(params);
    let sign = crypto.createHmac('sha512', this.secretKey).update(uri).digest('hex');

    let options = {
      uri: uri,
      headers: {
        'apisign': sign
      }
    }

    request(options, (err, response, body) => {
      let res = JSON.parse(body);
      if (err) callback(err);
      else if (!res.success) callback(res.message);
      else callback(null, res);
    });
  }

  getDepositAddress(currency, callback) {
    this.request('https://bittrex.com/api/v1.1/account/getdepositaddress', {
      currency: currency
    }, (err, res) => {
      if (err) callback(err);
      else {
        let address = res.result.Address;
        callback(null, address);
      }
    });
  }

  getBalance(currency, callback) {
    this.request('https://bittrex.com/api/v1.1/account/getbalance', {
      currency: currency
    }, (err, res) => {
      if (err) callback(err);
      else {
        let balance = res.result.Balance;
        callback(null, balance);
      }
    });
  }

  withdraw(currency, quantity, address, callback) {
    this.request('https://bittrex.com/api/v1.1/account/withdraw', {
      currency: currency,
      quantity: quantity,
      address: address
    }, (err, res) => {
      if (err) callback(err);
      else {
        let uuid = res.result.uuid;
        let interval = setInterval(() => {
          this.request('https://bittrex.com/api/v1.1/account/getwithdrawalhistory', {
            currency: currency
          }, (err, res2) => {
            if (err) return;
            else {
              let found = res2.result.find((elem) => {
                return elem.PaymentUuid == uuid;
              });
              if (found) {
                clearInterval(interval);
                callback(null);
              }
            }
          });
        }, 60000);
      }
    });
  }
}

class Liqui extends Website {
  constructor(transactor, apiKey, secretKey, depositAddresses) {
    super(transactor);
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.depositAddresses = depositAddresses;
  }

  request(uri, qs, callback) {
    let nonce = this.getNonce();
    qs = '?' + querystring.stringify(qs);
    let sign = crypto.createHmac('sha512', this.secretKey).update(qs).digest('hex');
    uri = uri + qs;

    let options = {
      uri: uri,
      headers: {
        'Key': this.apiKey,
        'Sign': sign
      }
    }

    request(options, (err, response, body) => {
      callback(err, response, body);
    });
  }

  getDepositAddress(currency, callback) {
    return this.depositAddresses;
  }

  getBalances(callback) {
    this.request('https://api.liqui.io/api/3/getInfo', {}, (err, response, body) => {
      if (err) callback(err);
      else {
        let balances = JSON.parse(body).funds;
        Object.keys(balances).forEach((key) => {
          balances[key.toUpperCase()] = balances[key];
          delete balances[key];
        });
        callback(null, balances);
      }
    });
  }

  getBalance(currency, callback) {
    this.getBalances((err, balances) => {
      if (err) callback(err);
      else {
        let balance = balances[currency];
        callback(null, balance);
      }
    });
  }
}

class Kraken extends Website {
  constructor(transactor, apiKey, secretKey) {
    super(transactor);
    this.apiKey = apiKey;
    this.secretKey = secretKey;
  }

  request(uri, qs, callback) {
    let nonce = new Date().getTime();
    qs = querystring.stringify({
      nonce: nonce
    });
    let hash = crypto.createHash('sha256').update(nonce + qs);
    let sign = crypto.createHmac('sha512', uri + hash).update(uri).digest('hex');

    let options = {
      uri: uri + '?' + qs,
      headers: {
        'API-Key': this.apiKey,
        'API-Sign': sign
      }
    }

    request(options, (err, response, body) => {
      callback(err, response, body);
    });
  }
}


module.exports = {
  Bittrex,
  Liqui,
  EtherDelta
};

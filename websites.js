const request = require('request');
const crypto = require('crypto');
const querystring = require('querystring');
const BigNumber = require('bignumber.js');
const config = require('./etherdelta.github.io/config.js')
const utility = require('./etherdelta.github.io/common/utility.js')(config); // eslint-disable-line global-require
const utils = require('./utils.js');


class EtherDelta {
  constructor(transactor) {
    this.transactor = transactor;
    this.config = config;
    utility.loadContract(
      transactor.web3,
      'etherdelta.github.io/smart_contract/etherdelta.sol',
      this.config.contractEtherDeltaAddrs[0],
      (err, contract) => {
        console.log('EtherDelta ether contract loaded');
        this.contractEtherDelta = contract;
        utility.loadContract(,
          transactor.web3,
          'etherdelta.github.io/smart_contract/token.sol',
          this.config.ethAddr,
          (err, contract) => {
            console.log('EtherDelta token contract loaded');
            this.contractToken = contract;
          }
          );
      });
  }

  getBalance() {

  }

  deposit(tokenAddr, amount, callback) {
    amount = new BigNumber(Number(utility.ethToWei(amount, this.getDivisor(tokenAddr))));
    const token = utils.getToken(tokenAddr);
    if (amount.lte(0)) {
      callback('Invalid deposit amount');
      return;
    }
    if (tokenAddr.slice(0, 39) === '0x0000000000000000000000000000000000000') {
      this.transactor.getBalance((err, result) => {
        if (amount.gt(result) && amount.lt(result.times(new BigNumber(1.1)))) amount = result;
        if (amount.lte(result)) {
          utility.send(
            this.transactor.web3,
            this.contractEtherDelta,
            this.config.contractEtherDeltaAddrs[0],
            'deposit',
            [{ gas: this.config.gasDeposit, value: amount.toNumber() }],
            this.transactor.address,
            this.transactor.privateKey,
            this.nonce,
            (errSend, resultSend) => {
              this.nonce = resultSend.nonce;
              // TODO
              this.addPending(errSend, { txHash: resultSend.txHash });
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
                    const [tx1, tx2] = results;
                    const errSend1 = tx1 ? tx1.errSend1 : undefined;
                    const errSend2 = tx2 ? tx2.errSend1 : undefined;
                    // TODO
                    this.addPending(errSend1 || errSend2, txs);
                  });
              } else {
                callback("You don't have enough tokens");
              }
            });
        });
    }
  }
}

class Bittrex {
  constructor(apiKey, secretKey) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
  }

  request(uri, qs, callback) {
    let nonce = new Date().getTime();
    uri = uri + '?' + querystring.stringify({
      apikey: this.apiKey,
      nonce: nonce
    });
    let sign = crypto.createHmac('sha512', this.secretKey).update(uri).digest('hex');

    let options = {
      uri: uri,
      headers: {
        'apisign': sign
      }
    }

    request(options, (err, response, body) => {
      callback(err, response, body);
    });
  }

  getDepositAddress(currency, callback) {
    this.request('https://bittrex.com/api/v1.1/account/getdepositaddress', {
      currency: currency
    }, (err, response, body) => {
      if (err) callback(err);
      else {
        let address = JSON.parse(body).result.Address;
        callback(null, address);
      }
    });
  }

  getBalance(currency, callback) {
    this.request('https://bittrex.com/api/v1.1/account/getbalance', {
      currency: currency
    }, (err, response, body) => {
      if (err) callback(err);
      else {
        let balance = JSON.parse(body).result.Balance;
        callback(null, balance);
      }
    });
  }

  withdraw(currency, quantity, address, callback) {
    this.request('https://bittrex.com/api/v1.1/account/withdraw', {
      currency: currency,
      quantity: quantity,
      address: address
    }, (err, response, body) => {
      if (err) callback(err);
      else {
        let uuid = JSON.parse(body).result.uuid;
        let interval = setInterval(() => {
          this.request('https://bittrex.com/api/v1.1/account/getwithdrawalhistory', {
            currency: currency
          }, (err, response2, body2) => {
            if (err) return null;
            else {
              let found = JSON.parse(body2).result.find((elem) => {
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

class Liqui {
  constructor(apiKey, secretkey, depositAddresses) {
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

class Kraken {
  constructor(apiKey, secretKey) {
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


module.exports = {Bittrex, Liqui};

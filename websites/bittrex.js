const Website = require('./website.js');
const querystring = require('querystring');
const crypto = require('crypto');
const request = require('request');


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

  waitForWithdrawal(uuid, currency, callback) {
    this.request('https://bittrex.com/api/v1.1/account/getwithdrawalhistory', {
      currency: currency
    }, (err, res) => {
      if (err) callback(err);
      else {
        let found = res.result.find((elem) => {
          return elem.PaymentUuid == uuid;
        });
        if (found) {
          callback(null);
        }
        else {
          setTimeout(() => {
            this.waitForWithdrawal(uuid, currency, callback);
          }, 20000);
        }
      }
    });
  }

  withdraw(currency, quantity, callback) {
    this.request('https://bittrex.com/api/v1.1/account/withdraw', {
      currency: currency,
      quantity: quantity,
      address: this.transactor.address
    }, (err, res) => {
      if (err) callback(err);
      else {
        let uuid = res.result.uuid;
        console.log('Withdrawal submitted');
        this.waitForWithdrawal(uuid, currency, callback);
      }
    });
  }

  getOrders(baseCurrency, tradeCurrency, limit, callback) {
    let options = {
      uri: 'https://bittrex.com/api/v1.1/public/getorderbook',
      qs: {
        market: baseCurrency + '-' + tradeCurrency,
        type: 'both', // TEMP
        depth: limit
      }
    }
    request(options, (err, response, body) => {
      if (err) callback(err);
      else {
        let orders = JSON.parse(body);
        callback(undefined, {
          buy: orders.result.buy.map((elem) => {
            return {
              quantity: elem.Quantity,
              price: elem.Rate
            }
          }),
          sell: orders.result.sell.map((elem) => {
            return {
              quantity: elem.Quantity,
              price: elem.Rate
            }
          })
        });
      }
    });
  }

  placeBuyOrder(baseCurrency, tradeCurrency, quantity, price, callback) {
    let options = {
      uri: 'https://bittrex.com/api/v1.1/market/buylimit',
      qs: {
        market: baseCurrency + '-' + tradeCurrency,
        quantity: quantity,
        rate: price
      }
    }
    request(options, (err, res) => {
      if (err) callback(err);
      else callback(undefined, res.result.uuid);
    });
  }

  placeSellOrder(baseCurrency, tradeCurrency, quantity, price, callback) {
    let options = {
      uri: 'https://bittrex.com/api/v1.1/market/selllimit',
      qs: {
        market: baseCurrency + '-' + tradeCurrency,
        quantity: quantity,
        rate: price
      }
    };
    request(options, (err, res) => {
      if (err) callback(err);
      else callback(undefined, res.result.uuid);
    });
  }

  cancelOrder(uuid, callback) {
    let options = {
      uri: 'https://bittrex.com/api/v1.1/market/cancel',
      qs: {
        uuid: uuid
      }
    };
    request(options, (err, res) => {
      if (err) callback(err);
      else callback(undefined);
    });
  }
}

module.exports = Bittrex;

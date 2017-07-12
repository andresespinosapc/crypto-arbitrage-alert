const request = require('request');
const crypto = require('crypto');
const querystring = require('querystring');


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
          }, (err2, response2, body2) => {
            if (err2) return null;
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
  constructor(apiKey, secretkey) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
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
}

class Kraken {
  constructor(apiKey, secretKey) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
  }

  request(uri, qs, callback) {
    let nonce = new Date().getTime();
    let qs = querystring.stringify({
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

module.exports = {Bittrex};

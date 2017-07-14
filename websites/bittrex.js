let Website = require('./website.js');

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

  waitForWithdrawal(uuid, callback) {
    let interval = setInterval(() => {
      this.request('https://bittrex.com/api/v1.1/account/getwithdrawalhistory', {
        currency: currency
      }, (err, res) => {
        if (err) callback(err);
        else {
          let found = res.result.find((elem) => {
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

  withdraw(currency, quantity, address, callback) {
    this.request('https://bittrex.com/api/v1.1/account/withdraw', {
      currency: currency,
      quantity: quantity,
      address: address
    }, (err, res) => {
      if (err) callback(err);
      else {
        let uuid = res.result.uuid;
        this.waitForWithdrawal(uuid, callback);
      }
    });
  }
}

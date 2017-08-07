let Website = require('./website.js');

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
      let res = JSON.parse(body);
      if (err) callback(err);
      else if (!res.success) callback(res.error);
      else callback(undefined, res);
    });
  }

  getTickerPromise(currency, callback) {
    return new Promise((resolve, reject) => {
      let name = currency.toLowerCase() + '_eth';
      this.request('https://api.liqui.io/api/3/ticker/' + name, {}, (err, res) => {
        if (err) reject(err);
        else {
          let data = res[name];
          resolve({
            last: data.last,
            ask: data.sell,
            bid: data.buy,
            dailyVolume: data.vol
          });
        }
      });
    });
  }

  getDepositAddress(currency, callback) {
    callback(undefined, this.depositAddresses[currency]);
  }

  getWithdrawalFee(currency, amount, callback) {
    request('https://api.liqui.io/api/3/info', {}, (err, res) => {
      if (err) callback(err);
      else {
        let name = currency.toLowerCase() + '_eth';
        let currencyInfo = res.result.pairs[name];
        if (currencyInfo) {
          callback(undefined, currencyInfo.fee);
        }
        else {
          callback('Invalid currency');
        }
      }
    });
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

module.exports = Liqui;

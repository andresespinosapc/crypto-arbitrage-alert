let Website = require('./website.js');

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
      let res = JSON.parse(body);
      if (err) callback(err);
      else if (res.error.length > 0) callback(res.error[0]);
      else callback(undefined, res);
    });
  }

  getTickerPromise(currency, callback) {
    return new Promise((resolve, reject) => {
      this.request('https://api.kraken.com/0/public/Ticker', {
        pair: currency.toLowerCase() + 'eth'
      }, (err, res) => {
        if (err) callback(err);
        else {
          let data = res.result[currency + 'ETH'];
          try {
            resolve({
              last: data.c[0],
              ask: data.a[0],
              bid: data.b[0],
              dailyVolume: data.v[1]
            });
          }
          catch (err) {
            reject('Some data is missing');
          }
        }
      });
    });
  }
}

module.exports = Kraken;

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
      callback(err, response, body);
    });
  }
}

module.exports = Kraken;

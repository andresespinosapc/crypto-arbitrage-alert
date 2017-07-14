const request = require('request');
const crypto = require('crypto');
const querystring = require('querystring');
const BigNumber = require('bignumber.js');
const config = require('./etherdelta.github.io/config.js')
const utility = require('./etherdelta.github.io/common/utility.js')(config); // eslint-disable-line global-require
const utils = require('./utils.js');
//const locks = require('locks');


class Website {
  constructor(transactor) {
    this.transactor = transactor;
  }

  deposit(currency, value, callback) {
    this.getDepositAddress(currency, (err, depositAddress) => {
      if (err) callback(err);
      else {
        this.transactor.transact(depositAddress, value, {}, (err, hash) => {
          if (err) callback(err);
          else {
            console.log('Transaction hash:', hash);
            this.waitForDeposit(hash, callback);
          }
        });
      }
    });
  }
}

module.exports = Website;

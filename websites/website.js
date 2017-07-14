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

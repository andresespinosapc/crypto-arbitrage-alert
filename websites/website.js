class Website {
  constructor(transactor) {
    this.transactor = transactor;
  }

  deposit(currency, amount, callback) {
    this.getDepositAddress(currency, (err, depositAddress) => {
      if (err) callback(err);
      else {
        this.transactor.transact(currency, depositAddress, amount, {}, (err, hash) => {
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

let Website = require('./website.js');

class EtherDelta extends Website{
  constructor(transactor, callback) {
    super(transactor);
    this.config = config;
    this.config.contractEtherDeltaAddr = this.config.contractEtherDeltaAddrs[0].addr;
    utility.loadContract(
      transactor.web3,
      'etherdelta.github.io/smart_contract/etherdelta.sol',
      this.config.contractEtherDeltaAddr,
      (err, contract) => {
        if (err) callback(err);
        else {
          console.log('EtherDelta ether contract loaded');
          this.contractEtherDelta = contract;
          utility.loadContract(
            transactor.web3,
            'etherdelta.github.io/smart_contract/token.sol',
            this.config.ethAddr,
            (err, contract) => {
              if (err) callback(err);
              else {
                console.log('EtherDelta token contract loaded');
                this.contractToken = contract;
                callback(undefined, this);
              }
            }
          );
        }
    });
  }

  getDivisor(tokenOrAddress) {
    let result = 1000000000000000000;
    const token = utils.getToken(tokenOrAddress);
    if (token && token.decimals !== undefined) {
      result = Math.pow(10, token.decimals); // eslint-disable-line no-restricted-properties
    }
    return new BigNumber(result);
  };

  deposit(currency, value, callback) {
    const token = utils.getToken(currency);
    const tokenAddr = token.addr;
    let amount = new BigNumber(Number(utility.ethToWei(value, this.getDivisor(tokenAddr))));
    if (amount.lte(0)) {
      callback('Invalid deposit amount');
      return;
    }
    if (tokenAddr.slice(0, 39) === '0x0000000000000000000000000000000000000') {
      this.transactor.getBalance('ETH', (err, balance) => {
        if (amount.gt(balance) && amount.lt(balance.times(new BigNumber(1.1)))) amount = balance;
        if (amount.lte(balance)) {
          utility.send(
            this.transactor.web3,
            this.contractEtherDelta,
            this.config.contractEtherDeltaAddr,
            'deposit',
            [{ gas: this.config.gasDeposit, value: amount.toNumber() }],
            this.transactor.address,
            this.transactor.privateKey,
            this.nonce,
            (errSend, resultSend) => {
              if (errSend) callback(errSend);
              else {
                this.nonce = resultSend.nonce;
                console.log('Transaction hash:', resultSend.txHash);
                this.transactor.waitForTransaction(resultSend.txHash, callback);
              }
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
                    if (err) callback(err);
                    else {
                      const [tx1, tx2] = results;
                      const errSend1 = tx1 ? tx1.errSend1 : undefined;
                      const errSend2 = tx2 ? tx2.errSend1 : undefined;

                      async.parallel([
                        (parallelCallback) => {
                          let hash = txs[0].txHash;
                          console.log('Transaction 1 hash:', hash);
                          this.transactor.waitForTransaction(hash, parallelCallback);
                        },
                        (parallelCallback) => {
                          let hash = txs[1].txHash;
                          console.log('Transaction 2 hash:', hash);
                          this.transactor.waitForTransaction(hash, parallelCallback);
                        }
                      ], callback);
                    }
                  });
              } else {
                callback("You don't have enough tokens");
              }
            });
        });
    }
  }

  withdraw(currency, value, callback) {
    const token = utils.getToken(currency);
    const tokenAddr = token.addr;
    let amount = new BigNumber(Number(utility.ethToWei(value, this.getDivisor(tokenAddr))));
    if (amount.lte(0)) {
      calback('You must specify a valid amount to withdraw');
      return;
    }
    utility.call(
      this.transactor.web3,
      this.contractEtherDelta,
      this.config.contractEtherDeltaAddr,
      'balanceOf',
      [tokenAddr, this.transactor.address]],
      (err, result) => {
        const balance = result;
        // if you try to withdraw more than your balance, the amount
        // will be modified so that you withdraw your exact balance:
        if (amount > balance) {
          amount = balance;
        }
        if (amount.lte(0)) {
          callback('You don\'t have anything to withdraw');
          return;
        } else if (tokenAddr.slice(0, 39) === '0x0000000000000000000000000000000000000') {
          utility.send(
            this.transactor.web3,
            this.contractEtherDelta,
            this.config.contractEtherDeltaAddr,
            'withdraw',
            [amount, { gas: this.config.gasWithdraw, value: 0 }],
            this.transactor.address,
            this.transactor.privateKey,
            this.nonce,
            (errSend, resultSend) => {
              this.nonce = resultSend.nonce;
              console.log('Transaction hash:', resultSend.txHash);
              this.transactor.waitForTransaction(resultSend.txHash, callback);
            });
        } else {
          utility.send(
            this.transactor.web3,
            this.contractEtherDelta,
            this.config.contractEtherDeltaAddr,
            'withdrawToken',
            [tokenAddr, amount, { gas: this.config.gasWithdraw, value: 0 }],
            this.address,
            this.privateKey,
            this.nonce,
            (errSend, resultSend) => {
              this.nonce = resultSend.nonce;
              console.log('Transaction hash:', resultSend.txHash);
              this.transactor.waitForTransaction(resultSend.txHash, callback);
        }
      });
  };
}

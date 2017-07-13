const Tx = require('ethereumjs-tx')
const Web3 = require('web3')
const utils = require('./utils')
const BigNumber = require('bignumber.js');
const ethUtil = require('ethereumjs-util')
const websites = require('./websites.js');
const defaultGasPrice = 2 // 2 gWei
const defaultGasLimit = 100000 // 100.000

function TS() {}

TS.init = function({provider, privateKey}={})
{
  this.web3 = new Web3(new Web3.providers.HttpProvider(provider))
  this.privateKey = privateKey
  this.address = '0x' + ethUtil.privateToAddress(privateKey).toString('hex')
}

TS.transact = function(to, value, {gasPrice=defaultGasPrice, gasLimit=defaultGasLimit, data='', nonce=null}={})
{
  if(nonce===null){
    var nonce = this.web3.eth.getTransactionCount(this.address)
  }
  var params = {
    nonce:nonce,
    gasPrice: '0x' + new BigNumber(this.web3.toWei(gasPrice, 'gwei')).toString(16),
    gasLimit:gasLimit,
    to:to,
    value: '0x' + new BigNumber(this.web3.toWei(value, 'ether')).toString(16),
    data:data
  }
  var tx = new Tx(params);
  tx.sign(this.privateKey)
  var serializedTx = tx.serialize()
  txHash = this.web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'))
  return txHash
}

TS.sendToken = function(tokenIdentifier, to, amount, {funcName='transfer',
                        value=0, gasPrice=defaultGasPrice, gasLimit=defaultGasLimit,
                        nonce=null}={})
{
  var token = utils.getToken(tokenIdentifier)
  console.log(token)
  if(token === null)
  {
    console.log('Token ' + tokenIdentifier + ' not found')
    console.log('Could not make transaction')
  }
  var abi = utils.getAbi(token.addr)
  var contract = this.web3.eth.contract(abi)
  var ci = contract.at(token.addr)
  var func = ci[funcName]
  amount = utils.amountToarg(amount, token.decimals)
  console.log(amount)
  var callData = func.getData(to, amount)
  return this.transact(token.addr, value, {data:callData, gasPrice,
                        gasLimit:gasLimit, nonce:nonce})
}


TS.moveCoin = function moveCoin(initialWebsite, finalWebsite, currency, value, callback) {
  initialWebsite.withdraw(currency, value, this.address, (err) => {
    if (err) callback(err);
    else {
      console.log('Withdrawal successful');
      // Get current balance from the final website
      finalWebsite.getBalance(currency, (err, initialBalance) => {
        if (err) callback(err);
        else {
          console.log('Initial balance:', initialBalance);
          let hash = TS.transact(this.privateKey, finalWebsite.getDepositAddress(currency), value=value);
          console.log('Transaction hash:', hash);
          let interval = setInterval(() => {
            finalWebsite.getBalance(currency, (err, currentBalance) => {
              if (err) callback(err);
              else {
                if (currentBalance > balance) {
                  console.log('Deposit successful');
                  clearInterval(interval);
                  callback(null);
                }
              }
            });
          }, 60000);
        }
      });
    }
  });
}

module.exports = TS

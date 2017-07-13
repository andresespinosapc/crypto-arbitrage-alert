const Tx = require('ethereumjs-tx')
const Web3 = require('web3')
const BigNumber = require('bignumber.js');
const ethUtil = require('ethereumjs-util')
const defaultGasPrice = 2 // 2 gWei
const defaultGasLimit = 100000 // 100.000

function TS() {}

TS.init = function({provider, privateKey}={})
{
  this.web3 = new Web3(new Web3.providers.HttpProvider(provider))
  this.privateKey = privateKey
  this.address = '0x' + ethUtil.privateToAddress(privateKey).toString('hex')
}

TS.transact = function({to, value=0, gasPrice=defaultGasPrice, gasLimit=defaultGasLimit, data='', nonce=null}={})
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
  return tx
  var serializedTx = tx.serialize()
  return serializedTx;
  txHash = this.web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'))
}

TS.sendToken = function({tokenAddress}){}

module.exports = TS

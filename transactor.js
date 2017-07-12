const Tx = require('ethereumjs-tx')
const Web3 = require('web3')
const ethUtil = require('ethereumjs-util')
const defaultGasPrice = '0x77359400' // 2 gWei
const defaultGasLimit = '0x286a0' // 100.000

function TS() {}

TS.init = function(provider)
{
  this.web3 = new Web3(new Web3.providers.HttpProvider(provider))
}

TS.transact = function(privateKey, to, value=0, nonce=null, gasPrice=defaultGasPrice, data='', gasLimit=defaultGasLimit)
{
  if(nonce===null){
    var from = ethUtil.privateToAddress(privateKey);
    var nonce = '0x' + this.web3.eth.getTransactionCount('0x' + from.toString('hex')).toString(10)
  }
  var params = {
    nonce:nonce,
    gasPrice:gasPrice,
    gasLimit:gasLimit,
    to:to,
    value:value,
    data:data
  }

  var tx = new Tx(params)
  tx.sign(priv)
  var serializedTx = tx.serialize()
  txHash = this.web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'))
  return txHash
}

module.exports = TS

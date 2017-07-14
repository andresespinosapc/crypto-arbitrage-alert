const Tx = require('ethereumjs-tx')
const Web3 = require('web3')
const utils = require('./utils')
const BigNumber = require('bignumber.js');
const ethUtil = require('ethereumjs-util')
const websites = require('./websites.js');
const defaultGasPrice = 2 // 2 gWei
const defaultGasLimit = 100000 // 100.000
const ethAddress ='0x0000000000000000000000000000000000000000'


function TS() {}

TS.init = function(provider, privateKey)
{
  this.web3 = new Web3(new Web3.providers.HttpProvider(provider))
  this.privateKey = privateKey
  this.address = '0x' + ethUtil.privateToAddress(privateKey).toString('hex')
}

TS.ethBalance = function(callback)
{
  this.web3.eth.getBalance(this.address, (err,balance)=>{
    if(err) callback(err);
    else callback(new BigNumber(this.web3.fromWei(balance, 'ether')));
  });
}

TS.getBalance = function(identifier, callback)
{
  if(callback===undefined){
    callback = identifier;
    identifier = ethAddress;
  }
  console.log(callback)
  console.log(identifier)
  if(identifier===ethAddress || identifier==='ETH') this.ethBalance(callback);
  else{
    let token = utils.getToken(identifier)
    let abi = utils.getAbi(token.addr)
    let contract = this.web3.eth.contract(abi)
    let ci = contract.at(token.addr)
    // TODO let funcName = utils.getBalanceName(token.addr)
    let funcName = 'balanceOf'
    let func = ci[funcName]
    let data = func.getData(this.address)
    this.web3.eth.call({to:token.addr, data:data}, (err,balance)=>{
      if(err) callback(err);
      else callback(utils.argToAmount(balance, token.decimals));
    });
  }
}

TS.transact = function(to, value, options, callback){
  var func = function(parent, nonce)
  {
    gasPrice = "gasPrice" in options ?
    '0x'+new BigNumber(parent.web3.toWei(options.gasPrice, 'gwei')).toString(16):
    defaultGasPrice;
    var params = {
      nonce:nonce,
      gasPrice:gasPrice,
      gasLimit:"gasLimit" in options ? gasLimit:defaultGasLimit,
      to:to,
      value: '0x'+new BigNumber(parent.web3.toWei(value, 'ether')).toString(16),
      data:"data" in options ? options.data:''
    };
    let tx = new Tx(params);
    console.log(params);
    tx.sign(parent.privateKey);
    let serializedTx = tx.serialize();
    parent.web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'),
    (err,txHash)=>{
      if(err) callback(err);
      else callback(undefined, txHash);
    });
  }
  if("nonce" in options) func(this, options.nonce);
  else{
    this.web3.eth.getTransactionCount(this.address, (err, value)=>{
      if(err) callback(err);
      else func(this, value);
    });
  }
}

TS.sendToken = function(tokenIdentifier, to, amount, {funcName='transfer',
                        value=0, gasPrice=defaultGasPrice, gasLimit=defaultGasLimit,
                        nonce=null}={})
{
  let token = utils.getToken(tokenIdentifier)
  if(token === null)
  {
    console.log('Token ' + tokenIdentifier + ' not found')
    console.log('Could not make transaction')
  }
  if(token.addr=ethAddress) {
  }
  else{
    let abi = utils.getAbi(token.addr)
    let contract = this.web3.eth.contract(abi)
    let ci = contract.at(token.addr)
    let func = ci[funcName]
    amount = utils.amountToarg(amount, token.decimals)
    let callData = func.getData(to, amount)
    this.transact(token.addr, value, {data:callData, gasPrice:gasPrice,
                          gasLimit:gasLimit, nonce:nonce})
  }
}

TS.waitConfirmation = function(txHash, callback)
{
  var filter = web3.eth.filter('latest');
}

TS.moveCoin = function moveCoin(initialWebsite, finalWebsite, currency, value, callback) {
  initialWebsite.withdraw(currency, value, this.address, (err) => {
    if (err) callback(err);
    else {
      console.log('Withdrawal successful');
      // Get current balance from the final website
      finalWebsite.deposit(TS, currency, value, (err) => {
        if (err) callback(err);
        else {
          console.log('Deposit successful');
        }
      });
    }
  });
}


module.exports = TS

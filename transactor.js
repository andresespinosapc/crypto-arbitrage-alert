const Tx = require('ethereumjs-tx')
const Web3 = require('web3')
const utils = require('./utils')
const BigNumber = require('bignumber.js');
const ethUtil = require('ethereumjs-util');
const request = require('request');
const defaultGasPrice = 2 // 2 gWei
const defaultGasLimit = 100000 // 100.000
const ethAddress ='0x0000000000000000000000000000000000000000'
const etherScanUri= 'https://api.etherscan.io/api'
const etherScanApiKey = 'TYM3NSAF9RIAFSNRU5RZJQHI71C784FNK6' // TODO temporal


function TS() {}

TS.init = function(provider, privateKey)
{
  this.web3 = new Web3(new Web3.providers.HttpProvider(provider))
  this.privateKey = privateKey
  this.address = '0x' + ethUtil.privateToAddress(privateKey).toString('hex')
}

TS.waitForTransaction = function(txHash, callback)
{
  console.log('Waiting for ' + txHash);
  web3.eth.getTransactionReceipt(txHash, (err,receipt)=>{
    if(err) {clearTimeout(interval); callback(err);}
    else if (receipt && receipt.transactionHash===txHash) {
      console.log("Got TX receipt, checking contract");
      let params = {
        module:'transaction',
        action:'getstatus',
        txhash:txHash,
        apikey:etherScanApiKey
      };
      request({uri:etherScanUri, qs:params}, (err,response, body)=>{
        let res = JSON.parse(body);
        if(err) {console.log('request error'); callback(err);}
        else if(res.status!="1") callback(res.message);
        else if(res.result.isError=="1")
          callback('[ERR] ' + res.result.errDescription + ' (' + txHash + ')');
        else callback(undefined, receipt);
      });
    } else setTimeout(()=>{this.waitForTransaction(txHash, callback)}, 2000);
  });
}

TS.__waitForTransaction = function (txHash, callback) {
  console.log('Begin watching for transaction')
  this.web3.eth.filter('latest', (err,result)=>{
    if(err) {console.log('watch error'); callback(err);}
    else{
      console.log("New Block")
      this.web3.eth.getTransaction(txHash, (err,tx)=>{
        if(err) {console.log('get Transaction error'); callback(err);}
        else if(tx.blockNumber!==null)
        {
          console.log('Transaction mined')
          this.web3.eth.getTransactionReceipt(txHash, (err,receipt)=>{
            if (err) {console.log('receipt error'); callback(err);}
            else{
              console.log("Got TX receipt, checking contract")
              let params = {
                module:'transaction',
                action:'getstatus',
                txhash:txHash,
                apikey:etherScanApiKey
              };
              request({uri:etherScanUri, qs:params}, (err,response, body)=>{
                let res = JSON.parse(body);
                if(err) {console.log('request error'); callback(err);}
                else if(res.status!="1") callback(res.message);
                else if(res.result.isError=="1")
                  callback('[ERR] ' + res.result.errDescription + ' (' + txHash + ')');
                else callback(undefined, receipt);
                filter.stopWatching();
              });
            }
          });
        };
      });
    }
  });
};

TS.ethBalance = function(callback){
  this.web3.eth.getBalance(this.address, (err,balance)=>{
    if(err) callback(err);
    else callback(undefined, new BigNumber(this.web3.fromWei(balance, 'ether')));
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
      else callback(undefined, utils.argToAmount(balance, token.decimals));
    });
  }
}

TS.transact = function(to, value, options, callback){
  if (callback === undefined) callback = options;
  var func = function(parent, nonce)
  {
    gasPrice = "gasPrice" in options ?
    '0x'+new BigNumber(parent.web3.toWei(options.gasPrice, 'gwei')).toString(16):
    defaultGasPrice;
    var params = {
      nonce:nonce,
      gasPrice:gasPrice,
      gasLimit:"gasLimit" in options ? options.gasLimit:defaultGasLimit,
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
      else {callback(undefined, txHash);}
    });
  }
  if(options.nonce) func(this, options.nonce);
  else{
    this.web3.eth.getTransactionCount(this.address, (err, value)=>{
      if(err) callback(err);
      else func(this, value);
    });
  }
}

TS.sendToken = function(tokenIdentifier, to, amount, options, callback)
{
  options.gasPrice = options.gasPrice || defaultGasPrice;
  options.gasLimit = options.gasLimit || defaultGasLimit;
  options.nonce = 'nonce' in options ? value.nonce:null;
  let token = utils.getToken(tokenIdentifier)
  if(token === null)
  {
    console.log('Token ' + tokenIdentifier + ' not found')
    console.log('Could not make transaction')
  }
  if(token.addr===ethAddress) {
    console.log('Sending ether');
    console.log(options);
    this.transact(to, amount, options, (err,txHash)=>{
      if(err) callback(err);
      else callback(undefined, txHash);
    });
  }
  else{
    options.value = 'value' in options ? value.options:0;
    console.log('Sending ' + token.name);
    console.log(options);
    let abi = utils.getAbi(token.addr)
    let contract = this.web3.eth.contract(abi)
    let ci = contract.at(token.addr)
    // let funcName = utils.getTransferFuncName(token) // TODO
    let funcName= 'transfer';
    let func = ci[funcName]
    amount = utils.amountToarg(amount, token.decimals)
    let callData = func.getData(to, amount)
    options.data = callData;
    this.transact(token.addr, options.value, options, (err,txHash)=>{
      if(err) callback(err);
      else callback(undefined, txHash);
    })
  }
}

TS.moveCoin = function moveCoin(initialWebsite, finalWebsite, currency, value, callback) {
  initialWebsite.withdraw(currency, value, (err) => {
    if (err) callback(err);
    else {
      console.log('Withdrawal successful');
      // Get current balance from the final website
      finalWebsite.deposit(TS, currency, value, (err) => {
        if (err) callback(err);
        else {
          console.log('Deposit successful');
          callback(undefined);
        }
      });
    }
  });
}


module.exports = TS

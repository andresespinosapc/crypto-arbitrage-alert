const Tx = require('ethereumjs-tx');
const Web3 = require('web3');
const utils = require('./utils');
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

TS.waitForTransaction = function(txHash, callback) {
  console.log('Waiting for ' + txHash);
  this.web3.eth.getTransactionReceipt(txHash, (err,receipt)=>{
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

TS.ethBalance = function(callback) {
  this.web3.eth.getBalance(this.address, (err,balance)=>{
    if(err) callback(err);
    else callback(undefined, new BigNumber(this.web3.fromWei(balance, 'ether')));
  });
}

TS.getBalance = function(tokenIdentifier, callback) {
  let token = utils.getToken(tokenIdentifier);
  if (token.name == 'ETH') this.ethBalance(callback);
  else {
    let abi = utils.getAbi(token.addr)
    let contract = this.web3.eth.contract(abi)
    let ci = contract.at(token.addr)
    // TODO let funcName = utils.getBalanceName(token.addr)
    let funcName = 'balanceOf'
    let func = ci[funcName]
    let data = func.getData(this.address)
    this.web3.eth.call({ to: token.addr, data: data }, (err, balance) => {
      if (err) callback(err);
      //else callback(undefined, utils.argToAmount(balance, token.decimals));
      else callback(undefined, balance);
    });
  }
}

TS.waitForBalance = function(tokenIdentifier, amount, callback) {
  let token = utils.getToken(tokenIdentifier);
  amount = new BigNumber(Number(utility.ethToWei(amount, utils.getDivisor(token.addr))));
  this.getBalance(tokenIdentifier, (err, balance) => {
    if (err) callback(err);
    else {
      if (amount.lte(balance)) {
        callback(undefined);
      }
      else {
        setTimeout(() => {
          this.waitForBalance(tokenIdentifier, amount, callback);
        }, 2000);
      }
    }
  });
}

TS.sendEth = function (to, amount, options, callback) {
  let func = function(web3In, privateKey, nonce) {
    gasPrice = "gasPrice" in options ?
    '0x'+new BigNumber(web3.toWei(options.gasPrice, 'gwei')).toString(16):
    defaultGasPrice;
    var params = {
      nonce:nonce,
      gasPrice:gasPrice,
      gasLimit:"gasLimit" in options ? options.gasLimit:defaultGasLimit,
      to:to,
      amount: '0x'+new BigNumber(web3.toWei(amount, 'ether')).toString(16),
      data:"data" in options ? options.data:''
    };
    let tx = new Tx(params);
    console.log(params);
    tx.sign(privateKey);
    let serializedTx = tx.serialize();
    web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'),
    (err,txHash)=>{
      if(err) callback(err);
      else {callback(undefined, txHash);}
    });
  }
  if (options.nonce) func(this.web3, this.privateKey, options.nonce);
  else {
    this.web3.eth.getTransactionCount(this.address, (err, result)=> {
      if (err) callback(err);
      else func(this.web3, this.privateKey, result);
    });
  }
}

TS.sendToken = function(tokenIdentifier, to, amount, options, callback) {
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

TS.transact = function(tokenIdentifier, to, amount, options, callback) {
  let token = utils.getToken(tokenIdentifier);
  if (token.name == 'ETH') {
    this.sendEth(to, amount, options, callback);
  }
  else {
    this.sendToken(token.addr, to, amount, options, callback);
  }
}

TS.moveCoin = function moveCoin(initialWebsite, finalWebsite, currency, amount, callback) {
  initialWebsite.withdraw(currency, amount, (err) => {
    if (err) callback(err);
    else {
      console.log('Withdrawal successful');
      initialWebsite.getWithdrawalFee(currency, amount, (err, fee) => {
        if (err) callback(err);
        else {
          let transferredAmount = (amount - fee) / 1.0001;

          this.waitForBalance(currency, transferredAmount, (err) => {
            if (err) callback(err);
            else {
              console.log('Your money is now in your account');
              // Get current balance from the final website
              finalWebsite.deposit(currency, transferredAmount, (err) => {
                if (err) callback(err);
                else {
                  console.log('Deposit successful');
                  callback(undefined);
                }
              });
            }
          });
        }
      });
    }
  });
}


module.exports = TS

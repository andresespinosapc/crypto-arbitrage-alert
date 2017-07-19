const BigNumber = require('bignumber.js');
const fs = require('fs');


function utils() {}

utils.amountToarg = function(amount, decimals)
{
  var bn = new BigNumber(amount).times(Math.pow(10, decimals));
  bn = bn.floor()
  return '0x' + bn.toString(16)
}

utils.argToAmount = function(arg, decimals)
{
  return new BigNumber(arg).dividedBy(Math.pow(10, decimals))
}

utils.loadContractSync = function (web3, sourceCode, address) {
  const abi = JSON.parse(fs.readFileSync(`${sourceCode}.interface`))
  let contract = web3.eth.contract(abi);
  contract = contract.at(address);

  return contract;
};

utils.getTokenContract = function(identifier)
{
  }

utils.getAbi = function(identifier)
{
  return JSON.parse(fs.readFileSync('./tokens/token.sol.interface', 'utf8'))
}

utils.getToken = function getToken(identifier)
{
  const lowId = identifier.toLowerCase()
  tokens = require('./tokens/tokens').tokens
  return tokens.find(function(value){
    return value.addr === lowId || value.name === identifier
  })
  return null;
}

utils.decToHex = function decToHex(dec, lengthIn) {
  let length = lengthIn;
  if (!length) length = 32;
  if (dec < 0) {
    // return convertBase((Math.pow(2, length) + decStr).toString(), 10, 16);
    return (new BigNumber(2)).pow(length).add(new BigNumber(dec)).toString(16);
  }
  let result = null;
  try {
    result = utility.convertBase(dec.toString(), 10, 16);
  } catch (err) {
    result = null;
  }
  if (result) {
    return result;
  }
  return (new BigNumber(dec)).toString(16);
};

utils.hexToDec = function hexToDec(hexStrIn, length) {
  // length implies this is a two's complement number
  let hexStr = hexStrIn;
  if (hexStr.substring(0, 2) === '0x') hexStr = hexStr.substring(2);
  hexStr = hexStr.toLowerCase();
  if (!length) {
    return utility.convertBase(hexStr, 16, 10);
  }
  const max = Math.pow(2, length); // eslint-disable-line no-restricted-properties
  const answer = utility.convertBase(hexStr, 16, 10);
  return answer > max / 2 ? max : answer;
};

utils.getDivisor = function getDivisor(tokenOrAddress) {
  let result = 1000000000000000000;
  const token = API.getToken(tokenOrAddress);
  if (token && token.decimals >= 0) {
    result = Math.pow(10, token.decimals); // eslint-disable-line no-restricted-properties
  }
  return new BigNumber(result);
};

utils.ordersByPair = function(orders, addressA, addressB, n)
{
  const topNOrders = [];
  const buys = [];
  const sells = [];
  orders.forEach((order) => {
    if (order.amount > 0 && order.order.tokenGive === addressB &&
    order.order.tokenGet === addressA) {
      buys.push(order);
    } else if (order.amount < 0 && order.order.tokenGive === addressA &&
    order.order.tokenGet === addressB) {
      sells.push(order);
    }
  });
  sells.sort((a, b) => a.price - b.price || a.id - b.id);
  buys.sort((a, b) => b.price - a.price || a.id - b.id);
  a = n ? n: buys.length;
  b = n ? n:sells.length;
  // buys = buys.slice(0, a);
  // sells = sells.slice(0, b);
  return {buy:buys.slice(0, a), sell:sells.slice(0, b)};
}

module.exports = utils


function utils() {}



utils.getDivisor = function getDivisor(tokenOrAddress) {
  let result = 1000000000000000000;
  const token = API.getToken(tokenOrAddress);
  if (token && token.decimals >= 0) {
    result = Math.pow(10, token.decimals); // eslint-disable-line no-restricted-properties
  }
  return new BigNumber(result);
};

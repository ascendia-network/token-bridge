const { hashMessage, getBytes } = require("ethers");

function hashMessageEthers(message) {
  return hashMessage(getBytes(message));
}

module.exports = {
  hashMessageEthers
};
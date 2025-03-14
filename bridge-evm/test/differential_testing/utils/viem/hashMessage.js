const { hashMessage } = require("viem");

function hashMessageViem(message) {
  return hashMessage({ raw: message });
}

module.exports = {
  hashMessageViem
};
const { keccak256, encodePacked } = require('viem');
const { full2mini } = require('../receipt');

function payload2hash(
  destChainId,
  tokenAddress,
  externalTokenAddress,
  amountToSend,
  feeAmount,
  timestamp,
  flags,
  flagData
) {
  const encoded = encodePacked(
    ['uint256', 'bytes32', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes'],
    [destChainId, tokenAddress, externalTokenAddress, amountToSend, feeAmount, timestamp, flags, flagData]
  );
  const messageHash = keccak256(encoded);
  return messageHash;
}

function fullReceipt2hash(
  from,
  to,
  tokenAddressFrom,
  tokenAddressTo,
  amountFrom,
  amountTo,
  chainFrom,
  chainTo,
  eventId,
  flags,
  data
) {
  const mini = full2mini(
    from,
    to,
    tokenAddressFrom,
    tokenAddressTo,
    amountFrom,
    amountTo,
    chainFrom,
    chainTo,
    eventId,
    flags,
    data
  );
  return miniReceipt2hash(mini.to, mini.tokenAddressTo, mini.amountTo, mini.chainFrom, mini.chainTo, mini.eventId, mini.flags, mini.data);
  // const encoded = AbiCoder.defaultAbiCoder().encode(
  //   ['bytes32', 'bytes32', 'bytes32', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes'],
  //     [from, to, tokenAddressFrom, tokenAddressTo, amountFrom, amountTo, chainFrom, chainTo, eventId, flags, data]
  //   )
  // const messageHash = keccak256(encoded);
  // return hashMessage(
  //   getBytes(messageHash)
  // );
}

function miniReceipt2hash(
  to,
  tokenAddressTo,
  amountTo,
  chainFrom,
  chainTo,
  eventId,
  flags,
  data
) {
  const encoded = encodePacked(
    ['bytes32', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes'],
    [to, tokenAddressTo, amountTo, chainFrom, chainTo, eventId, flags, data]
  )
  const messageHash = keccak256(encoded);
  return messageHash;
}

module.exports = {
  payload2hash,
  fullReceipt2hash,
  miniReceipt2hash
};
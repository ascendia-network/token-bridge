function full2mini(
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
  return {
    to,
    tokenAddressTo,
    amountTo,
    chainFrom,
    chainTo,
    eventId,
    flags: BigInt(flags) >> 65n,
    data
  };
}

module.exports = {
  full2mini
};
import { getNativeTokenUSDPrice, getTokenUSDPriceByAddress } from "./token-prices";
import Decimal from "decimal.js";
import { getBridgeFeeInNative } from "./bridgeFee";
import { stageConfig } from "../configs/config";

export async function getFees(
  networkFrom: string,
  networkTo: string,
  tokenAddr: string,
  amount: string,
  isMaxAmount: boolean,
) {
  let amountDecimal = new Decimal(amount);


  const fromCoinPrice = await getNativeTokenUSDPrice(networkFrom);
  const tokenPrice = await getTokenUSDPriceByAddress(networkFrom, tokenAddr);

  const networkFeeConfig = stageConfig.fees.networks[networkFrom];

  let bridgeFeeNative = getBridgeFeeInNative(fromCoinPrice, tokenPrice, amountDecimal, networkFeeConfig.minBridgeFeeUSD);


  // try to calculate max amount of native coins that can be transferred considering fees
  if (isMaxAmount) {
    if (tokenAddr != "0x0000000000000000000000000000000000000000")
      throw new Error("isMaxAmount is only supported for native tokens");
    amountDecimal = amountDecimal.minus(bridgeFeeNative).floor();
    bridgeFeeNative = getBridgeFeeInNative(fromCoinPrice, tokenPrice, amountDecimal, networkFeeConfig.minBridgeFeeUSD);
  }


  bridgeFeeNative = bridgeFeeNative.ceil();


  return {
    feeAmount: bridgeFeeNative.toHex(),
    amountToSend: amountDecimal.toHex(),
  };
}


import { getTokenUSDPriceByAddress } from "./token-prices";
import Decimal from "decimal.js";
import { getBridgeFeeUSD } from "./bridgeFee";
import { stageConfig } from "../../config";
import { usd2Coin } from "./utils";


export async function getFees(
  networkFrom: bigint,
  networkTo: bigint,
  tokenAddr: string,
  amount: bigint,
  isMaxAmount: boolean
): Promise<{ feeAmountUsd: bigint; feeAmount: bigint; amountToSend: bigint }> {

  let amountDecimal = new Decimal(amount.toString());

  const fromCoinPrice = await getTokenUSDPriceByAddress(networkFrom.toString());  // native
  const tokenPrice = await getTokenUSDPriceByAddress(networkFrom.toString(), tokenAddr);

  const networkFeeConfig = stageConfig.fees.networks[networkFrom.toString()];

  let bridgeFeeUSD = getBridgeFeeUSD(tokenPrice, amountDecimal, networkFeeConfig.minBridgeFeeUSD);
  let bridgeFeeNative = usd2Coin(bridgeFeeUSD, fromCoinPrice);

  // try to calculate max amount of native coins that can be transferred considering fees
  if (isMaxAmount) {
    if (!isNative(tokenAddr))
      throw new Error("isMaxAmount is only supported for native tokens");
    amountDecimal = amountDecimal.minus(bridgeFeeNative).floor();
    if (amountDecimal.lte(0)) {
      throw new Error("Amount to send is too small");
    }
    bridgeFeeUSD = getBridgeFeeUSD(tokenPrice, amountDecimal, networkFeeConfig.minBridgeFeeUSD);
  }


  bridgeFeeNative = usd2Coin(bridgeFeeUSD, fromCoinPrice);
  bridgeFeeNative = bridgeFeeNative.ceil();


  return {
    feeAmountUsd: BigInt(bridgeFeeUSD.toHex()),
    feeAmount: BigInt(bridgeFeeNative.toHex()),
    amountToSend: BigInt(amountDecimal.toHex())
  };
}


function isNative(tokenAddr: string) {
  return tokenAddr == "0x0000000000000000000000000000000000000000" || tokenAddr == "11111111111111111111111111111111111111111";
}

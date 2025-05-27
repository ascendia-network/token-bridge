import { getTokenUSDPriceByAddress } from "./token-prices";
import Decimal from "decimal.js";
import { getBridgeFeeInNative } from "./bridgeFee";
import { stageConfig } from "../../config";


export async function getFees(
    networkFrom: bigint,
    networkTo: bigint,
    tokenAddr: string,
    amount: bigint,
    isMaxAmount: boolean
): Promise<{ feeAmount: bigint; amountToSend: bigint }> {

  console.log("getFees called with:", {
    networkFrom,
    networkTo,
    tokenAddr,
    amount,
    isMaxAmount
  });

  let amountDecimal = new Decimal(amount.toString());
  console.log("amountDecimal:", amountDecimal.toString());

  const fromCoinPrice = await getTokenUSDPriceByAddress(networkFrom.toString());  // native
  console.log("fromCoinPrice:", fromCoinPrice);

  const tokenPrice = await getTokenUSDPriceByAddress(networkFrom.toString(), tokenAddr);
  console.log("tokenPrice:", tokenPrice);

  const networkFeeConfig = stageConfig.fees.networks[networkFrom.toString()];
  console.log("networkFeeConfig:", networkFeeConfig);

  let bridgeFeeNative = getBridgeFeeInNative(fromCoinPrice, tokenPrice, amountDecimal, networkFeeConfig.minBridgeFeeUSD);
  console.log("bridgeFeeNative (initial):", bridgeFeeNative.toString());

  // try to calculate max amount of native coins that can be transferred considering fees
  if (isMaxAmount) {
    if (!isNative(tokenAddr))
      throw new Error("isMaxAmount is only supported for native tokens");
    amountDecimal = amountDecimal.minus(bridgeFeeNative).floor();
    console.log("amountDecimal after fee subtraction:", amountDecimal.toString());
    if (amountDecimal.lte(0)) {
      throw new Error("Amount to send is too small");
    }
    bridgeFeeNative = getBridgeFeeInNative(fromCoinPrice, tokenPrice, amountDecimal, networkFeeConfig.minBridgeFeeUSD);
    console.log("bridgeFeeNative (recalculated):", bridgeFeeNative.toString());
  }

  bridgeFeeNative = bridgeFeeNative.ceil();
  console.log("bridgeFeeNative (ceiled):", bridgeFeeNative.toString());

  const result = {
    feeAmount: BigInt(bridgeFeeNative.toHex()),
    amountToSend: BigInt(amountDecimal.toHex())
  };
  console.log("getFees result:", result);

  return result;
}


function isNative(tokenAddr: string) {
  return tokenAddr == "0x0000000000000000000000000000000000000000" || tokenAddr == "11111111111111111111111111111111111111111";
}

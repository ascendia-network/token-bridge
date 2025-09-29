import { convertFromDecimals, getTokenUSDPriceByAddress } from "./token-prices";
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
): Promise<{ feeAmountUsd: Decimal; feeAmount: bigint; amountToSend: bigint }> {

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
  
  let bridgeFeeUSD = getBridgeFeeUSD(tokenPrice, amountDecimal, networkFeeConfig.minBridgeFeeUSD);
  let bridgeFeeNative = usd2Coin(bridgeFeeUSD, fromCoinPrice);

  // try to calculate max amount of native coins that can be transferred considering fees
  if (isMaxAmount) {
    if (!isNative(tokenAddr))
      throw new Error("isMaxAmount is only supported for native tokens");
    amountDecimal = amountDecimal.minus(bridgeFeeNative).floor();
    console.log("amountDecimal after fee subtraction:", amountDecimal.toString());
    if (amountDecimal.lte(0)) {
      throw new Error("Amount to send is too small");
    }
    bridgeFeeUSD = getBridgeFeeUSD(tokenPrice, amountDecimal, networkFeeConfig.minBridgeFeeUSD);
  }


  bridgeFeeNative = usd2Coin(bridgeFeeUSD, fromCoinPrice);
  bridgeFeeNative = bridgeFeeNative.ceil();
  console.log("bridgeFeeNative (ceiled):", bridgeFeeNative.toString());

  console.log(
    `[USD] Bridge fee in USD: ${bridgeFeeUSD.toString()}`
  );
  const result = {
    feeAmountUsd: await convertFromDecimals(bridgeFeeUSD, networkFrom.toString(), tokenAddr),
    feeAmount: BigInt(bridgeFeeNative.toHex()),
    amountToSend: BigInt(amountDecimal.toHex())
  };
  console.log("getFees result:", result);

  return result;
}


function isNative(tokenAddr: string) {
  return tokenAddr == "0x0000000000000000000000000000000000000000" || tokenAddr == "11111111111111111111111111111111111111111";
}

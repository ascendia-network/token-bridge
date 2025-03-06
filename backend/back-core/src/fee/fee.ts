import { getNativeTokenUSDPrice, getTokenUSDPriceByAddress } from "./token-prices";
import Decimal from "decimal.js";
import { getBridgeFeeInNative } from "./bridgeFee";
import { stageConfig } from "../../config";
import bs58 from "bs58";

const EVM_NETWORKS = [
  "amb",
  "base",
  "eth",
  "bsc",
  "amb-test",
  "base-test"
];


export async function getFees(
  networkFrom: string,
  networkTo: string,
  tokenAddr: string,
  amount: bigint,
  isMaxAmount: boolean
): Promise<{ feeAmount: bigint; amountToSend: bigint }> {

  const transformedTokenAddr = transformTokenAddr(networkFrom, tokenAddr);

  let amountDecimal = new Decimal(amount.toString());

  const fromCoinPrice = await getNativeTokenUSDPrice(networkFrom.toString());
  const tokenPrice = await getTokenUSDPriceByAddress(networkFrom.toString(), transformedTokenAddr);

  const networkFeeConfig = stageConfig.fees.networks[networkFrom];

  let bridgeFeeNative = getBridgeFeeInNative(
    fromCoinPrice,
    tokenPrice,
    amountDecimal,
    networkFeeConfig.minBridgeFeeUSD
  );

  // try to calculate max amount of native coins that can be transferred considering fees
  if (isMaxAmount) {
    if (tokenAddr != "0x0000000000000000000000000000000000000000" && tokenAddr != "11111111111111111111111111111111111111111")
      throw new Error("isMaxAmount is only supported for native tokens");
    amountDecimal = amountDecimal.minus(bridgeFeeNative).floor();
    bridgeFeeNative = getBridgeFeeInNative(
      fromCoinPrice,
      tokenPrice,
      amountDecimal,
      networkFeeConfig.minBridgeFeeUSD
    );
  }

  bridgeFeeNative = bridgeFeeNative.ceil();

  return {
    feeAmount: BigInt(bridgeFeeNative.toHex()),
    amountToSend: BigInt(amountDecimal.toHex())
  };
}

function transformTokenAddr(networkFrom: string, tokenAddr: string) {
  if (EVM_NETWORKS.includes(networkFrom)) {
    return "0x" + tokenAddr.slice(26);
  }
  return bs58.encode(Buffer.from(tokenAddr.slice(2), "hex"));
}


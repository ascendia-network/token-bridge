import { getNativeTokenUSDPrice, getTokenUSDPriceByAddress } from "./token-prices";
import Decimal from "decimal.js";
import { ethers } from "ethers";
import { getBridgeFeeInNative } from "./bridgeFee";
import { stageConfig } from "../configs/config";

const SIGNATURE_FEE_TIMESTAMP = 30 * 60; // 30 minutes

export async function getFees(
  networkFrom: string,
  networkTo: string,
  tokenAddr: string,
  amount: string,
  isMaxAmount: boolean,
): Promise<{ bridgeFee: string, amount: string, signature: string } | null> {
  let amountDecimal = new Decimal(amount);


  const fromCoinPrice = await getNativeTokenUSDPrice(networkFrom);
  const tokenPrice = await getTokenUSDPriceByAddress(networkFrom, tokenAddr);

  const networkFeeConfig = stageConfig.fees.networks[networkFrom];

  let bridgeFeeNative = getBridgeFeeInNative(fromCoinPrice, tokenPrice, amountDecimal, networkFeeConfig.minBridgeFeeUSD);


  // try to calculate max amount of native coins that can be transferred considering fees
  if (isMaxAmount) {
    if (tokenAddr != "0x0000000000000000000000000000000000000000") throw new Error("isMaxAmount is only supported for native tokens");
    amountDecimal = amountDecimal.minus(bridgeFeeNative).floor();
    bridgeFeeNative = getBridgeFeeInNative(fromCoinPrice, tokenPrice, amountDecimal, networkFeeConfig.minBridgeFeeUSD);
  }


  bridgeFeeNative = bridgeFeeNative.ceil();
  const signature = await sign(tokenAddr, bridgeFeeNative, amountDecimal);


  return {
    bridgeFee: bridgeFeeNative.toHex(),
    amount: amountDecimal.toHex(),
    signature: signature,
  };
}


async function sign(tokenAddr: string, bridgeFeeNative: Decimal, amountDecimal: Decimal) {
  const timestampEpoch = Date.now() / 1000 / SIGNATURE_FEE_TIMESTAMP;
  const payload = ethers.utils.defaultAbiCoder.encode(
    ["address", "uint", "uint", "uint"],
    [tokenAddr, timestampEpoch, bridgeFeeNative.toHex(), amountDecimal.toHex()]);


  const signer = new ethers.Wallet(feeSignerPK);
  return await signer.signMessage(ethers.utils.arrayify(payload));
}

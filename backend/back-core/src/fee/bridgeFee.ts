import { Decimal } from "decimal.js";
import { coin2Usd, usd2Coin } from "./utils";

const percentFromAmount: { [key: number]: number } = {
  0: 0.0 * 100, // 0.. ...$ => 0%
};


export function getBridgeFeeInNative(nativeUsdPrice: Decimal, tokenUsdPrice: Decimal, amount: Decimal, minBridgeFeeUSD: number): Decimal {
  // Get fee in USD
  const amountUsd = coin2Usd(amount, tokenUsdPrice);
  const feePercent = getFeePercent(amountUsd)
  let feeUsd = amountUsd.times(feePercent).dividedBy(10000);

  // If fee < minBridgeFee, use the minBridgeFee
  if (feeUsd.lessThan(minBridgeFeeUSD))
    feeUsd = new Decimal(minBridgeFeeUSD);


  // Calculate fee in native token
  return usd2Coin(feeUsd, nativeUsdPrice);
}

function getFeePercent(amountInUsdt: Decimal): number {
  let percent = 0;

  // Use lower percent for higher amount
  for (const [minUsdt, percent_] of Object.entries(percentFromAmount)) {
    if (amountInUsdt.lessThan(minUsdt))
      break;
    percent = percent_;
  }

  return percent;
}

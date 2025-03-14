
// Utility functions
import { Decimal } from "decimal.js";

export function coin2Usd(amount: Decimal, priceUsd: Decimal): Decimal {
  return amount.times(priceUsd);
}

export function usd2Coin(amount: Decimal, priceUsd: Decimal): Decimal {
  return amount.dividedBy(priceUsd);
}

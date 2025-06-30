import Decimal from "decimal.js";
import { tokens } from "../utils/tokens2";


export async function getTokenUSDPriceByAddress(networkName: string, tokenAddr?: string) {
  const token = tokens.getToken(networkName, tokenAddr);
  if (!token)
    throw new Error(`Token ${tokenAddr} not found in ${networkName} network`);
  return await getTokenUSDPrice(token.ticker);
}

export async function getTokenUSDPrice(tokenSymbol: string) {
  const price = await cachedPrice.get(`${tokenSymbol}USDT`);
  return new Decimal(price);
}

export async function convertFromDecimals(
  amount: Decimal | bigint | number,
  networkName: string,
  tokenAddr?: string
) {
  const token = tokens.getToken(networkName, tokenAddr);
  if (!token)
    throw new Error(`Token ${tokenAddr} not found in ${networkName} network`);
  const decimals = token.denomination;
  return new Decimal(typeof amount === "bigint" ? amount.toString() : amount).dividedBy(
    new Decimal(10).pow(decimals)
  );
}

export async function convertToDecimals(
  amount: Decimal,
  networkName: string,
  tokenAddr?: string
) {
  const token = tokens.getToken(networkName, tokenAddr);
  if (!token)
    throw new Error(`Token ${tokenAddr} not found in ${networkName} network`);
  const decimals = token.denomination;
  return new Decimal(amount).mul(
    new Decimal(10).pow(decimals)
  );
}

class CachedPrice {
  prices: { [symbol: string]: Decimal } = {};
  lastUpdate: number = 0;

  constructor(public ttl: number = 60 * 1000) {
  }

  async get(tokenSymbol: string) {
    if (Date.now() - this.lastUpdate > this.ttl) {
      this.prices = await _fetchPrices();
      this.lastUpdate = Date.now();
    }
    return this.prices[tokenSymbol];
  }
}

const cachedPrice = new CachedPrice();


async function _fetchPrices() {
  const resp = await fetch("https://api.binance.com/api/v1/ticker/price");
  const data = await resp.json();

  //fetch amb price
  const ambResp = await fetch("https://token.ambrosus.io/");
  const { data: { price_usd: ambPrice } } = await ambResp.json();

  const prices: { [symbol: string]: Decimal } = {};
  data.forEach((item: any) => prices[item.symbol] = new Decimal(item.price));
  prices["AMBUSDT"] = new Decimal(ambPrice);
  return prices;
}

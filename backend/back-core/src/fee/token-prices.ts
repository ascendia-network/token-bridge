import Decimal from 'decimal.js'
import { getToken } from '../utils/tokens'

export const symbolMapping: { [symbol: string]: string } = {
  'SAMB': 'AMB',
  'WBNB': 'BNB',
  'WETH': 'ETH',
}


export async function getNativeTokenUSDPrice(networkName: string) {
  return await getTokenUSDPriceByAddress(networkName, '0x0000000000000000000000000000000000000000')
}

export async function getTokenUSDPriceByAddress(networkName: string, tokenAddr: string) {
  const token = await getToken(networkName, tokenAddr)
  if (!token)
    throw new Error(`Token ${tokenAddr} not found in ${networkName} network`)
  return await getTokenUSDPrice(token.name)
}

export async function getTokenUSDPrice(tokenSymbol: string) {
  if (symbolMapping[tokenSymbol])
    tokenSymbol = symbolMapping[tokenSymbol]

  const price = await cachedPrice.get(tokenSymbol)
  return new Decimal(price)
}


class CachedPrice {
  prices: { [symbol: string]: Decimal } = {}
  lastUpdate: number = 0

  constructor(public ttl: number = 60 * 1000) {
  }

  async get(tokenSymbol: string) {
    if (Date.now() - this.lastUpdate > this.ttl) {
      this.prices = await _fetchPrices()
      this.lastUpdate = Date.now()
    }
    return this.prices[tokenSymbol]
  }
}

const cachedPrice = new CachedPrice()


async function _fetchPrices() {
  const resp = await fetch(`https://api.binance.com/api/v1/ticker/price`)
  const data = await resp.json()

  const prices: { [symbol: string]: Decimal } = {}
  data.forEach((item: any) => prices[item.symbol] = new Decimal(item.price))
  return prices
}

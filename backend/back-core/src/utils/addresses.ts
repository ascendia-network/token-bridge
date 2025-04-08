import type { Hex } from "viem";
import { Base58 } from "ox";


// tokenAddr is 32 bytes padded with 0x00, but we need to remove the padding
export function addressToUserFriendly(tokenAddr: string) {
  if (tokenAddr.startsWith("0x000000000000000000000000"))
    return tokenAddr.replace("0x000000000000000000000000", "0x");

  return Base58.fromHex(tokenAddr as Hex);
}

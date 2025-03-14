import { toHex, toBytes, Address, Hex, encodePacked, keccak256, hashMessage } from "viem";
import { Base58 } from "ox";
import { FullReceipt, MiniReceipt } from "../types/calls";

export function addressToBytes32(address: Address): Hex {
  return toHex(toBytes(address, { size: 32 }));
}
export const evmAddressToBytes32 = addressToBytes32;

export function base58AddressToBytes32(address: string): Hex {
  return toHex(Base58.toBytes(address), { size: 32 });
}
export const solanaAddressToBytes32 = base58AddressToBytes32;

export function gatherSignaturesForClaim(signatures: Array<Hex>): Hex {
  return signatures.reduce((acc, sig) => (acc + sig.slice(2)) as Hex, "0x");
}

function full2mini(
  receipt: FullReceipt
): MiniReceipt {
  return {
    to: receipt.to,
    tokenAddressTo: receipt.tokenAddressTo,
    amountTo: receipt.amountTo,
    chainFrom: receipt.chainFrom,
    chainTo: receipt.chainTo,
    eventId: receipt.eventId,
    flags: receipt.flags,
    data: receipt.data,
  };
}

function fullReceipt2hash(
  receipt: FullReceipt
) {
  const mini = full2mini(receipt);
  return miniReceipt2hash(mini);
}

function miniReceipt2hash(
  receipt: MiniReceipt
) {
  const encoded = encodePacked(
    [
      "bytes32",
      "bytes32",
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "bytes",
    ],
    [
      receipt.to,
      receipt.tokenAddressTo,
      receipt.amountTo,
      receipt.chainFrom,
      receipt.chainTo,
      receipt.eventId,
      receipt.flags,
      receipt.data,
    ]
  );
  const messageHash = keccak256(encoded);
  return messageHash;
}

export function hashReceipt(
  receipt: FullReceipt | MiniReceipt,
) {
  const digest = "from" in receipt ? fullReceipt2hash(receipt) : miniReceipt2hash(receipt);
  return hashMessage({ raw: digest });
}

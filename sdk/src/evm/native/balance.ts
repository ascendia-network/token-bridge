import { Address, PublicClient } from "viem";

export async function checkBalanceNative(
  owner: Address,
  amount: bigint,
  client: PublicClient
): Promise<boolean> {
  const balance = await client.getBalance({
    address: owner,
  });
  if (balance < amount) {
    throw new Error("Insufficient balance");
  }
  return true;
}

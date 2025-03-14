import { Address, erc20Abi, PublicClient } from "viem";

export async function checkAllowance(
  tokenAddress: Address,
  owner: Address,
  spender: Address,
  amount: bigint,
  client: PublicClient
): Promise<boolean> {
  const allowedBalance = await client.readContract({
    abi: erc20Abi,
    address: tokenAddress,
    functionName: "allowance",
    args: [owner, spender],
  });
  if (allowedBalance < amount) {
    throw new Error("Insufficient allowance");
  }
  return true;
}

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

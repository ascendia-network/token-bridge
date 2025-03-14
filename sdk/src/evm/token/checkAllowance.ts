import { Address, erc20Abi, PublicClient } from "viem";

export async function checkAllowanceERC20(
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

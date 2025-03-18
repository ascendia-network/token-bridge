import { beforeEach, describe, expect, test } from "@jest/globals";
// @ts-ignore
import { mock, resetMocks } from "@depay/web3-mock";
import {
  Address,
  createPublicClient,
  custom,
  PublicClient,
  WalletClient,
} from "viem";
import { mainnet } from "viem/chains";
import { evm } from "../../../src/";
import { accountsEvm, blockchainEvm as blockchain } from "../../mocks/contract";

describe("Test token allowance request", () => {
  beforeEach(async () => await resetMocks());
  beforeEach(
    async () =>
      await mock({
        blockchain,
        accounts: { return: accountsEvm },
      })
  );
  let mockedPublicClient: PublicClient;
  const mockedBalance = 10000000000000000000000n;
  let balanceMock: ReturnType<typeof mock>;
  beforeEach(() => {
    mockedPublicClient = createPublicClient({
      chain: mainnet,
      transport: custom((global as any).ethereum),
    });
    balanceMock = mock({
      blockchain,
      balance: {
        for: accountsEvm[0],
        return: mockedBalance.toString(),
      },
    });
  });
  const mockedTokenAddress: Address =
    "0xa0ca672481ECBCea7d4067e13F594B1426f593Ed";
  const mockedSpender: Address = "0xa5cc3c03994DB5b0d9A5eEdD10CabaB0813678AC";
  test("Should request enough balance successfully", async () => {
    await expect(
      evm.helpers.checkBalanceNative(
        accountsEvm[0],
        mockedBalance,
        mockedPublicClient
      )
    ).resolves.toBeTruthy();
    expect(balanceMock).toHaveBeenCalled();
    expect(balanceMock).toHaveBeenCalledTimes(1);
  });
  test("Should fail when not enough balance", async () => {
    await expect(
      evm.helpers.checkBalanceNative(
        accountsEvm[0],
        mockedBalance + 1n,
        mockedPublicClient
      )
    ).rejects.toThrow("Insufficient balance");
    expect(balanceMock).toHaveBeenCalled();
    expect(balanceMock).toHaveBeenCalledTimes(1);
  });
});

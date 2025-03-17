import { afterAll, beforeEach, describe, expect, test } from "@jest/globals";
// @ts-ignore
import { mock, resetMocks } from "@depay/web3-mock";
import { Address, createPublicClient, custom, PublicClient } from "viem";
import { mainnet } from "viem/chains";
import { bridgeAbi } from "../../../src/evm/abi/bridgeAbi";
import {
  amountAdditionalNativeToSend,
  checkIsClaimed,
} from "../../../src/evm/bridge/views";
import { full2miniReceipt } from "../../../src/evm/bridge/helpers";
import { accountsEvm, blockchainEvm as blockchain } from "../../mocks/contract";
import { receipts } from "../../mocks/fixtures/receipt";

describe("Test bridge views requests", () => {
  beforeEach(async () => await resetMocks());
  beforeEach(
    async () =>
      await mock({
        blockchain,
        accounts: { return: accountsEvm },
      })
  );
  let mockedPublicClient: PublicClient;
  beforeEach(() => {
    mockedPublicClient = createPublicClient({
      chain: mainnet,
      transport: custom((global as any).ethereum),
    });
  });
  const mockedBridgeAddress: Address =
    "0x0000000000000000000000000000000000b41d9e";
  test("Should request nativeSendAmount", async () => {
    const nativeSendAmountMock = await mock({
      blockchain,
      request: {
        to: mockedBridgeAddress,
        api: bridgeAbi,
        method: "nativeSendAmount",
        params: [],
        return: "1000000000000000000",
      },
    });
    await expect(
      amountAdditionalNativeToSend(mockedBridgeAddress, mockedPublicClient)
    ).resolves.toBe(1000000000000000000n);
    expect(nativeSendAmountMock).toHaveBeenCalled();
    expect(nativeSendAmountMock).toHaveBeenCalledTimes(1);
  });

  const mockedClaimedReceipt = receipts[0];
  const mockedNotClaimedReceipt = receipts[1];

  test("Should request isClaimed by hash truly", async () => {
    const isClaimedMock = mock({
      blockchain,
      request: {
        to: mockedBridgeAddress,
        api: bridgeAbi,
        method: "isClaimed",
        params: [mockedClaimedReceipt.hash],
        return: true,
      },
    });
    await expect(
      checkIsClaimed(
        mockedClaimedReceipt.hash,
        mockedBridgeAddress,
        mockedPublicClient
      )
    ).resolves.toBeTruthy();
    expect(isClaimedMock).toHaveBeenCalled();
    expect(isClaimedMock).toHaveBeenCalledTimes(1);
  });

  test("Should request isClaimed by hash falsy", async () => {
    const isClaimedMock = mock({
      blockchain,
      request: {
        to: mockedBridgeAddress,
        api: bridgeAbi,
        method: "isClaimed",
        params: [mockedNotClaimedReceipt.hash],
        return: false,
      },
    });
    await expect(
      checkIsClaimed(
        mockedNotClaimedReceipt.hash,
        mockedBridgeAddress,
        mockedPublicClient
      )
    ).resolves.toBeFalsy();
    expect(isClaimedMock).toHaveBeenCalled();
    expect(isClaimedMock).toHaveBeenCalledTimes(1);
  });

  test("Should request isClaimed by FullReceipt truly", async () => {
    const isClaimedMock = mock({
      blockchain,
      request: {
        to: mockedBridgeAddress,
        api: bridgeAbi,
        method: "isClaimed",
        params: [mockedClaimedReceipt.hash],
        return: true,
      },
    });
    await expect(
      checkIsClaimed(
        mockedClaimedReceipt.receipt,
        mockedBridgeAddress,
        mockedPublicClient
      )
    ).resolves.toBeTruthy();
    expect(isClaimedMock).toHaveBeenCalled();
    expect(isClaimedMock).toHaveBeenCalledTimes(1);
  });

  test("Should request isClaimed by FullReceipt falsy", async () => {
    const isClaimedMock = mock({
      blockchain,
      request: {
        to: mockedBridgeAddress,
        api: bridgeAbi,
        method: "isClaimed",
        params: [mockedNotClaimedReceipt.hash],
        return: false,
      },
    });
    await expect(
      checkIsClaimed(
        mockedNotClaimedReceipt.receipt,
        mockedBridgeAddress,
        mockedPublicClient
      )
    ).resolves.toBeFalsy();
    expect(isClaimedMock).toHaveBeenCalled();
    expect(isClaimedMock).toHaveBeenCalledTimes(1);
  });

  test("Should request isClaimed by MiniReceipt truly", async () => {
    const miniReceipt = full2miniReceipt(mockedClaimedReceipt.receipt);
    const isClaimedMock = mock({
      blockchain,
      request: {
        to: mockedBridgeAddress,
        api: bridgeAbi,
        method: "isClaimed",
        params: [mockedClaimedReceipt.hash],
        return: true,
      },
    });
    await expect(
      checkIsClaimed(miniReceipt, mockedBridgeAddress, mockedPublicClient)
    ).resolves.toBeTruthy();
    expect(isClaimedMock).toHaveBeenCalled();
    expect(isClaimedMock).toHaveBeenCalledTimes(1);
  });

  test("Should request isClaimed by MiniReceipt falsy", async () => {
    const miniReceipt = full2miniReceipt(mockedNotClaimedReceipt.receipt);
    const isClaimedMock = mock({
      blockchain,
      request: {
        to: mockedBridgeAddress,
        api: bridgeAbi,
        method: "isClaimed",
        params: [mockedNotClaimedReceipt.hash],
        return: false,
      },
    });
    await expect(
      checkIsClaimed(miniReceipt, mockedBridgeAddress, mockedPublicClient)
    ).resolves.toBeFalsy();
    expect(isClaimedMock).toHaveBeenCalled();
    expect(isClaimedMock).toHaveBeenCalledTimes(1);
  });
});

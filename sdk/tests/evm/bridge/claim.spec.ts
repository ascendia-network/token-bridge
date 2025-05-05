import { beforeEach, describe, expect, test } from "@jest/globals";
import {
  Address,
  createTestClient,
  TestClient,
  PublicClient,
  WalletClient,
  http,
  publicActions,
  walletActions,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { evm } from "../../../src/";
import type { ClaimCall } from "../../../src/types";
import { AccountFixture } from "../../mocks/fixtures/privateKey";
import { receipts } from "../../mocks/fixtures/receipt";
import { describeif } from "../../utils";

describeif(process.env.NODE_ENV != "ci")("Test bridge claim request", () => {
  let testClient: TestClient;
  beforeEach(async () => {
    testClient = createTestClient({
      mode: "anvil",
      transport: http(`http://127.0.0.1:8545`),
      account: privateKeyToAccount(AccountFixture.privateKey),
    })
      .extend(publicActions)
      .extend(walletActions);
    testClient.setBalance({
      address: "0xa5cc3c03994DB5b0d9A5eEdD10CabaB0813678AC",
      value: parseEther("100"),
    });
  });
  const mockedBridgeAddress: Address =
    "0xfdbBEc1347B64c6eAc2cbabfc98D908AC2A91570";
  test("Should call claim request successfully", async () => {
    await testClient.impersonateAccount({
      address: AccountFixture.address,
    });
    const claimParams: ClaimCall = {
      receipt: receipts[1].receipt,
      signature: receipts[1].signature,
    };
    await testClient.setBalance({
      address: AccountFixture.address,
      value: parseEther("100"),
    });
    const tx = await evm.contract.calls.claimInEVM(
      claimParams,
      mockedBridgeAddress,
      testClient as unknown as PublicClient,
      testClient as unknown as WalletClient,
    );
    expect(tx).toBeDefined();
  }, 30000);

  test("Should fail claim request with token not bridgable", async () => {
    await testClient.impersonateAccount({
      address: AccountFixture.address,
    });
    const claimParams: ClaimCall = {
      receipt: receipts[0].receipt,
      signature: receipts[0].signature,
    };
    await testClient.setBalance({
      address: AccountFixture.address,
      value: parseEther("100"),
    });
    await expect(
      evm.contract.calls.claimInEVM(
        claimParams,
        mockedBridgeAddress,
        testClient as unknown as PublicClient,
        testClient as unknown as WalletClient,
      ),
    ).rejects.toMatchObject({
      errorName: "TokenNotBridgable",
      errorArgs: ["0x6deE265d22085F4c0BB1582BF0BAd8a6Af0309d9"],
    });
  }, 30000);
});

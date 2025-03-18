import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";
import * as child from "child_process";
import {
  Address,
  Hex,
  createTestClient,
  TestClient,
  PublicClient,
  toHex,
  WalletClient,
  http,
  publicActions,
  walletActions,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { evm } from "../../../src/";
import { AccountFixture } from "../../mocks/fixtures/privateKey";
import { receipts } from "../../mocks/fixtures/receipt";

async function waitForAnvil(retries = 0) {
  try {
    const url = `http://127.0.0.1:8545`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_blockNumber",
        params: [],
      }),
    });
    return response.ok && (await response.json()) !== undefined;
  } catch (error) {
    console.log("Anvil is not ready yet");
    if (retries > 10) {
      throw new Error("Anvil is not ready");
    } else {
      setTimeout(() => waitForAnvil(retries++), 1000);
    }
  }
}
describe("Test bridge send request", () => {
  let testClient: TestClient;
  let anvil: child.ChildProcess;
  beforeAll(async () => {
    anvil = child.spawn("anvil", [
      "-p",
      "8545",
      "-f",
      "https://network.ambrosus-test.io",
      "--silent",
    ]);
    await waitForAnvil();
  }, 10000);
  afterAll(() => {
    anvil.kill();
  }, 5000);
  beforeEach(async () => {
    testClient = createTestClient({
      mode: "anvil",
      transport: http(`http://127.0.0.1:8545`),
      account: privateKeyToAccount(AccountFixture.privateKey),
    })
      .extend(publicActions)
      .extend(walletActions);
  });
  const mockedBridgeAddress: Address =
    "0x5Bcb9233DfEbcec502C1aCce6fc94FefF8c037C3";
  const mockedRecipient: Hex = toHex("Bob", { size: 32 });
  const mockedSignature: Hex =
    "0x4c5908107ce8fe51ac8c09188bb817c070ffed724b52bc8b29baf9905b76efe314392dbf9ace7e23aa3be2113ffb97fe9af438c4ff393d5a0de37b1ba2a28e211b";
  const mockedPayload: evm.SendPayloadEVM = {
    amountToSend: 1000000000000000000n,
    chainFrom: 22040n,
    chainTo: 6003100671677645902n,
    externalTokenAddress:
      "0x0cf53911c806ccffeb6a2cf754a5ec25b87f7a733cf375a90ce5faac9fcf4c5b",
    feeAmount: 585666821314334878500n,
    flagData: "0x",
    flags: 0n,
    timestamp: 1741897441,
    tokenAddress:
      "0x0000000000000000000000002Cf845b49e1c4E5D657fbBF36E97B7B5B7B7b74b",
  };
  test("Should call claim request successfully", async () => {
    await testClient.impersonateAccount({
      address: AccountFixture.address,
    });
    const claimParams: evm.ClaimCall = {
      receipt: receipts[1].receipt,
      signature: receipts[1].signature,
    };
    await testClient.setBalance({
      address: testClient.account?.address!,
      value: parseEther("100"),
    });
    const tx = await evm.contract.calls.claimInEVM(
      claimParams,
      mockedBridgeAddress,
      testClient as unknown as PublicClient,
      testClient as unknown as WalletClient
    );
    expect(tx).toBeDefined();
  });
});

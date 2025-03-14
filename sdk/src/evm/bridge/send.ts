import {
  Address,
  createPublicClient,
  createWalletClient,
  Hex,
  http,
  PublicClient,
  WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getBridgeContract } from "./contract";
import {
  type SendPayloadEVM,
  type SendPayloadCall,
} from "../types/send-payload";
import { checkAllowanceERC20 } from "../token/checkAllowance";
import { checkBalanceNative } from "../native/balance";
import { handleCustomError } from "../utils/customErrors";

async function sendFromEVM(
  payloadParams: SendPayloadCall,
  bridgeAddress: Address,
  publicClient: PublicClient,
  walletClient: WalletClient
) {
  const bridgeContract = getBridgeContract(
    bridgeAddress,
    publicClient,
    walletClient
  );

  // const enoughAllowance =
  //   !payloadParams._deadline &&
  //   !payloadParams.v &&
  //   !payloadParams.r &&
  //   !payloadParams.s
  //     ? await checkAllowanceERC20(
  //         ("0x" + payloadParams.payload.tokenAddress.slice(-40)) as Address,
  //         walletClient.account?.address!,
  //         bridgeAddress,
  //         payloadParams.payload.amountToSend,
  //         publicClient
  //       )
  //     : true;
  // const enoughNativeBalance = await checkBalanceNative(
  //   walletClient.account?.address!,
  //   payloadParams.payload.feeAmount,
  //   publicClient
  // );
  // if (enoughAllowance && enoughNativeBalance) {
  try {
    const params: Array<Hex | SendPayloadEVM | bigint> = [
      payloadParams.recipient,
      payloadParams.payload,
      payloadParams.payloadSignature,
    ];
    if (
      payloadParams._deadline &&
      payloadParams.v &&
      payloadParams.r &&
      payloadParams.s
    ) {
      params.push(
        payloadParams._deadline,
        payloadParams.v,
        payloadParams.r,
        payloadParams.s
      );
    }
    await bridgeContract.simulate.send(params, {
      value: payloadParams.payload.feeAmount,
    });
    return await bridgeContract.write.send(params, {
      value: payloadParams.payload.feeAmount,
    });
  } catch (err) {
    throw handleCustomError(err as Error);
  }
  // }
}

sendFromEVM(
  {
    recipient: "0xd546c11618edd8d6517f9e6511398f67c8626e74c00be837791f07903ad095dd",
    payload: {
      destChainId: 6003100671677645902n,
      tokenAddress:
        "0x0000000000000000000000005B9E2BD997bc8f6aE97145cE0a8dEE075653f1AA",
      externalTokenAddress:
        "0x069b8857feab8184fb687f634618c035dac439dc1aeb3b5598a0f00000000001",
      amountToSend: 1000000000000000000n,
      feeAmount: 607946841408608173870n,
      timestamp: 1741954953n,
      flags: 0n,
      flagData: "0x",
    },
    payloadSignature:
      "0xbe41c8974223263371fa618068a09823b310ae6ed74cb088424e61119d96985507fef7729fdf9e60f8c54df2de8f581e082bd16172f1ea4a1ef1db7cf1918b9d1c",
  },
  "0x48722498168d61bcCfc5CAA5F6082975EfD92d46",
  createPublicClient({
    transport: http("https://network.ambrosus-test.io"),
  }),
  createWalletClient({
    transport: http("https://network.ambrosus-test.io"),
    account: privateKeyToAccount(
      "0x429bdc2c7dc4fb16119db1b5bfc825704b8d30eca219caf47f04886ef88a1b86"
    ),
  })
).then(console.log).catch(console.error);

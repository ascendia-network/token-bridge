import {
  Address,
  Hex,
  PublicClient,
  WalletClient,
  createWalletClient,
  http,
  erc20Abi,
  BaseError,
  ContractFunctionRevertedError,
  RpcError,
  RpcRequestError,
  decodeErrorResult,
  AbiErrorSignatureNotFoundError,
  createPublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  type SendPayloadEVM,
  type SendPayloadCall,
} from "../types/send-payload";
import { getBridgeContract } from "./contract";
import { checkAllowance, checkBalanceNative } from "./utils";
import { validatorAbi } from "../abi/validatorAbi";

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
  
  const enoughAllowance = (
    !payloadParams._deadline &&
    !payloadParams.v &&
    !payloadParams.r &&
    !payloadParams.s
  ) ? await checkAllowance(
    ("0x" + payloadParams.payload.tokenAddress.slice(-40)) as Address,
    walletClient.account?.address!,
    bridgeAddress,
    payloadParams.payload.amountToSend,
    publicClient
  ) : true;
  const enoughNativeBalance = await checkBalanceNative(
    walletClient.account?.address!,
    payloadParams.payload.feeAmount,
    publicClient
  );
  if (enoughAllowance && enoughNativeBalance) {
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
      if (err instanceof BaseError) {
        const revertError = err.walk(
          (err) => err instanceof ContractFunctionRevertedError
        );
        if (revertError instanceof ContractFunctionRevertedError) {
          const errorName = revertError.data?.errorName ?? "";
          console.error(`Error: ${errorName}, args: ${revertError.data?.args}`);
        } else if (err instanceof RpcRequestError) {
          const reason = (err.data as `Reverted 0x${string}`).replace(
            "Reverted ",
            ""
          );
          if (reason.startsWith("0x")) {
            try {
              const decoded = decodeErrorResult({
                data: reason as Hex,
                abi: erc20Abi,
              });
              console.error(
                `Error: ${decoded.errorName}, args: ${decoded.args}`
              );
            } catch (decodeErr) {
              if (decodeErr instanceof AbiErrorSignatureNotFoundError) {
                try {
                  const decoded = decodeErrorResult({
                    data: reason as Hex,
                    abi: validatorAbi,
                  });
                  console.error(
                    `Error: ${decoded.errorName}, args: ${decoded.args}`
                  );
                } catch (decodeErr) {
                  if (decodeErr instanceof AbiErrorSignatureNotFoundError) {
                    console.error(`Unknown Error: ${err.data}`);
                  }
                }
              }
            }
          }
        }
      }
      throw err;
      // return bridgeContract.write.send({ ...payloadParams });
    }
  }
}
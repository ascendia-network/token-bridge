import { env } from "hono/adapter";
import { SendSignatureController } from "../src/controllers/send-signature.controller";
import { Dependency } from "hono-simple-di";

export const sendSignatureControllerMiddleware = new Dependency((c) => {
  const { SEND_SIGNER_MNEMONIC } = env<{
    SEND_SIGNER_MNEMONIC: string;
  }>(c);
  return new SendSignatureController(SEND_SIGNER_MNEMONIC);
});
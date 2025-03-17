import { Hex } from "viem";
import { FullReceipt } from "../../../src/evm/types";

export const receipts: Array<{
  receipt: FullReceipt;
  hash: Hex;
  signature: Hex;
}> = [
  {
    receipt: {
      from: "0x111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCCC",
      to: "0x000000000000000000000000e0b52ec5ce3e124ab5306ea42463be85aeb5eddd",
      tokenAddressFrom:
        "0x54455354494e4700000000000000000000000000000000000000000000000000",
      tokenAddressTo:
        "0x0000000000000000000000006deE265d22085F4c0BB1582BF0BAd8a6Af0309d9",
      amountFrom: 1000000000000000000000n,
      amountTo: 1000000000000000000000n,
      chainFrom:
        37682073643888590243866347653768361305805979805942384833434275429159048052736n,
      chainTo: 22040n,
      eventId: 0n,
      flags: 0n,
      data: "0x",
    },
    hash: "0x56d78f233132a401208e5ba9b7959aa22719eeb4213283e299d57195399f648e",
    signature:
      "0xa8d0308d1a8fe6c563c24021d366769c673eda5f860541a88e120ff0ea329bb30d33fac23d6ea850916ceac5d4441ee30dbd8be5027a80a761cbeccd938d9c601b",
  },
  {
    receipt: {
      from: "0x111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCCC",
      to: "0x000000000000000000000000e0b52ec5ce3e124ab5306ea42463be85aeb5eddd",
      tokenAddressFrom:
        "0x069b8857feab8184fb687f634618c035dac439dc1aeb3b5598a0f00000000001",
      tokenAddressTo:
        "0x0000000000000000000000005B9E2BD997bc8f6aE97145cE0a8dEE075653f1AA",
      amountFrom: 1000000000000000000000n,
      amountTo: 1000000000000000n,
      chainFrom: 6003100671677645902n,
      chainTo: 22040n,
      eventId: 12345n,
      flags: 0n,
      data: "0x",
    },
    hash: "0x9d32d2270629b95b2590e468a8ac108e706bf888cdb4b8b5dee3f6d6db4f6aff",
    signature:
      "0xa9d18de86eb74a6d024e95ef71997ae39651768067c07938008b8a30b0b7c8da7a94a4f8131951404c4337355d402375ec4e578eb68e09e42535440c7a0a0f731b",
  },
];
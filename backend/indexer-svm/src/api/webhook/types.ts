interface Instruction {
  accounts: number[];
  data: string;
  programIdIndex: number;
}

interface InnerInstruction {
  index: number;
  instructions: Instruction[];
}

interface LoadedAddresses {
  readonly: string[];
  writable: string[];
}

interface TokenBalance {
  accountIndex: number;
  mint: string;
  owner: string;
  programId: string;
  uiTokenAmount: {
    amount: string;
    decimals: number;
    uiAmount: number;
    uiAmountString: string;
  };
}

interface Meta {
  err: any; // Can be null or an error object
  fee: number;
  innerInstructions: InnerInstruction[];
  loadedAddresses: LoadedAddresses;
  logMessages: string[];
  postBalances: number[];
  postTokenBalances: TokenBalance[];
  preBalances: number[];
  preTokenBalances: TokenBalance[];
  rewards: any[]; // Can be further specified if necessary
}

interface TransactionMessage {
  accountKeys: string[];
  // Other fields can be added if necessary
}

interface Transaction {
  message: TransactionMessage;
  signatures: string[];
  // Other fields can be added if necessary
}

export interface SolanaTransaction {
  blockTime: number;
  indexWithinBlock: number;
  meta: Meta;
  slot: number;
  transaction: Transaction;
}

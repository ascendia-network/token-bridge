import { BASE_API_URL, config } from "../config";
import { validators, type ReceiptsToSignResponse } from "../typeValidators";

const GET_UNSIGNED_TRANSACTIONS_EVM_URL =
  BASE_API_URL + `/evm/unsigned/${config.accountEVM.address}`;

export async function getUnsignedTransactionsEVM(): Promise<ReceiptsToSignResponse> {
  try {
    const response = await fetch(GET_UNSIGNED_TRANSACTIONS_EVM_URL);
    if (response.ok) {
      const data = await response.json();
      const receipts = validators.ReceiptsToSignResponse.parse(data);
      return receipts;
    } else {
      console.error(
        "Failed to fetch unsigned transactions:",
        await response.text()
      );
      return [];
    }
  } catch (error) {
    console.error("Error fetching unsigned transactions:", error);
    return [];
  }
}

export default getUnsignedTransactionsEVM;

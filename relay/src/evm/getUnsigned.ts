import { config } from "../config";
import { validators, type ReceiptsToSignResponse } from "../typeValidators";

export async function getUnsignedTransactionsEVM(): Promise<ReceiptsToSignResponse> {
  try {
    const response = await fetch(
      `${config.BACKEND_URL}/evm/unsigned/${config.accountEVM.address}`
    );
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

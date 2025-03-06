import { accountSolana, config } from "../config";
import { validators, type ReceiptsToSignResponse } from "../typeValidators";

export async function getUnsignedTransactionsSolana(): Promise<ReceiptsToSignResponse> {
  try {
    const response = await fetch(
      `${
        config.BACKEND_URL
      }/api/receipts/svm/unsigned/${accountSolana.publicKey.toBase58()}`
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

export default getUnsignedTransactionsSolana;

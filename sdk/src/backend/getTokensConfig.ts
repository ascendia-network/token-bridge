import { backendUrl } from "../config";
import { TokenConfig } from "../types/tokenConfig";

/**
 * Fetches the tokens configuration from the backend API.
 *
 * @returns {Promise<TokenConfig>} Promise that resolves to the tokens configuration object containing details about bridges and tokens.
 *
 * @throws Will throw an error if the fetch request fails or the response is invalid.
 */

export async function getTokensConfig(): Promise<TokenConfig> {
  const tokensConfigUrl: URL = URL.parse("/api/tokens", backendUrl)!;
  const response = await fetch(tokensConfigUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to get tokens config: ${
        response.status
      }, ${JSON.stringify(await response.json())}`,
    );
  }
  const data = await response.json();
  return data as TokenConfig;
}

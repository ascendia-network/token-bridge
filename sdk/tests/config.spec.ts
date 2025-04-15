import { describe, expect, test } from "@jest/globals";
import { SOLANA_CHAIN_ID, SOLANA_DEV_CHAIN_ID, setBackendUrl } from "../src";
import { backendUrl } from "../src/config";

describe("Test config", () => {
  test("Should have backendUrl", () => {
    expect(backendUrl).toBeDefined();
    expect(backendUrl).toBe("http://localhost:3000"); // Default value
  });

  test("Should set backendUrl", () => {
    setBackendUrl("http://localhost:4000");
    expect(backendUrl).toBeDefined();
    expect(backendUrl).toBe("http://localhost:4000");
  });

  test("Should have SOLANA_CHAIN_ID", () => {
    expect(SOLANA_CHAIN_ID).toBeDefined();
    expect(SOLANA_CHAIN_ID).toBe(6003100671677628416n); // Default value
  });

  test("Should have SOLANA_DEV_CHAIN_ID", () => {
    expect(SOLANA_DEV_CHAIN_ID).toBeDefined();
    expect(SOLANA_DEV_CHAIN_ID).toBe(6003100671677645902n); // Default value
  });
});

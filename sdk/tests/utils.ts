import { describe, test } from "@jest/globals";

export const testif = (condition: boolean) => (condition ? test : test.skip);
export const describeif = (condition: boolean) =>
  condition ? describe : describe.skip;

export function bigIntToBuffer(value: bigint, byteLength: number): Buffer {
  const buffer = Buffer.alloc(byteLength);
  const valueBuffer = Buffer.from(value.toString(16).padStart(byteLength * 2, "0"), "hex");
  valueBuffer.copy(buffer, byteLength - valueBuffer.length);
  return buffer;
}

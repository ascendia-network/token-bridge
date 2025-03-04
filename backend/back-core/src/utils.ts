export const consoleLogger = (message: string, ...rest: string[]) => {
  console.log(message, ...rest);
};

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
export interface TokenConfig {
  bridges: {
    [srcNetwork: string]: {
      [dstNetwork: string]: string;
    };
  };
  tokens: {
    [symbol: string]: {
      isActive: boolean;
      name: string;
      symbol: string;
      ticker: string;
      logo?: string;
      networks: {
        [network: string]: {
          address: string;
          denomination: number;
          isPrimary: boolean;
          nativeCoin?: string;
        };
      };
    };
  };
}

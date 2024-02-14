export const networkConfig: {
  [key: number]: {
    name: string | undefined;
    ethUsdPriceFeed: string | undefined;
  };
} = {
  11155111: {
    name: "sepolia",
    ethUsdPriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
  },
  31337: {
    name: "localhost",
    ethUsdPriceFeed: "?",
  },
};

export const developmentChains = ["localhost", "hardhat"];

export const DECIMALS = 8;
export const INITIAL_ANSWER = 200000000000;

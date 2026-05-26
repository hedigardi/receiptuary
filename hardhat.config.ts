import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatMocha from "@nomicfoundation/hardhat-mocha";
import * as dotenv from "dotenv";

dotenv.config();

const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
const accounts = deployerKey ? [deployerKey] : [];
type HttpL1NetworkConfig = {
  type: "http";
  chainType: "l1";
  url: string;
  accounts: string[];
};

const networks: Record<string, HttpL1NetworkConfig> = {};

/**
 * Registers remote networks only when the corresponding RPC URL is configured.
 */
if (process.env.BASE_SEPOLIA_RPC_URL) {
  networks.baseSepolia = {
    type: "http",
    chainType: "l1",
    url: process.env.BASE_SEPOLIA_RPC_URL,
    accounts,
  };
}

if (process.env.BASE_MAINNET_RPC_URL) {
  networks.base = {
    type: "http",
    chainType: "l1",
    url: process.env.BASE_MAINNET_RPC_URL,
    accounts,
  };
}

/**
 * Enables optimizer for more gas-efficient production deployments.
 */
const config = defineConfig({
  plugins: [hardhatEthers, hardhatMocha],
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks,
});

export default config;

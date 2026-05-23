import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";

dotenv.config();

const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
const accounts = deployerKey ? [deployerKey] : [];
const networks: Record<string, unknown> = {};

if (process.env.BASE_SEPOLIA_RPC_URL) {
  networks.baseSepolia = {
    type: "http",
    chainType: "l1",
    url: process.env.BASE_SEPOLIA_RPC_URL,
    accounts,
  };
}

const config = defineConfig({
  plugins: [hardhatEthers],
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

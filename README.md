# Receiptuary

Receiptuary is a minimalist dApp for verifying digital receipts.
The app hashes PDF files locally in the browser (SHA-256), registers the hash on-chain, and lets buyers verify whether a file matches the anchored original hash.

## Features

- Client-side hashing with the Web Crypto API (no file is sent to any server)
- Two roles in the UI:
  - Issuer: registers a receipt hash via `registerReceipt`
  - Verifier: checks a hash via `getReceipt`
- Wallet connection with Wagmi + RainbowKit
- Optional gasless mode with Privy + Biconomy (AA)
- Solidity contract with gas-efficient `bytes32` storage

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind
- Wagmi + Viem + RainbowKit
- Solidity + Hardhat
- React Dropzone for PDF upload

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Create an env file:

```bash
cp .env.example .env
```

3. Fill in at minimum:

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS` (optional if you use deploy-sync)

Optional for gasless AA:

- `NEXT_PUBLIC_ENABLE_AA=true`
- `NEXT_PUBLIC_PRIVY_APP_ID`
- `NEXT_PUBLIC_BICONOMY_BUNDLER_URL`
- `NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY`
- `NEXT_PUBLIC_AA_CHAIN_ID`

4. Start the development server:

```bash
npm run dev
```

## Smart contract

The contract is located at `contracts/Receiptuary.sol`.

Compile:

```bash
npm run contract:compile
```

Deploy to Base Sepolia:

```bash
npm run contract:deploy:base
```

After a deploy, the frontend is automatically updated with the address and ABI in `src/lib/generated/receiptuary.generated.ts`.
You can still override the address via `NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS`.

## User flow

1. The issuer uploads a PDF in the app
2. The app hashes the file locally to a SHA-256 `bytes32`
3. The hash and metadata are written to the blockchain
4. The buyer uploads the same file for verification
5. The app re-hashes and compares with the on-chain data

## AA / Gasless

The project has an optional Account Abstraction mode (Privy + Biconomy) that enables:

- Google / email login
- Embedded smart wallet
- Sponsored gas for registration transactions

This runs on the same contract and the same verification model as the standard mode.

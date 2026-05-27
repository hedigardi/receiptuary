# Receiptuary

Receiptuary is a dApp for receipt authenticity.
It hashes PDF receipts locally in the browser with SHA-256, anchors the hash on-chain, and lets anyone verify whether a file matches a registered record.

## Current product state

- Primary network: Base mainnet
- Demo route: `/demo` on Base Sepolia (same UI, isolated network config)
- Paid registration: enabled (token approval + registration)
- Payment model: fixed fee per registration (configured via env)
- Upload format: PDF only
- Issuer protection: only owner-approved issuer wallets can register

## Features

- Local hashing in browser (no file upload to backend)
- Issuer mode (register receipt hash on-chain)
- Verifier mode (verify hash against on-chain record)
- Paid flow with explicit user consent
- Wallet integration via Wagmi + RainbowKit
- SEO routes (`robots.txt`, `sitemap.xml`)
- Netlify-ready deployment config

## Tech stack

- Next.js App Router + TypeScript + Tailwind
- Wagmi + Viem + RainbowKit
- Solidity + Hardhat
- React Dropzone

## Local setup

1. Install dependencies

```bash
npm install
```

2. Create env file

macOS/Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Fill required frontend env vars

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS` (can be empty before first deploy)
- `NEXT_PUBLIC_RECEIPTUARY_DEPLOYMENT_BLOCK` (optional but recommended, e.g. `46320000`)
- `NEXT_PUBLIC_BASE_FALLBACK_RPC_URL` (optional, e.g. `https://base.llamarpc.com`)
- `NEXT_PUBLIC_USDC_TOKEN_ADDRESS`
- `NEXT_PUBLIC_RECEIPTUARY_FEE_RECIPIENT`
- `NEXT_PUBLIC_RECEIPTUARY_FEE_AMOUNT` (example `1000000` for 1.00 USDC with 6 decimals)

Optional demo/testnet frontend env vars (used by `/demo`):

- `NEXT_PUBLIC_DEMO_RECEIPTUARY_NETWORK` (default: `base_sepolia`)
- `NEXT_PUBLIC_DEMO_RECEIPTUARY_CONTRACT_ADDRESS`
- `NEXT_PUBLIC_DEMO_USDC_TOKEN_ADDRESS`
- `NEXT_PUBLIC_DEMO_RECEIPTUARY_FEE_RECIPIENT`
- `NEXT_PUBLIC_DEMO_RECEIPTUARY_FEE_AMOUNT`
- `NEXT_PUBLIC_DEMO_RECEIPTUARY_DEPLOYMENT_BLOCK`
- `NEXT_PUBLIC_BASE_SEPOLIA_FALLBACK_RPC_URL`

`NEXT_PUBLIC_RECEIPTUARY_DEPLOYMENT_BLOCK` limits issuer admin event scans to contract lifetime and reduces RPC rate-limit errors.
`NEXT_PUBLIC_BASE_FALLBACK_RPC_URL` is used as automatic failover for issuer admin log reads if the primary Base RPC is rate-limited.
If your local `.env.example` does not include these optional keys yet, add them manually to `.env`.

4. Start app

```bash
npm run dev
```

## Contract and deployment

Contract: `contracts/Receiptuary.sol`

Compile:

```bash
npm run contract:compile
```

Run tests:

```bash
npm run test:contract
```

Run app smoke checks (lint + production build):

```bash
npm run test:app:smoke
```

Run production preflight (recommended before deploy):

```bash
npm run preflight:prod
```

Deploy commands:

- Base Sepolia: `npm run contract:deploy:base:sepolia`
- Base Mainnet: `npm run contract:deploy:base:mainnet`

Legacy alias:

- `npm run contract:deploy:base` (same as Base Sepolia)

Required deploy env vars:

- `DEPLOYER_PRIVATE_KEY`
- `BASE_SEPOLIA_RPC_URL` (for Base Sepolia deploy)
- `BASE_MAINNET_RPC_URL` (for mainnet deploy)
- `USDC_TOKEN_ADDRESS`
- `RECEIPTUARY_FEE_RECIPIENT`
- `RECEIPTUARY_FEE_AMOUNT`

Issuer allowlist management env vars:

- `ISSUER_ADDRESS` (wallet to approve/revoke)
- `ISSUER_APPROVED` (`true` or `false`, defaults to `true`)
- `RECEIPTUARY_CONTRACT_ADDRESS` (optional override; falls back to `NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS`)

Approve/revoke issuer commands:

- Base Sepolia: `npm run contract:issuer:approve:base:sepolia`
- Base Mainnet: `npm run contract:issuer:approve:base:mainnet`

After deploy, address + ABI are auto-synced to:

- `src/lib/generated/receiptuary.generated.ts`

You can override contract address in frontend via:

- `NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS`

## User flows

### Issuer flow (paid)

1. Upload PDF
2. Local SHA-256 hash is generated
3. Approve token spend in wallet
4. Wallet must be owner-approved as issuer
5. Confirm registration transaction
6. Fee is transferred to configured recipient

### Verifier flow

1. Upload PDF
2. Local hash is generated
3. App reads on-chain record
4. Shows Verified or Unverified with explorer links

## SEO

Implemented SEO pieces:

- Rich metadata in `src/app/layout.tsx`
- `robots.txt` route: `src/app/robots.ts`
- `sitemap.xml` route: `src/app/sitemap.ts`
- Web manifest: `public/site.webmanifest`

Set `NEXT_PUBLIC_SITE_URL` to your real production domain for canonical, sitemap host and robots host.

## CI

This repository includes a GitHub Actions workflow at `.github/workflows/ci.yml`.
It runs `npm test` (contract tests + app smoke checks) on pull requests and pushes.

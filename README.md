# Receiptuary

Receiptuary is a dApp for receipt authenticity.
It hashes PDF receipts locally in the browser with SHA-256, anchors the hash on-chain, and lets anyone verify whether a file matches a registered record.

## Current product state

- Primary network: Base mainnet
- Paid registration: enabled (token approval + registration)
- Payment model: fixed fee per registration (configured via env)
- Upload format: PDF only

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
- `NEXT_PUBLIC_USDC_TOKEN_ADDRESS`
- `NEXT_PUBLIC_RECEIPTUARY_FEE_RECIPIENT`
- `NEXT_PUBLIC_RECEIPTUARY_FEE_AMOUNT` (example `1000000` for 1.00 USDC with 6 decimals)

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
- `BASE_MAINNET_RPC_URL` (for mainnet deploy)
- `USDC_TOKEN_ADDRESS`
- `RECEIPTUARY_FEE_RECIPIENT`
- `RECEIPTUARY_FEE_AMOUNT`

After deploy, address + ABI are auto-synced to:

- `src/lib/generated/receiptuary.generated.ts`

You can override contract address in frontend via:

- `NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS`

## User flows

### Issuer flow (paid)

1. Upload PDF
2. Local SHA-256 hash is generated
3. Approve token spend in wallet
4. Confirm registration transaction
5. Fee is transferred to configured recipient

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

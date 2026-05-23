# Receiptuary

Receiptuary ar en minimalistisk dApp for att verifiera digitala kvitton.
Appen hashar PDF-filer lokalt i webblasaren (SHA-256), registrerar hashen pa blockkedjan och later kopare verifiera om filen matchar den forankrade originalhashen.

## Funktioner

- Lokal hashning i klienten med Web Crypto API (ingen fil skickas till server)
- Tva lagen i UI:
  - Utfardare: registrerar kvittohash via `registerReceipt`
  - Verifierare: kontrollerar hash via `getReceipt`
- Wallet-anslutning med Wagmi + RainbowKit
- Valbart gasless-lage med Privy + Biconomy (AA)
- Solidity-kontrakt med gas-effektiv `bytes32`-lagring

## Teknisk stack

- Next.js (App Router) + TypeScript + Tailwind
- Wagmi + Viem + RainbowKit
- Solidity + Hardhat
- React Dropzone for PDF-upload

## Kom igang

1. Installera beroenden:

```bash
npm install
```

2. Skapa env-fil:

```bash
cp .env.example .env.local
```

3. Fyll i minst:

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS` (valfritt om du kor deploy-sync)

Valfritt for gasless AA:

- `NEXT_PUBLIC_ENABLE_AA=true`
- `NEXT_PUBLIC_PRIVY_APP_ID`
- `NEXT_PUBLIC_BICONOMY_BUNDLER_URL`
- `NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY`
- `NEXT_PUBLIC_AA_CHAIN_ID`

4. Starta utvecklingsserver:

```bash
npm run dev
```

## Smart kontrakt

Kontraktet finns i `contracts/Receiptuary.sol`.

Kompilera:

```bash
npm run contract:compile
```

Deploy (Base Sepolia):

```bash
npm run contract:deploy:base
```

Deploy (Polygon Amoy):

```bash
npm run contract:deploy:polygon
```

Efter deploy uppdateras frontend automatiskt med adress + ABI i `src/lib/generated/receiptuary.generated.ts`.
Du kan fortfarande overskriva adressen via `NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS`.

## Anvandarflode

1. Utfardaren laddar upp en PDF i appen
2. Appen hashar filen lokalt till en SHA-256 `bytes32`
3. Hash + metadata skrivs till blockkedjan
4. Koparen laddar upp samma fil for verifiering
5. Appen hashar pa nytt och jamfor med on-chain data

## AA/Gasless

Projektet har ett aktivt Account Abstraction-lage (Privy + Biconomy) for:

- Google/e-post-inloggning
- Inbaddad smart wallet
- Sponsrad gas for registreringstransaktioner

Detta kor pa samma kontrakt och samma verifieringsmodell som standardlaget.

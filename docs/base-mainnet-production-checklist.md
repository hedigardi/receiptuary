# Base Mainnet Production Checklist

Use this checklist before launch to ensure paid registration is secure, transparent, and operational.

## 1. Contracts and Treasury

- Deploy `Receiptuary` to Base mainnet with production values:
  - `USDC_TOKEN_ADDRESS` (official Base mainnet USDC address)
  - `RECEIPTUARY_FEE_RECIPIENT` (preferably multisig)
  - `RECEIPTUARY_FEE_AMOUNT` (for 1 USDC, use `1000000` if token has 6 decimals)
- Verify contract source code on BaseScan.
- Confirm `getFeeConfig()` returns expected token, recipient, and amount.
- Test `registerReceipt` end-to-end on mainnet with a small internal wallet.

## 2. Environment Variables

- Set frontend env vars in production:
  - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
  - `NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS`
  - `NEXT_PUBLIC_USDC_TOKEN_ADDRESS`
  - `NEXT_PUBLIC_RECEIPTUARY_FEE_RECIPIENT`
  - `NEXT_PUBLIC_RECEIPTUARY_FEE_AMOUNT`
- Ensure deployment env vars are configured in CI/CD secrets.
- Confirm there are no testnet values left in production env.

## 3. Wallet and Transaction UX

- Confirm user flow is clear:
  - Approve token spend
  - Pay and register receipt
- Display fee and recipient in the UI before user consent.
- Keep explicit consent text visible before payment actions.
- Confirm explorer links open the correct Base mainnet explorer pages.

## 4. Monitoring and Operations

- Monitor treasury inflows from fee transfers.
- Set alerts for failed registration rates and RPC outages.
- Log key app events (approve started, register started, register success, register error).
- Prepare incident runbook for RPC downtime and wallet-provider issues.

## 5. Security and Risk Controls

- Use a multisig for `RECEIPTUARY_FEE_RECIPIENT`, not a personal hot wallet.
- Restrict deployer key access and rotate keys if exposed.
- Run static analysis and manual review of fee-transfer logic.
- Validate that duplicate hash registration still reverts correctly.

## 6. Legal and Business Readiness

- Publish Terms of Service and Privacy Policy.
- Add clear refund policy and support channel.
- Disclose that blockchain transactions are normally irreversible.
- Align accounting and tax handling for fee revenue.

## 7. Final Launch Dry Run

- Full smoke test on production deployment:
  - Upload PDF
  - Approve fee
  - Register receipt
  - Verify receipt in verifier mode
- Test with low-balance wallet and rejected-signature scenarios.
- Validate mobile layout for paid flow screens.
- Capture screenshots and support documentation for launch.

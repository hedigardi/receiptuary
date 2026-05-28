const networkArgRaw = process.argv.find((value) =>
  value.startsWith("--network="),
);
const networkArg = networkArgRaw?.split("=")[1]?.trim();

function printChecklist(network) {
  const isMainnet = network === "base";
  const label = isMainnet ? "Base Mainnet" : "Base Sepolia";
  const deployCommand = isMainnet
    ? "npm run contract:deploy:base:mainnet"
    : "npm run contract:deploy:base:sepolia";
  const approveCommand = isMainnet
    ? "npm run contract:issuer:approve:base:mainnet"
    : "npm run contract:issuer:approve:base:sepolia";
  const frontendAddressKey = isMainnet
    ? "NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS"
    : "NEXT_PUBLIC_DEMO_RECEIPTUARY_CONTRACT_ADDRESS";
  const frontendBlockKey = isMainnet
    ? "NEXT_PUBLIC_RECEIPTUARY_DEPLOYMENT_BLOCK"
    : "NEXT_PUBLIC_DEMO_RECEIPTUARY_DEPLOYMENT_BLOCK";

  console.log(`\nReceiptuary V2 migration checklist (${label})`);
  console.log("1. Validate code before deploy:");
  console.log("   - npm run test");
  console.log("2. Deploy V2 contract:");
  console.log(`   - ${deployCommand}`);
  console.log("3. Capture deploy output values:");
  console.log("   - Receiptuary deployed: <address>");
  console.log("   - Deployment block: <block>");
  console.log("4. Update frontend env:");
  console.log(`   - ${frontendAddressKey}=<address>`);
  console.log(`   - ${frontendBlockKey}=<block>`);
  console.log("5. Restart app and run smoke checks:");
  console.log("   - npm run test:app:smoke");
  console.log("6. Verify open-registration behavior:");
  console.log(
    "   - Non-allowlisted wallet should be able to approve fee and register receipt",
  );
  console.log("7. Verify trust-profile behavior:");
  console.log(
    "   - Add/remove issuer in allowlist and verify Trusted/Open badge",
  );
  console.log(`   - ${approveCommand}`);
}

if (!networkArg) {
  printChecklist("baseSepolia");
  printChecklist("base");
  process.exit(0);
}

if (networkArg !== "base" && networkArg !== "baseSepolia") {
  console.error(
    "Invalid --network value. Use --network=baseSepolia or --network=base",
  );
  process.exit(1);
}

printChecklist(networkArg);

import { network } from "hardhat";

function parseApproved(value: string | undefined): boolean {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }

  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }

  throw new Error("ISSUER_APPROVED must be one of: true/false, 1/0, yes/no");
}

async function main() {
  const targetIssuer = process.env.ISSUER_ADDRESS?.trim();
  const approved = parseApproved(process.env.ISSUER_APPROVED);
  const contractAddress =
    process.env.RECEIPTUARY_CONTRACT_ADDRESS?.trim() ||
    process.env.NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS?.trim();

  if (!contractAddress) {
    throw new Error(
      "Missing contract address. Set RECEIPTUARY_CONTRACT_ADDRESS or NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS",
    );
  }

  if (!targetIssuer || !/^0x[a-fA-F0-9]{40}$/.test(targetIssuer)) {
    throw new Error("ISSUER_ADDRESS is missing or invalid");
  }

  const { ethers } = await network.create();
  const contract = await ethers.getContractAt("Receiptuary", contractAddress);

  const tx = await contract.setIssuerApproval(targetIssuer, approved);
  await tx.wait();

  console.log(
    `Issuer approval updated: ${targetIssuer} => ${approved ? "approved" : "revoked"}`,
  );
  console.log(`Transaction hash: ${tx.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

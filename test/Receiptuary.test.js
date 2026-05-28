import assert from "node:assert/strict";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("Receiptuary", function () {
  const feeAmount = 1_000_000n;
  const fileHash =
    "0x1111111111111111111111111111111111111111111111111111111111111111";

  async function deployFixture() {
    const [owner, issuer, treasury, outsider] = await ethers.getSigners();

    const tokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await tokenFactory.deploy();
    await token.waitForDeployment();

    await (await token.mint(issuer.address, 10_000_000n)).wait();
    await (await token.mint(outsider.address, 10_000_000n)).wait();

    const receiptuaryFactory = await ethers.getContractFactory("Receiptuary");
    const receiptuary = await receiptuaryFactory.deploy(
      await token.getAddress(),
      treasury.address,
      feeAmount,
    );
    await receiptuary.waitForDeployment();

    return { owner, issuer, treasury, outsider, token, receiptuary };
  }

  it("allows only owner to update issuer approval", async function () {
    const { owner, issuer, outsider, receiptuary } = await deployFixture();

    await assert.rejects(
      receiptuary.connect(outsider).setIssuerApproval(issuer.address, true),
      /Receiptuary: Only owner/,
    );

    await (
      await receiptuary.connect(owner).setIssuerApproval(issuer.address, true)
    ).wait();
    assert.equal(await receiptuary.isIssuerApproved(issuer.address), true);

    await (
      await receiptuary.connect(owner).setIssuerApproval(issuer.address, false)
    ).wait();
    assert.equal(await receiptuary.isIssuerApproved(issuer.address), false);
  });

  it("allows open registration for non-allowlisted wallets after fee approval", async function () {
    const { outsider, token, receiptuary } = await deployFixture();

    await (
      await token
        .connect(outsider)
        .approve(await receiptuary.getAddress(), feeAmount)
    ).wait();

    await (
      await receiptuary
        .connect(outsider)
        .registerReceipt(fileHash, "Apple Store")
    ).wait();

    const receipt = await receiptuary.getReceipt(fileHash);
    assert.equal(receipt[2], outsider.address);
    assert.equal(receipt[3], true);
  });

  it("transfers fee on successful registration after approval", async function () {
    const { issuer, treasury, token, receiptuary } = await deployFixture();

    await assert.rejects(
      receiptuary.connect(issuer).registerReceipt(fileHash, "Apple Store"),
      /Receiptuary: Fee transfer failed/,
    );

    await (
      await token
        .connect(issuer)
        .approve(await receiptuary.getAddress(), feeAmount)
    ).wait();

    const treasuryBefore = await token.balanceOf(treasury.address);
    const issuerBefore = await token.balanceOf(issuer.address);

    await (
      await receiptuary.connect(issuer).registerReceipt(fileHash, "Apple Store")
    ).wait();

    const receipt = await receiptuary.getReceipt(fileHash);
    assert.equal(receipt[0], "Apple Store");
    assert.equal(receipt[2], issuer.address);
    assert.equal(receipt[3], true);

    const treasuryAfter = await token.balanceOf(treasury.address);
    const issuerAfter = await token.balanceOf(issuer.address);
    assert.equal(treasuryAfter - treasuryBefore, feeAmount);
    assert.equal(issuerBefore - issuerAfter, feeAmount);
  });

  it("rejects duplicate receipt hash registration", async function () {
    const { issuer, token, receiptuary } = await deployFixture();
    await (
      await token
        .connect(issuer)
        .approve(await receiptuary.getAddress(), feeAmount * 2n)
    ).wait();

    await (
      await receiptuary.connect(issuer).registerReceipt(fileHash, "Apple Store")
    ).wait();

    await assert.rejects(
      receiptuary.connect(issuer).registerReceipt(fileHash, "Apple Store"),
      /Receiptuary: Hash already registered/,
    );
  });
});

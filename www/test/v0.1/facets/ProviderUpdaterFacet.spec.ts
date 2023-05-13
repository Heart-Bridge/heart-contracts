import { expect } from "chai";
import { ethers } from "hardhat";
import { getAccounts, ZeroAddress } from "../shared";
import { Contract } from "ethers";

const Deployer = require("../../../scripts/Deployer");

describe("Update Providers", function () {
  let contract: Contract;

  beforeEach(async () => {
    const { owner, relayer } = await getAccounts();
    const deployer = new Deployer(ethers, owner, relayer);
    await deployer.deploy();

    contract = await deployer.interactWith("ProviderUpdaterFacet");
  });

  it("Should fail if anyone else than the owner tries to update bridge providers", async function () {
    /** Arrange */
    const { anyoneElse, random } = await getAccounts();

    /** Act */
    const call = contract.connect(anyoneElse).updateBridge({
      code: 0,
      enabled: true,
      implementation: random.address,
      handler: random.address,
    });

    /** Assert */
    await expect(call).to.be.reverted;
  });

  it("Should fail if anyone else than the owner tries to update swap providers", async function () {
    /** Arrange */
    const { anyoneElse, random } = await getAccounts();

    /** Act */
    const call = contract.connect(anyoneElse).updateSwapper({
      code: 0,
      enabled: true,
      implementation: random.address,
      handler: random.address,
    });

    /** Assert */
    await expect(call).to.be.reverted;
  });

  it("Should return empty list when no bridge has been added", async function () {
    /** Arrange */
    const { owner } = await getAccounts();

    /** Act */
    const list = await contract.connect(owner).listBridges();

    /** Assert */
    expect(list).to.be.deep.equal([]);
  });

  it("Should return empty list when no swapper has been added", async function () {
    /** Arrange */
    const { owner } = await getAccounts();

    /** Act */
    const list = await contract.connect(owner).listSwappers();

    /** Assert */
    expect(list).to.be.deep.equal([]);
  });

  it("Should add a bridge correctly if the owner is the caller", async function () {
    /** Arrange */
    const { owner, random } = await getAccounts();

    /** Act */
    const call = contract.connect(owner).updateBridge({
      code: 0,
      enabled: true,
      implementation: random.address,
      handler: random.address,
    });
    const list = await contract.connect(owner).listBridges();

    /** Assert */
    await expect(call)
      .to.emit(contract, "UpdatedBridgeProvider")
      .withArgs(0, true, ZeroAddress, random.address);

    expect(list).to.be.length(1);
    expect(list[0].code).to.equal(0);
    expect(list[0].enabled).to.equal(true);
    expect(list[0].implementation).to.equal(random.address);
    expect(list[0].handler).to.equal(random.address);
  });

  it("Should add a swapper correctly if the owner is the caller", async function () {
    /** Arrange */
    const { owner, random } = await getAccounts();

    /** Act */
    const call = contract.connect(owner).updateSwapper({
      code: 0,
      enabled: true,
      implementation: random.address,
      handler: random.address,
    });
    const list = await contract.connect(owner).listSwappers();

    /** Assert */
    await expect(call)
      .to.emit(contract, "UpdatedSwapProvider")
      .withArgs(0, true, ZeroAddress, random.address);

    expect(list).to.be.length(1);
    expect(list[0].code).to.equal(0);
    expect(list[0].enabled).to.equal(true);
    expect(list[0].implementation).to.equal(random.address);
    expect(list[0].handler).to.equal(random.address);
  });

  it("Should disable a bridge correctly", async function () {
    /** Arrange */
    const { owner, random } = await getAccounts();

    await contract.connect(owner).updateBridge({
      code: 0,
      enabled: true,
      implementation: random.address,
      handler: random.address,
    });

    /** Act */
    const call = contract.connect(owner).updateBridge({
      code: 0,
      enabled: false,
      implementation: random.address,
      handler: random.address,
    });
    const list = await contract.connect(owner).listBridges();

    /** Assert */
    await expect(call)
      .to.emit(contract, "UpdatedBridgeProvider")
      .withArgs(0, false, random.address, random.address);

    expect(list).to.be.length(1);
    expect(list[0].enabled).to.equal(false);
  });

  it("Should disable a swapper correctly", async function () {
    /** Arrange */
    const { owner, random } = await getAccounts();

    await contract.connect(owner).updateSwapper({
      code: 0,
      enabled: true,
      implementation: random.address,
      handler: random.address,
    });

    /** Act */
    const call = contract.connect(owner).updateSwapper({
      code: 0,
      enabled: false,
      implementation: random.address,
      handler: random.address,
    });
    const list = await contract.connect(owner).listSwappers();

    /** Assert */
    await expect(call)
      .to.emit(contract, "UpdatedSwapProvider")
      .withArgs(0, false, random.address, random.address);

    expect(list).to.be.length(1);
    expect(list[0].enabled).to.equal(false);
  });

  it("Should be able to add different bridges", async function () {
    /** Arrange */
    const { owner, random, anyoneElse } = await getAccounts();

    /** Act */
    await contract.connect(owner).updateBridge({
      code: 0,
      enabled: true,
      implementation: random.address,
      handler: random.address,
    });
    await contract.connect(owner).updateBridge({
      code: 1,
      enabled: false,
      implementation: anyoneElse.address,
      handler: anyoneElse.address,
    });
    const list = await contract.connect(owner).listBridges();

    /** Assert */
    expect(list).to.be.length(2);

    expect(list[0].code).to.equal(0);
    expect(list[0].enabled).to.equal(true);
    expect(list[0].implementation).to.equal(random.address);
    expect(list[0].handler).to.equal(random.address);

    expect(list[1].code).to.equal(1);
    expect(list[1].enabled).to.equal(false);
    expect(list[1].implementation).to.equal(anyoneElse.address);
    expect(list[1].handler).to.equal(anyoneElse.address);
  });

  it("Should be able to add different swappers", async function () {
    /** Arrange */
    const { owner, random, anyoneElse } = await getAccounts();

    /** Act */
    await contract.connect(owner).updateSwapper({
      code: 0,
      enabled: true,
      implementation: random.address,
      handler: random.address,
    });
    await contract.connect(owner).updateSwapper({
      code: 1,
      enabled: false,
      implementation: anyoneElse.address,
      handler: anyoneElse.address,
    });
    const list = await contract.connect(owner).listSwappers();

    /** Assert */
    expect(list).to.be.length(2);

    expect(list[0].code).to.equal(0);
    expect(list[0].enabled).to.equal(true);
    expect(list[0].implementation).to.equal(random.address);
    expect(list[0].handler).to.equal(random.address);

    expect(list[1].code).to.equal(1);
    expect(list[1].enabled).to.equal(false);
    expect(list[1].implementation).to.equal(anyoneElse.address);
    expect(list[1].handler).to.equal(anyoneElse.address);
  });
});

import chai, { expect } from "chai";
import { ethers } from "hardhat";
import { getAccounts, ZeroAddress } from "../shared";
import { Contract } from "ethers";
import { smock } from "@defi-wonderland/smock";

const Deployer = require("../../../scripts/Deployer");

chai.use(smock.matchers);

describe("RelayerUpdaterFacet", function () {
  let contract: Contract;

  beforeEach(async () => {
    const { owner, relayer } = await getAccounts();
    const deployer = new Deployer(ethers, owner, relayer);
    await deployer.deploy();

    contract = await deployer.interactWith("RelayerUpdaterFacet");
  });

  it("Should fail if anyone else than the owner tries to update the relayer", async function () {
    /** Arrange */
    const { anyoneElse, random } = await getAccounts();

    /** Act */
    const call = contract.connect(anyoneElse).updateRelayer(random.address);

    /** Assert */
    await expect(call).to.be.reverted;
  });

  it("Should fail if the new relayer address is ZeroAddress", async function () {
    /** Arrange */
    const { owner } = await getAccounts();

    /** Act */
    const call = contract.connect(owner).updateRelayer(ZeroAddress);

    /** Assert */
    await expect(call).to.be.reverted;
  });

  it("Should emit an event when the relayer is successfully updated", async function () {
    /** Arrange */
    const { owner, random, relayer } = await getAccounts();

    /** Act */
    const call = contract.connect(owner).updateRelayer(random.address);

    /** Assert */
    await expect(call)
      .to.emit(contract, "UpdatedRelayer")
      .withArgs(relayer.address, random.address);
  });
});

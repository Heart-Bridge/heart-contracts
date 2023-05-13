import { expect } from "chai";
import { ethers } from "hardhat";
import { fakeTokenContract, getAccounts, RandomAddress } from "../shared";
import { Contract } from "ethers";

const Deployer = require("../../../scripts/Deployer");

describe("RouterFacet - general", function () {
  let router: Contract;

  beforeEach(async () => {
    const { owner, relayer } = await getAccounts();
    const deployer = new Deployer(ethers, owner, relayer);
    await deployer.deploy();

    router = await deployer.interactWith("RouterFacet");
  });

  it("Should fail if anyone else than the owner tries to retrieve", async function () {
    /** Arrange */
    const { anyoneElse } = await getAccounts();

    /** Act */
    const call = router.connect(anyoneElse).retrieve(RandomAddress, 1);

    /** Assert */
    await expect(call).to.be.reverted;
  });

  it("Should allow the owner to retrieve funds", async function () {
    /** Arrange */
    const { owner } = await getAccounts();
    const fakeToken = await fakeTokenContract();

    /** Act */
    await router.connect(owner).retrieve(fakeToken.address, 1);

    /** Assert */
    await expect(fakeToken.transfer).to.be.calledOnceWith(owner.address, 1);
  });
});
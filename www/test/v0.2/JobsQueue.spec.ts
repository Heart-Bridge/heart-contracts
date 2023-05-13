import chai, { expect } from "chai";
import { smock } from "@defi-wonderland/smock";
import { fakeTokenContract, getAccounts } from "./shared";
import { Contract, Signer } from "ethers";
import { ethers } from "hardhat";
import { faker } from "@faker-js/faker";

chai.use(smock.matchers);

describe("Jobs Queue", () => {
  let core: Contract;

  beforeEach(async () => {
    const { owner, gelato } = await getAccounts();
    const Factory = await ethers.getContractFactory("JobsQueue");
    core = await Factory.connect(owner).deploy(gelato.address);
    await core.deployed();
  });

  it("should revert if caller not whitelisted", async () => {
    // Arrange
    const { anyoneElse } = await getAccounts();

    // Act
    const call = core.connect(anyoneElse).createJob("0x");

    // Assert
    await expect(call).to.be.revertedWith("UnauthorizedOrigin");
  });

  it("should be able to create job from whitelisted address", async () => {
    // Arrange
    const { owner, anyoneElse, random } = await getAccounts();
    await core.connect(owner).updateOrigins([anyoneElse.address]);
    const receiver = faker.finance.ethereumAddress();
    const calldata = encodeData([
      "0xfc3838689ce844438ff358bd41f403f9",
      receiver,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      1,
      1,
      1,
    ]);

    // Act
    await core.connect(anyoneElse).createJob(calldata);
    const jobs = await core.connect(random).getPendingJobs();

    // Assert
    expect(jobs.length).to.be.equal(1);
    expect(jobs[0].receiver.toLowerCase()).to.be.equal(receiver.toLowerCase());
    expect(jobs[0].inputAsset).to.be.equal(ethers.constants.AddressZero);
    expect(jobs[0].dstAsset).to.be.equal(ethers.constants.AddressZero);
    expect(jobs[0].dstChain).to.be.equal("1");
    expect(jobs[0].amountIn).to.be.equal("1");
    expect(jobs[0].minAmountOut).to.be.equal("1");
  });

  it("should revert if creating a job with a used ID", async () => {
    // Arrange
    const { owner, anyoneElse } = await getAccounts();
    await core.connect(owner).updateOrigins([anyoneElse.address]);
    await createJob(core, anyoneElse, [
      "0xfc3838689ce844438ff358bd41f403f9",
      faker.finance.ethereumAddress(),
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      1,
      1,
      1,
    ]);
    const calldata = encodeData([
      "0xfc3838689ce844438ff358bd41f403f9",
      faker.finance.ethereumAddress(),
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      1,
      100,
      1,
    ]);

    // Act
    const call = core.connect(anyoneElse).createJob(calldata);

    // Assert
    await expect(call).to.be.revertedWith("JobIdInUse");
  });

  it("should revert if a message comes without receiver", async () => {
    // Arrange
    const { owner, anyoneElse } = await getAccounts();
    await core.connect(owner).updateOrigins([anyoneElse.address]);
    const calldata = encodeData([
      "0xfc3838689ce844438ff358bd41f403f9",
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      1,
      100,
      1,
    ]);

    // Act
    const call = core.connect(anyoneElse).createJob(calldata);

    // Assert
    await expect(call).to.be.revertedWith("JobWithNoReceiver");
  });

  describe("jobs array pruning", () => {
    beforeEach(async () => {
      const { owner, anyoneElse } = await getAccounts();
      await core.connect(owner).updateOrigins([anyoneElse.address]);
      const inputAsset = await fakeTokenContract();
      await createJob(core, anyoneElse, [
        "0xfc3838689ce844438ff358bd41f403f7",
        faker.finance.ethereumAddress(),
        inputAsset.address,
        faker.finance.ethereumAddress(),
        1,
        100,
        90,
      ]);
      await createJob(core, anyoneElse, [
        "0xfc3838689ce844438ff358bd41f403f8",
        faker.finance.ethereumAddress(),
        inputAsset.address,
        faker.finance.ethereumAddress(),
        1,
        100,
        90,
      ]);
      await createJob(core, anyoneElse, [
        "0xfc3838689ce844438ff358bd41f403f9",
        faker.finance.ethereumAddress(),
        inputAsset.address,
        faker.finance.ethereumAddress(),
        1,
        100,
        90,
      ]);
    });

    it("should remain two jobs after executing one", async () => {
      // Arrange
      const { random, gelato } = await getAccounts();
      const jobsBefore = await core.connect(random).getPendingJobs();
      const id0 = jobsBefore[0].id;
      const id2 = jobsBefore[2].id;

      // Act
      await core
        .connect(gelato)
        .executeJobs([
          [
            jobsBefore[1].id,
            "0x1231231231231231231232212122121213",
            faker.finance.ethereumAddress(),
            "0x",
          ],
        ]);

      // Assert
      const jobsAfter = await core.connect(random).getPendingJobs();
      expect(jobsAfter.length).to.be.equal(2);
      expect(jobsAfter[0].id).to.be.equal(id0);
      expect(jobsAfter[1].id).to.be.equal(id2);
    });

    it("should remain one jobs after executing two", async () => {
      // Arrange
      const { random, gelato } = await getAccounts();
      const jobsBefore = await core.connect(random).getPendingJobs();
      const id2 = jobsBefore[2].id;

      // Act
      await core.connect(gelato).executeJobs([
        [
          jobsBefore[0].id,
          "0x1231231231231231231232212122121213",
          faker.finance.ethereumAddress(),
          "0x",
        ],
        [
          jobsBefore[1].id,
          "0x1231231231231231231232212122121213",
          faker.finance.ethereumAddress(),
          "0x",
        ],
      ]);

      // Assert
      const jobsAfter = await core.connect(random).getPendingJobs();
      expect(jobsAfter.length).to.be.equal(1);
      expect(jobsAfter[0].id).to.be.equal(id2);
    });

    it("should remain no jobs after executing three", async () => {
      // Arrange
      const { random, gelato } = await getAccounts();
      const jobsBefore = await core.connect(random).getPendingJobs();

      // Act
      await core.connect(gelato).executeJobs([
        [
          jobsBefore[0].id,
          "0x1231231231231231231232212122121213",
          faker.finance.ethereumAddress(),
          "0x",
        ],
        [
          jobsBefore[1].id,
          "0x1231231231231231231232212122121213",
          faker.finance.ethereumAddress(),
          "0x",
        ],
        [
          jobsBefore[2].id,
          "0x1231231231231231231232212122121213",
          faker.finance.ethereumAddress(),
          "0x",
        ],
      ]);

      // Assert
      const jobsAfter = await core.connect(random).getPendingJobs();
      expect(jobsAfter.length).to.be.equal(0);
    });
  });
});

async function createJob(core: Contract, origin: Signer, args: any) {
  const calldata = encodeData(args);
  await core.connect(origin).createJob(calldata);
}

function encodeData(args: any) {
  return ethers.utils.defaultAbiCoder.encode(
    [
      "bytes16",
      "address",
      "address",
      "address",
      "uint256",
      "uint256",
      "uint256",
    ],
    args
  );
}

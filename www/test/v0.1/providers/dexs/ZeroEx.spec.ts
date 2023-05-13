import chai, { expect } from "chai";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { ethers } from "hardhat";
import {
  deployByName,
  fakeTokenContract,
  getAccounts,
  RandomAddress,
} from "../../shared";
import { BigNumber, Contract } from "ethers";

chai.use(smock.matchers);

describe("ZeroEx provider", () => {
  let contract: Contract;

  beforeEach(async () => {
    const { owner } = await getAccounts();
    contract = await deployByName("ZeroEx", owner);
  });

  it("should revert if provider handler has no code", async () => {
    // Arrange
    const { owner } = await getAccounts();

    // Act
    const call = contract
      .connect(owner)
      .swap(RandomAddress, RandomAddress, RandomAddress, 0, "0x");

    // Assert
    expect(call).to.be.revertedWith("Provider has no code");
  });

  it("should fail when provider fails", async () => {
    // Arrange
    const { owner } = await getAccounts();
    const [callData, zeroExHandler] = await fakeZeroExRouter();
    const tokenIn = await fakeTokenContract();
    const tokenOut = await fakeTokenContract();
    const amountIn = BigNumber.from("10");

    zeroExHandler.swap.reverts();

    // Act
    const call = contract
      .connect(owner)
      .swap(
        ethers.constants.AddressZero,
        tokenIn.address,
        tokenOut.address,
        amountIn,
        callData
      );

    // Assert
    await expect(call).to.be.revertedWith("ZeroEx failed: Reverted silently");
  });

  it("should send correct callData to provider", async () => {
    // Arrange
    const { owner } = await getAccounts();
    const [callData, zeroExHandler] = await fakeZeroExRouter();
    const zeroExCallData = generateZeroExCallData([100, 10]);
    const tokenIn = await fakeTokenContract();
    const tokenOut = await fakeTokenContract({ balanceOf: 100 });
    const amountIn = BigNumber.from("10");

    // Act
    await contract
      .connect(owner)
      .swap(
        ethers.constants.AddressZero,
        tokenIn.address,
        tokenOut.address,
        amountIn,
        callData
      );

    // Assert
    const encodedArgs = generateZeroExCallData(
      <any[]>zeroExHandler.swap.getCall(0).args
    );
    expect(zeroExCallData).to.be.equal(encodedArgs);
  });
});

const tokenAbi = [
  "function swap(" +
    "      uint amountIn," +
    "      uint amountOutMin" +
    "   ) external",
];

function generateZeroExCallData(args: any[]): string {
  const abiInterface = new ethers.utils.Interface(tokenAbi);
  const selector = abiInterface.getSighash("swap");
  const encodedArgs = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint256"],
    args
  );
  return ethers.utils.hexConcat([selector, encodedArgs]);
}

async function fakeZeroExRouter(): Promise<[string, FakeContract]> {
  const handler = await smock.fake(tokenAbi);
  const zeroExCallData = generateZeroExCallData([100, 10]);
  const encodedAddress = ethers.utils.defaultAbiCoder.encode(
    ["address"],
    [handler.address]
  );

  const handlerCallData = ethers.utils.hexConcat([
    encodedAddress,
    zeroExCallData,
  ]);

  return [handlerCallData, handler];
}

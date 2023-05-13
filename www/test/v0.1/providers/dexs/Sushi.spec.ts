import chai, { expect } from "chai";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { ethers } from "hardhat";
import {
  deployByName,
  fakeTokenContract,
  getAccounts, NativeToken,
  RandomAddress,
} from "../../shared";
import { BigNumber, Contract } from "ethers";

chai.use(smock.matchers);

describe("Sushi provider", () => {
  let contract: Contract;

  beforeEach(async () => {
    const { owner } = await getAccounts();
    contract = await deployByName("Sushi", owner);
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
    const sushiHandler = await fakeSushiSwapRouter();
    const tokenIn = await fakeTokenContract();
    const tokenOut = await fakeTokenContract();
    const amountIn = BigNumber.from("10");
    const callData = generateSwapExactTokensForTokensCallData([
      100,
      10,
      [RandomAddress, RandomAddress],
      RandomAddress,
      100,
    ]);

    sushiHandler.swapExactTokensForTokens.reverts();

    // Act
    const call = contract
      .connect(owner)
      .swap(
        sushiHandler.address,
        tokenIn.address,
        tokenOut.address,
        amountIn,
        callData
      );

    // Assert
    await expect(call).to.be.revertedWith("Sushi failed: Reverted silently");
  });

  it("should send value if native token in", async () => {
    // Waiting for the feature that allows to test sent value to be released //
    /*
    // Arrange
    const { owner } = await getAccounts();
    const sushiHandler = await fakeSushiSwapRouter();
    const tokenIn = NativeToken;
    const tokenOut = await fakeTokenContract();
    const amountIn = BigNumber.from("10");
    const callData = generateSwapExactTokensForTokensCallData([
      100,
      10,
      [RandomAddress, RandomAddress],
      RandomAddress,
      100,
    ]);

    // Act
    await contract
      .connect(owner)
      .swap(
        sushiHandler.address,
        tokenIn,
        tokenOut.address,
        amountIn,
        callData
      );

    // Assert
    expect(sushiHandler.swapExactTokensForTokens).to.have.been.calledWithValue(10);
     */
  });

  it("should approve handler if non-native token in", async () => {
    // Arrange
    const { owner } = await getAccounts();
    const sushiHandler = await fakeSushiSwapRouter();
    const tokenIn = await fakeTokenContract();
    const tokenOut = await fakeTokenContract();
    const amountIn = BigNumber.from("10");
    const callData = generateSwapExactTokensForTokensCallData([
      100,
      10,
      [RandomAddress, RandomAddress],
      RandomAddress,
      100,
    ]);

    // Act
    await contract
      .connect(owner)
      .swap(
        sushiHandler.address,
        tokenIn.address,
        tokenOut.address,
        amountIn,
        callData
      );

    // Assert
    expect(tokenIn.approve).to.be.calledOnceWith(
      sushiHandler.address,
      amountIn
    );
  });

  it("should send correct callData to provider", async () => {
    // Arrange
    const { owner } = await getAccounts();
    const sushiHandler = await fakeSushiSwapRouter();

    const tokenIn = await fakeTokenContract();
    const tokenOut = await fakeTokenContract({ balanceOf: 100 });
    const amountIn = BigNumber.from("10");
    const callData = generateSwapExactTokensForTokensCallData([
      100,
      10,
      [RandomAddress, RandomAddress],
      RandomAddress,
      100,
    ]);

    // Act
    await contract
      .connect(owner)
      .swap(
        sushiHandler.address,
        tokenIn.address,
        tokenOut.address,
        amountIn,
        callData
      );

    // Assert
    const encodedArgs = generateSwapExactTokensForTokensCallData(
      <any[]>sushiHandler.swapExactTokensForTokens.getCall(0).args
    );
    expect(callData).to.be.contain(encodedArgs);
  });
});

function generateSwapExactTokensForTokensCallData(args: any[]): string {
  const selector = "0x38ed1739";
  const encodedArgs = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint256", "address[]", "address", "uint256"],
    args
  );
  return ethers.utils.hexConcat([selector, encodedArgs]);
}

async function fakeSushiSwapRouter(): Promise<FakeContract> {
  const tokenAbi = [
    "function swapExactTokensForTokens(" +
      "      uint amountIn," +
      "      uint amountOutMin," +
      "      address[] calldata path," +
      "      address to," +
      "      uint deadline" +
      "   ) external returns (uint[] memory amounts)",
  ];
  return await smock.fake(tokenAbi);
}

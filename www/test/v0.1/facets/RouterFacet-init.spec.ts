import chai, { expect } from "chai";
import { ethers } from "hardhat";
import {
  fakeTokenContract,
  getAccounts,
  NativeToken,
  RandomAddress,
  ZeroAddress,
  zeroExEncodedCalldata,
} from "../shared";
import { Contract } from "ethers";
import { FakeContract, smock } from "@defi-wonderland/smock";

const Deployer = require("../../../scripts/Deployer");

chai.use(smock.matchers);

describe("RouterFacet - init", function () {
  let providerUpdater: Contract;
  let router: Contract;
  let anyswap: Contract;
  let zeroEx: Contract;

  beforeEach(async () => {
    const { owner, relayer } = await getAccounts();
    const deployer = new Deployer(ethers, owner, relayer);
    await deployer.deploy();

    providerUpdater = await deployer.interactWith("ProviderUpdaterFacet");
    router = await deployer.interactWith("RouterFacet");

    anyswap = await deployer.deployByName("Anyswap");
    zeroEx = await deployer.deployByName("ZeroEx");
  });

  it("Should revert if no swap nor bridge step is required", async function () {
    /** Arrange */
    const { anyoneElse } = await getAccounts();

    /** Act */
    const call = router
      .connect(anyoneElse)
      .initSwidge(
        1000000,
        [0, RandomAddress, RandomAddress, "0x", false],
        [0, RandomAddress, 57, "0x", false],
        [RandomAddress, RandomAddress, RandomAddress, 0]
      );

    /** Assert */
    await expect(call).to.be.revertedWith("No required actions");
  });

  it("Should revert if no input amount is given", async function () {
    /** Arrange */
    const { anyoneElse } = await getAccounts();

    // Create two fake ERC20 tokens
    const fakeTokenIn = await fakeTokenContract();
    const fakeTokenOut = await fakeTokenContract();

    /** Act */
    const call = router
      .connect(anyoneElse)
      .initSwidge(
        0,
        [0, fakeTokenIn.address, fakeTokenOut.address, "0x", true],
        [0, RandomAddress, 57, "0x", false],
        [RandomAddress, RandomAddress, RandomAddress, 0]
      );

    /** Assert */
    await expect(call).to.be.revertedWith("No input amount");
  });

  it("Should revert if no receiver address is given", async function () {
    /** Arrange */
    const { anyoneElse } = await getAccounts();

    // Create two fake ERC20 tokens
    const fakeTokenIn = await fakeTokenContract();
    const fakeTokenOut = await fakeTokenContract();

    /** Act */
    const call = router
      .connect(anyoneElse)
      .initSwidge(
        10,
        [0, fakeTokenIn.address, fakeTokenOut.address, "0x", true],
        [0, RandomAddress, 57, "0x", false],
        [RandomAddress, RandomAddress, ethers.constants.AddressZero, 0]
      );

    /** Assert */
    await expect(call).to.be.revertedWith("Receiver address is empty");
  });

  it("Should only send swap event if no bridging step is required", async function () {
    /** Arrange */
    const { owner, anyoneElse } = await getAccounts();

    // Create two fake ERC20 tokens
    const fakeTokenIn = await fakeTokenContract();
    const fakeTokenOut = await fakeTokenContract();

    // Fake response from executed methods on the output token
    fakeTokenOut.balanceOf.returnsAtCall(0, 10);
    fakeTokenOut.balanceOf.returnsAtCall(1, 20);

    const [callData] = await zeroExEncodedCalldata();

    await providerUpdater
      .connect(owner)
      .updateSwapper([0, true, zeroEx.address, ZeroAddress]);

    /** Act */
    const call = router
      .connect(anyoneElse)
      .initSwidge(
        1000000,
        [0, fakeTokenIn.address, fakeTokenOut.address, callData, true],
        [0, RandomAddress, 1337, "0x", false],
        [RandomAddress, RandomAddress, RandomAddress, 0]
      );

    /** Assert */
    await expect(call)
      .to.emit(router, "SwapExecuted")
      .withArgs(
        fakeTokenIn.address,
        fakeTokenOut.address,
        31337,
        1000000,
        10
      );
  });

  it("Should fail if bridge handler has no code", async function () {
    /** Arrange */
    const { owner, anyoneElse } = await getAccounts();

    // Create two fake ERC20 tokens
    const fakeTokenIn = await fakeTokenContract();

    const callData = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [RandomAddress]
    );

    const providerSwapCode = 0;
    const providerBridgeCode = 0;

    // : Update the provider in use to have no code
    await providerUpdater
      .connect(owner)
      .updateBridge([
        providerBridgeCode,
        true,
        anyswap.address,
        "0x0c0de0c0de0c0de0c0de0c0de0c0de0c0de0c0de",
      ]);

    /** Act */
    const call = router
      .connect(anyoneElse)
      .initSwidge(
        1000000,
        [providerSwapCode, RandomAddress, RandomAddress, "0x", false],
        [providerBridgeCode, fakeTokenIn.address, 1337, callData, true],
        [RandomAddress, RandomAddress, RandomAddress, 0]
      );

    /** Assert */
    await expect(call).to.be.revertedWith("Anyswap handler has no code");
  });

  it("Should only execute bridge if no swapping step is required", async function () {
    /** Arrange */
    const { owner, anyoneElse } = await getAccounts();

    const fakeTokenIn = await fakeTokenContract();
    const callData = encodedRandomAddress();
    const providerSwapCode = 0;
    const providerBridgeCode = 0;
    const anyswapMock = await fakeAnyswapRouter();
    const receiver = RandomAddress;

    await providerUpdater
      .connect(owner)
      .updateBridge([
        providerBridgeCode,
        true,
        anyswap.address,
        anyswapMock.address,
      ]);

    /** Act */
    const call = router.connect(anyoneElse).initSwidge(
      1000000,
      [providerSwapCode, RandomAddress, RandomAddress, "0x", false], // would fail executing with random addresses
      [providerBridgeCode, fakeTokenIn.address, 1337, callData, true],
      [RandomAddress, RandomAddress, receiver, 999]
    );

    /** Assert */
    await expect(call)
      .to.emit(router, "CrossInitiated")
      .withArgs(
        RandomAddress,
        fakeTokenIn.address,
        RandomAddress,
        RandomAddress,
        receiver,
        31337,
        1337,
        1000000,
        1000000,
        999
      );
  });

  it("Should execute swap and bridge when required", async function () {
    /** Arrange */
    const { owner, anyoneElse } = await getAccounts();

    // Create two fake ERC20 tokens
    const fakeTokenIn = await fakeTokenContract();
    const fakeTokenOut = await fakeTokenContract();

    // Fake response from executed methods on the output token
    fakeTokenOut.balanceOf.returnsAtCall(0, 10);
    fakeTokenOut.balanceOf.returnsAtCall(1, 20);

    const [callDataSwap] = await zeroExEncodedCalldata();
    const callDataBridge = encodedRandomAddress();
    const providerSwapCode = 0;
    const providerBridgeCode = 0;
    const anyswapMock = await fakeAnyswapRouter();

    await providerUpdater
      .connect(owner)
      .updateSwapper([providerSwapCode, true, zeroEx.address, ZeroAddress]);

    await providerUpdater
      .connect(owner)
      .updateBridge([
        providerBridgeCode,
        true,
        anyswap.address,
        anyswapMock.address,
      ]);

    /** Act */
    const call = router
      .connect(anyoneElse)
      .initSwidge(
        1000000,
        [
          providerSwapCode,
          fakeTokenIn.address,
          fakeTokenOut.address,
          callDataSwap,
          true,
        ],
        [providerBridgeCode, fakeTokenOut.address, 1337, callDataBridge, true],
        [RandomAddress, RandomAddress, RandomAddress, 999]
      );

    /** Assert */
    await expect(call)
      .to.emit(router, "CrossInitiated")
      .withArgs(
        fakeTokenIn.address,
        fakeTokenOut.address,
        RandomAddress,
        RandomAddress,
        RandomAddress,
        31337,
        1337,
        1000000,
        10,
        999
      );
  });

  it("Should swap successfully from native token", async function () {
    /** Arrange */
    const { owner, anyoneElse } = await getAccounts();

    // Create two fake ERC20 tokens
    const fakeTokenOut = await fakeTokenContract();

    // Fake response from executed methods on the output token
    fakeTokenOut.balanceOf.returnsAtCall(0, 10);
    fakeTokenOut.balanceOf.returnsAtCall(1, 20);

    const [callData] = await zeroExEncodedCalldata();

    await providerUpdater
      .connect(owner)
      .updateSwapper([0, true, zeroEx.address, ZeroAddress]);

    const amountIn = ethers.utils.parseEther("1.0");

    /** Act */
    const call = router
      .connect(anyoneElse)
      .initSwidge(
        amountIn,
        [0, NativeToken, fakeTokenOut.address, callData, true],
        [0, RandomAddress, 1337, "0x", false],
        [RandomAddress, RandomAddress, RandomAddress, 999],
        {
          value: amountIn,
        }
      );

    /** Assert */
    await expect(call)
      .to.emit(router, "SwapExecuted")
      .withArgs(
        NativeToken,
        fakeTokenOut.address,
        31337,
        "1000000000000000000",
        10
      );
  });

  it("Should revert if swap provider fails", async function () {
    /** Arrange */
    const { owner, anyoneElse } = await getAccounts();

    const fakeTokenOut = await fakeTokenContract();
    const [callData, zeroExHandler] = await zeroExEncodedCalldata();
    const amountIn = ethers.utils.parseEther("1.0");

    // set provider as the one in use
    await providerUpdater
      .connect(owner)
      .updateSwapper([0, true, zeroEx.address, ZeroAddress]);

    // set provider to fail
    zeroExHandler.testFunction.reverts();

    /** Act */
    const call = router
      .connect(anyoneElse)
      .initSwidge(
        amountIn,
        [0, NativeToken, fakeTokenOut.address, callData, true],
        [0, RandomAddress, 1337, "0x", false],
        [RandomAddress, RandomAddress, RandomAddress, 999],
        {
          value: amountIn,
        }
      );

    /** Assert */
    await expect(call).to.be.reverted;
  });

  it("Should revert if bridge provider fails", async function () {
    /** Arrange */
    const { owner, anyoneElse } = await getAccounts();

    const fakeTokenIn = await fakeTokenContract();
    const callDataBridge = encodedRandomAddress();
    const amountIn = ethers.utils.parseEther("1.0");
    const anyswapMock = await fakeAnyswapRouter();
    const providerBridgeCode = 0;

    // set our mock provider as the one in use
    await providerUpdater
      .connect(owner)
      .updateBridge([
        providerBridgeCode,
        true,
        anyswap.address,
        anyswapMock.address,
      ]);

    // setting the provider to fail
    anyswapMock.anySwapOutUnderlying.reverts();

    /** Act */
    const call = router
      .connect(anyoneElse)
      .initSwidge(
        amountIn,
        [0, RandomAddress, RandomAddress, "0x", false],
        [providerBridgeCode, fakeTokenIn.address, 1337, callDataBridge, true],
        [RandomAddress, RandomAddress, RandomAddress, 999],
        {
          value: amountIn,
        }
      );

    /** Assert */
    await expect(call).to.be.reverted;
  });
});

async function fakeAnyswapRouter(): Promise<FakeContract> {
  const tokenAbi = [
    "function anySwapOutUnderlying(address token, address to, uint amount, uint toChainID) external",
  ];
  return await smock.fake(tokenAbi);
}

function encodedRandomAddress() {
  return ethers.utils.defaultAbiCoder.encode(["address"], [RandomAddress]);
}

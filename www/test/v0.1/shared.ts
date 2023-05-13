import { FakeContract, smock } from "@defi-wonderland/smock";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Signer } from "ethers";

export const NativeToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
export const ZeroAddress = "0x0000000000000000000000000000000000000000";
export const RandomAddress = "0x1231231231231231321231231231231231231231";

export interface TokenContractResponses {
  balanceOf?: number;
  approve?: boolean;
  transfer?: boolean;
  transferFrom?: boolean;
}

export async function getAccounts(): Promise<{
  owner: SignerWithAddress;
  anyoneElse: SignerWithAddress;
  relayer: SignerWithAddress;
  random: SignerWithAddress;
}> {
  const [owner, anyoneElse, relayer, random] = await ethers.getSigners();
  return {
    owner,
    anyoneElse,
    relayer,
    random,
  };
}

/**
 * Instantiates a new ERC20 token fake contract
 * @param responses Allows to config the response values of the different methods
 */
export async function fakeTokenContract(
  responses?: TokenContractResponses
): Promise<FakeContract> {
  const tokenAbi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint)",
    "function approve(address spender, uint256 value) returns (bool)",
    "function transferFrom(address _from, address _to, uint256 _value) returns (bool)",
    "function transfer(address _to, uint256 _value) returns (bool)",
    "event Transfer(address indexed from, address indexed to, uint amount)",
  ];
  const fake = await smock.fake(tokenAbi);

  if (responses === undefined) responses = {};

  responses.balanceOf =
    responses.balanceOf === undefined ? 0 : responses.balanceOf;
  responses.approve =
    responses.approve === undefined ? true : responses.approve;
  responses.transfer =
    responses.transfer === undefined ? true : responses.transfer;
  responses.transferFrom =
    responses.transferFrom === undefined ? true : responses.transferFrom;

  fake.balanceOf.returns(responses.balanceOf);
  fake.approve.returns(responses.approve);
  fake.transfer.returns(responses.transfer);
  fake.transferFrom.returns(responses.transferFrom);

  return fake;
}

/**
 * Generates bytes of this data types:
 * (address, bytes)
 * The first address will be the invoked contract
 * The rest of the bytes are the callData for that contract (not relevant on this scope)
 */
export async function zeroExEncodedCalldata(): Promise<[string, FakeContract]> {
  const ABI = ["function testFunction() external"];
  const abiInterface = new ethers.utils.Interface(ABI);
  const myFake = await smock.fake(ABI);

  // Encode contract call address
  const encodedCallAddress = ethers.utils.defaultAbiCoder.encode(
    ["address"],
    [myFake.address]
  );

  // Encode contract call payload
  const encodedSelector = abiInterface.getSighash("testFunction");
  const encodedArguments = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint256"],
    [10, 20]
  );

  // Pack bytes
  const encodedCallData = ethers.utils.hexConcat([
    encodedSelector,
    encodedArguments,
  ]);

  // Pack payload
  const payload = ethers.utils.hexConcat([encodedCallAddress, encodedCallData]);

  return [payload, myFake];
}

/**
 * Deploy a specific contract by name
 * @param contractName
 * @param deployer
 * @param args
 * @returns {Promise<*>}
 */
export async function deployByName(
  contractName: string,
  deployer: Signer,
  args = []
) {
  const Factory = await ethers.getContractFactory(contractName);
  const contract = await Factory.connect(deployer).deploy(...args);
  await contract.deployed();
  return contract;
}

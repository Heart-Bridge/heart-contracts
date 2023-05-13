import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { FakeContract, smock } from "@defi-wonderland/smock";

export const NativeToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

interface TokenContractResponses {
  balanceOf?: number;
  approve?: boolean;
  transfer?: boolean;
  transferFrom?: boolean;
}

export async function getAccounts(): Promise<{
  owner: SignerWithAddress;
  anyoneElse: SignerWithAddress;
  gelato: SignerWithAddress;
  random: SignerWithAddress;
}> {
  const [owner, anyoneElse, gelato, random] = await ethers.getSigners();
  return {
    owner,
    anyoneElse,
    gelato,
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
    "function allowance(address owner, address spender) external view returns (uint256)",
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

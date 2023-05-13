const getAccounts = require("./helpers/accounts.js");
const { getTokens } = require("./helpers/tokens.js");
const tokenAbi = require("./helpers/IERC20.json");

module.exports = async function (taskArguments, hre, runSuper) {
  const network = taskArguments.chain;
  const tokenName = taskArguments.token;

  const token = getTokens(network)[tokenName];
  const { user } = await getAccounts(hre);

  const tokenContract = new hre.ethers.Contract(
    token.address,
    tokenAbi,
    hre.ethers.getDefaultProvider()
  );

  const fees = await hre.ethers.provider.getFeeData();

  await user.sendTransaction({
    to: token.holder,
    value: hre.ethers.utils.parseEther("1.0"),
    gasPrice: fees.gasPrice,
    gasLimit: 9000000,
  });

  await impersonate(hre, token.holder);

  const signer = await hre.ethers.provider.getSigner(token.holder);

  const tx = await tokenContract
    .connect(signer)
    .transfer(
      user.address,
      hre.ethers.utils.parseUnits("100", token.decimals),
      {
        gasPrice: fees.gasPrice,
        gasLimit: 9000000,
      }
    );

  await stopImpersonate(hre, token.holder);

  console.log(await tx.wait());

  console.log("Tokens OK");
};

async function impersonate(hre, address) {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
}

async function stopImpersonate(hre, address) {
  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [address],
  });
}

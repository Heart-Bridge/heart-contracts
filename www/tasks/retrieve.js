const getAccounts = require("./helpers/accounts.js");
const { getAddresses } = require("./helpers/addresses.js");

module.exports = async function (taskArguments, hre, runSuper) {
  const { deployer } = await getAccounts(hre);
  const chain = taskArguments.chain;
  const token = taskArguments.token;
  const amount = taskArguments.amount;
  const allAddresses = getAddresses();
  const addresses = allAddresses[chain];

  const router = await hre.ethers.getContractAt(
    "RouterFacet",
    addresses.diamond
  );

  (await router.connect(deployer).retrieve(token, amount)).wait();
};

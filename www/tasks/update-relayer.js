const getAccounts = require("./helpers/accounts.js");
const { getAddresses } = require("./helpers/addresses.js");

module.exports = async function (taskArguments, hre, runSuper) {
  const { deployer, relayer } = await getAccounts(hre);
  const chain = taskArguments.chain;
  const addresses = getAddresses()[chain];

  const routerFacet = await hre.ethers.getContractAt(
    "RelayerUpdaterFacet",
    addresses.diamond
  );

  await routerFacet.connect(deployer).updateRelayer(relayer.address);
};

const getAccounts = require("./helpers/accounts.js");
const { getAddresses, saveAddresses } = require("./helpers/addresses.js");

module.exports = async function (taskArguments, hre, runSuper) {
  const { deployer } = await getAccounts(hre);
  const chain = taskArguments.chain;
  const dexName = taskArguments.dex;
  const allAddresses = getAddresses();
  const addresses = allAddresses[chain];
  const dexDetails = addresses.dex[dexName];

  const Dex = await hre.ethers.getContractFactory(dexName);
  const dex = await Dex.connect(deployer).deploy();
  await dex.deployed();

  const providerUpdater = await hre.ethers.getContractAt(
    "ProviderUpdaterFacet",
    addresses.diamond
  );

  (
    await providerUpdater.connect(deployer).updateSwapper({
      code: dexDetails.code,
      enabled: dexDetails.enabled,
      implementation: dex.address,
      handler: dexDetails.handler,
    })
  ).wait();

  allAddresses[chain].dex[dexName].implementation = dex.address;
  saveAddresses(allAddresses);
};

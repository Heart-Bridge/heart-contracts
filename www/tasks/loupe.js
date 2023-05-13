const { getAddresses } = require("./helpers/addresses.js");

module.exports = async function (taskArguments, hre, runSuper) {
  const chain = taskArguments.chain;
  const store = taskArguments.store;
  const addresses = getAddresses()[chain];

  const facet = store === "diamond" ? "IDiamondLoupe" : "ProviderUpdaterFacet";

  const loupe = await hre.ethers.getContractAt(facet, addresses.diamond);

  if (store === "diamond") {
    await loupe.facets().then(console.log);
  } else if (store === "bridge") {
    await loupe.listBridges().then(console.log);
  } else if (store === "swap") {
    await loupe.listSwappers().then(console.log);
  } else {
    console.log("None");
  }
};

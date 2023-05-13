const { getAddresses } = require("./helpers/addresses");

module.exports = async function (taskArguments, hre, runSuper) {
  const chain = taskArguments.chain;
  const addresses = getAddresses()[chain];

  await hre.run("verify:verify", {
    address: addresses.diamond,
    constructorArguments: [addresses.facet.DiamondCutterFacet],
  });
};

const getAccounts = require("./helpers/accounts.js");
const { getAddresses, saveAddresses } = require("./helpers/addresses.js");
const Deployer = require("../scripts/Deployer");

module.exports = async function (taskArguments, hre, runSuper) {
  const { deployer, relayer } = await getAccounts(hre);

  const deployerHelper = new Deployer(hre.ethers, deployer, relayer);

  await deployerHelper.deploy();

  // persist new addresses
  const allAddresses = getAddresses();
  const addr = allAddresses[hre.network.name];

  const facets = deployerHelper.getFacets();
  const diamond = deployerHelper.getDiamond();

  addr.diamond = diamond.address;
  addr.facet.RouterFacet = facets.routerFacet.address;
  addr.facet.RelayerUpdaterFacet = facets.relayerUpdaterFacet.address;
  addr.facet.DiamondCutterFacet = facets.diamondCutterFacet.address;
  addr.facet.DiamondLoupeFacet = facets.diamondLoupeFacet.address;
  addr.facet.ProviderUpdaterFacet = facets.providerUpdaterFacet.address;
  addr.facet.FeeManagerFacet = facets.feeManagerFacet.address;

  allAddresses[hre.network.name] = addr;

  saveAddresses(allAddresses);
};

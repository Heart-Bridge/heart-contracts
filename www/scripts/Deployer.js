const { FacetCutAction, getSelectors } = require("./libs/diamond");

module.exports = class Deployer {
  ethers;
  deployer;
  relayer;

  diamond;

  diamondCutterFacet;
  diamondLoupeFacet;
  routerFacet;
  relayerUpdaterFacet;
  providerUpdaterFacet;
  feeManagerFacet;

  constructor(_ethers, _deployer, _relayer) {
    this.ethers = _ethers;
    this.deployer = _deployer;
    this.relayer = _relayer;
  }

  /**
   * Deploy and initialize a new diamond
   * @returns {Promise<void>}
   */
  async deploy() {
    this.diamondCutterFacet = await this.deployByName("DiamondCutterFacet");

    this.diamond = await this.deployByName("Diamond", [
      this.diamondCutterFacet.address,
    ]);

    this.relayerUpdaterFacet = await this.deployByName("RelayerUpdaterFacet");
    this.providerUpdaterFacet = await this.deployByName("ProviderUpdaterFacet");
    this.diamondLoupeFacet = await this.deployByName("DiamondLoupeFacet");
    this.feeManagerFacet = await this.deployByName("FeeManagerFacet");
    this.routerFacet = await this.deployByName("RouterFacet");

    await this.setFacets([
      this.routerFacet,
      this.relayerUpdaterFacet,
      this.diamondLoupeFacet,
      this.providerUpdaterFacet,
      this.feeManagerFacet,
    ]);

    await this.updateRelayer();
  }

  /**
   * Add the given facets to the diamond
   * @param facets
   * @returns {Promise<void>}
   */
  async setFacets(facets) {
    const cuts = [];
    for (const facet of facets) {
      cuts.push({
        facetAddress: facet.address,
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(facet),
      });
    }

    const diamondCutter = await this.ethers.getContractAt(
      "IDiamondCutter",
      this.diamond.address
    );
    await (
      await diamondCutter
        .connect(this.deployer)
        .diamondCut(cuts, this.ethers.constants.AddressZero, "0x")
    ).wait();
  }

  /**
   * Update the relayer address on the diamond
   * @returns {Promise<void>}
   */
  async updateRelayer() {
    const relayerUpdater = await this.interactWith("RelayerUpdaterFacet");
    await (
      await relayerUpdater
        .connect(this.deployer)
        .updateRelayer(this.relayer.address)
    ).wait();
  }

  /**
   * Get an instance of a deployed contract
   * @param contractName
   * @returns {Promise<Contract>}
   */
  async interactWith(contractName) {
    return await this.ethers.getContractAt(contractName, this.diamond.address);
  }

  /**
   * Deploy a specific contract by name
   * @param contractName
   * @param args
   * @returns {Promise<*>}
   */
  async deployByName(contractName, args = []) {
    const Factory = await this.ethers.getContractFactory(contractName);
    const contract = await Factory.connect(this.deployer).deploy(...args);
    await contract.deployed();
    return contract;
  }

  /** Accessors **/

  getDiamond() {
    return this.diamond;
  }

  getFacets() {
    return {
      diamondCutterFacet: this.diamondCutterFacet,
      diamondLoupeFacet: this.diamondLoupeFacet,
      routerFacet: this.routerFacet,
      relayerUpdaterFacet: this.relayerUpdaterFacet,
      providerUpdaterFacet: this.providerUpdaterFacet,
      feeManagerFacet: this.feeManagerFacet,
    };
  }
};

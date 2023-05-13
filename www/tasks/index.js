const { task } = require("hardhat/config");

task("deploy-all", "Deploy all contracts on current network")
  .addParam("chain", "Name of the network to deploy")
  .setAction(require("./deploy-all"));

task("deploy-facet", "Deploy and wire a facet")
  .addParam("chain", "Name of the target network")
  .addParam("facet", "Name of the facet contract to deploy")
  .setAction(require("./deploy-facet"));

task("deploy-bridge", "Deploy and wire a bridge implementation")
  .addParam("chain", "Name of the target network")
  .addParam("bridge", "Name of the bridge")
  .setAction(require("./deploy-bridge"));

task("deploy-dex", "Deploy and wire a DEX implementation")
  .addParam("chain", "Name of the target network")
  .addParam("dex", "Name of the DEX")
  .setAction(require("./deploy-dex"));

task("loupe", "Loupe into the diamond")
  .addParam("chain", "Name of the target network")
  .addParam("store", "Store to look at")
  .setAction(require("./loupe"));

task("verify-diamond", "Verifies the diamond contract")
  .addParam("chain", "Name of the target network")
  .setAction(require("./verify-diamond"));

task("get-tokens", "Get tokens on the forked network")
  .addParam("chain", "Name of the network to deploy")
  .addParam("token", "Name of the token you want to get")
  .setAction(require("./get-tokens"));

task("retrieve", "Get tokens on the forked network")
  .addParam("chain", "Name of the network to deploy")
  .addParam("token", "Name of the token you want to get")
  .addParam("amount", "Amount to retrieve")
  .setAction(require("./retrieve"));

task("update-relayer", "Update the relayer's address")
  .addParam("chain", "Name of the network to update")
  .setAction(require("./update-relayer"));

task("update-queue", "Update JobQueue files on wrap")
  .setAction(require("./update-queue"));

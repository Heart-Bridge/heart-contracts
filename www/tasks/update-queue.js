const fs = require("fs");
const path = require("path");
module.exports = async function (taskArguments, hre, runSuper) {
  // update compiled data
  const raw = fs.readFileSync(
    path.join(
      __dirname,
      "/../artifacts/contracts/v0.2/JobsQueue.sol/JobsQueue.json"
    ),
    "utf-8"
  );
  const data = JSON.parse(raw);

  const abi = JSON.stringify(data.abi);
  const bytecode = data.bytecode;

  fs.writeFileSync(
    path.join(
      __dirname,
      "/../../../wrappers/standalone/src/__tests__/contracts/JobsQueue.ts"
    ),
    `export const abi = '${abi}';\nexport const bytecode = '${bytecode}';`
  );
};

const fs = require("fs");
const YAML = require("yaml");

const getTokens = (network) => {
  const file = fs.readFileSync("./tasks/helpers/tokens.yaml", "utf8");
  const tokens = YAML.parse(file);
  return tokens[network];
};

module.exports = {
  getTokens,
};

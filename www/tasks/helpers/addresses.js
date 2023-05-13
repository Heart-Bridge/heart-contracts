const fs = require("fs");
const YAML = require("yaml");

const getAddresses = () => {
  const file = fs.readFileSync("./contracts.yaml", "utf8");
  return YAML.parse(file);
};

const saveAddresses = (addresses) => {
  fs.writeFileSync("./contracts.yaml", YAML.stringify(addresses), "utf8");
};

module.exports = {
  getAddresses,
  saveAddresses,
};

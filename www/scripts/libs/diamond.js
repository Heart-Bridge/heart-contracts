const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };
const getSelectors = (contract) => {
  const signatures = Object.keys(contract.interface.functions);
  return signatures.reduce((acc, val) => {
    if (val !== "init(bytes)") {
      acc.push(contract.interface.getSighash(val));
    }
    return acc;
  }, []);
};

module.exports = {
  getSelectors,
  FacetCutAction,
};

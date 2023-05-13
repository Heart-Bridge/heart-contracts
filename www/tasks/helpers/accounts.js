module.exports = async function getAccounts(hre) {
  const [d1, relayer, d2, deployer, d3, user] = await hre.ethers.getSigners();

  return {
    deployer: d3,
    relayer: relayer,
    user: user,
  };
};

usePlugin('buidler-deploy');
usePlugin("@nomiclabs/buidler-waffle");

// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.getAddress());
  }
});

// You have to export an object to set up your config
// This object can have the following optional entries:
// defaultNetwork, networks, solc, and paths.
// Go to https://buidler.dev/config/ to learn more
module.exports = {
  // This is a sample solc configuration that specifies which version of solc to use
  solc: {
    version: "0.6.6",
    optimizer: {
      enabled: true,
      runs: 200
    },
  },
  networks: {
    rinkeby: {
      url: "https://rinkeby.infura.io/v3/1d0c278301fc40f3a8f40f25ae3bd328",
      accounts: process.env.RINKEBY_PRIVATE_KEY ? [process.env.RINKEBY_PRIVATE_KEY] : [],
    },
      mainnet: {
      url: "https://mainnet.infura.io/v3/1d0c278301fc40f3a8f40f25ae3bd328",
      accounts: process.env.MAINNET_PRIVATE_KEY ? [process.env.MAINNET_PRIVATE_KEY] : [],
    },
  },
  namedAccounts: {
    deployer: {
        default: 0, // here this will by default take the first account as deployer
        //4: '0xffffeffffff', // but for rinkeby it will be a specific address
    },
  },
};

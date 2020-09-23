const buidler = require("@nomiclabs/buidler");
const fs = require('fs');

const {deployIfDifferent, log} = deployments;

module.exports = async ({getNamedAccounts, deployments}) => {
    const namedAccounts = await getNamedAccounts();
    const {deploy} = deployments;
    const {deployer} = namedAccounts;
    log(`Deploying EthereumToFuse...`);
    const deployResult = await deploy('EthereumToFuse', {from: deployer, args: [process.env.OWNER_ADDRESS, 100000]});
    if (deployResult.newlyDeployed) {
        log(`contract EthereumToFuse deployed at ${deployResult.address} in block ${deployResult.receipt.blockNumber} using ${deployResult.receipt.gasUsed} gas`);
    }
}
module.exports.tags = ['EthereumToFuse'];

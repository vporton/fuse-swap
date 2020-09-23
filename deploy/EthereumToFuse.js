const buidler = require("@nomiclabs/buidler");
const fs = require('fs');

const {deployIfDifferent, log} = deployments;

module.exports = async ({getNamedAccounts, deployments}) => {
    const namedAccounts = await getNamedAccounts();
    const {deploy} = deployments;
    const {deployer} = namedAccounts;
    log(`Deploying EthereumToFuseSwap...`);
    const deployResult = await deploy('EthereumToFuseSwap', {from: deployer, args: [process.env.OWNER_ADDRESS, 100000]});
    if (deployResult.newlyDeployed) {
        log(`contract EthereumToFuseSwap deployed at ${deployResult.address} in block ${deployResult.receipt.blockNumber} using ${deployResult.receipt.gasUsed} gas`);
    }
}
module.exports.tags = ['EthereumToFuseSwap'];

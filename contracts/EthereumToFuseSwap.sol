//SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity =0.6.6;

import './BaseFuseSwap.sol';

contract EthereumToFuseSwap is BaseFuseSwap {
    constructor(address payable _owner, uint256 _initialBalance) public BaseFuseSwap(_owner, _initialBalance) { }

    function Bridge() internal override returns (address payable) {
        return EthereumBridge;
    }
}
//SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity =0.6.6;

import './BaseFuseExchange.sol';

contract EthereumToFuseExchange is BaseFuseExchange {
    constructor(address payable _owner) public BaseFuseExchange(_owner) { }

    function Bridge() internal override returns (address payable) {
        return EthereumBridge;
    }
}
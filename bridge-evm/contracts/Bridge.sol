// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./upgradeable/BridgeUpgradeable.sol";

contract Bridge is BridgeUpgradeable {
    function initialize(
        address authority_,
        address SAMB_,
        IValidation validator_,
        address payable feeReceiver_,
        uint256 nativeSendAmount_
    ) public initializer {
        __Bridge_init(
            authority_,
            SAMB_,
            validator_,
            feeReceiver_,
            nativeSendAmount_
        );
    }
}
